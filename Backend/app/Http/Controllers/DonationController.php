<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Donation;
use App\Models\DonationRequest;
use Illuminate\Support\Facades\Auth;
use Stripe\Stripe;
use Illuminate\Support\Facades\DB;   // ✅ ADD THIS
use Carbon\Carbon;      
use Stripe\Checkout\Session as StripeSession;
use Barryvdh\DomPDF\Facade\Pdf;

class DonationController extends Controller
{
    /**
     * Create a donation and redirect to Stripe checkout
     */
   public function createDonation(Request $request)
{
    $request->validate([
        'request_id' => 'required|integer',
        'amount' => 'required|numeric|min:1',
        'message' => 'nullable|string',
        'recurring' => 'nullable|string',
        'anonymous' => 'boolean',
    ]);

    $user = Auth::user();
    if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

    $donorId = $user->donor_id ?? $user->id ?? null;
    $donorName = $user->full_name ?? $user->school_name ?? 'Anonymous';

    // ✅ find school_id of this request
    $req = DonationRequest::where('request_id', (int)$request->request_id)->first();
    if (!$req) return response()->json(['message' => 'Request not found'], 404);

    $donation = Donation::create([
        'request_id' => (int)$request->request_id,
        'school_id'  => (int)$req->school_id,      // ✅ IMPORTANT
        'donation_type' => 'campaign',
        'donor_id' => $donorId,
        'amount' => (float)$request->amount,
        'message' => $request->message ?? null,
        'recurring' => $request->recurring ?? 'none',
        'anonymous' => $request->anonymous ?? 0,
        'donor_name' => $donorName,
        'donor_email' => $user->email,
        'status' => 'pending',
    ]);

    Stripe::setApiKey(env('STRIPE_SECRET'));

    $session = StripeSession::create([
        'payment_method_types' => ['card'],
        'customer_email' => $user->email,
        'line_items' => [[
            'price_data' => [
                'currency' => 'lkr',
                'product_data' => ['name' => 'Donation to Request #' . $donation->request_id],
                'unit_amount' => (int) round($donation->amount * 100),
            ],
            'quantity' => 1,
        ]],
        'mode' => 'payment',
        'success_url' => env('FRONTEND_URL') . '/projects?donation=success&session_id={CHECKOUT_SESSION_ID}',
        'cancel_url'  => env('FRONTEND_URL') . '/projects?donation=cancel',
        'metadata' => ['donation_id' => $donation->donation_id],
    ]);

    $donation->update(['stripe_session_id' => $session->id]);

    return response()->json(['checkout_url' => $session->url]);
}
    /**
     * Verify Stripe session and update donation & donation request
     */
public function verifySession(Request $request)
{
    $sessionId = $request->query('session_id');

    if (!$sessionId) {
        return response()->json(['status' => 'no_session'], 400);
    }

    try {
        Stripe::setApiKey(env('STRIPE_SECRET'));
        $session = StripeSession::retrieve($sessionId);

        if (($session->payment_status ?? null) !== 'paid') {
            return response()->json(['status' => 'pending']);
        }

        return DB::transaction(function () use ($sessionId) {

            $donation = Donation::where('stripe_session_id', $sessionId)
                ->lockForUpdate()
                ->first();

            if (!$donation) {
                return response()->json(['status' => 'donation_not_found'], 404);
            }

            if (strtolower((string)$donation->status) === 'paid') {
                return response()->json(['status' => 'already_paid']);
            }

            // ✅ mark paid
            $donation->update([
                'status'  => 'paid',
                'paid_at' => now(),
            ]);

            // ✅ ensure we have school_id
            $schoolId = $donation->school_id;

            // If campaign donation but school_id was not saved (old rows), derive from request
            if (!$schoolId && !empty($donation->request_id)) {
                $schoolId = (int) DB::table('donation_requests')
                    ->where('request_id', (int)$donation->request_id)
                    ->value('school_id');

                if ($schoolId) {
                    $donation->update(['school_id' => $schoolId]); // optional backfill
                }
            }

            if (!$schoolId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'school_id missing (cannot credit fund)'
                ], 500);
            }

            // ✅ 1) if has request -> update request raised
            if (!empty($donation->request_id)) {
                DonationRequest::where('request_id', (int)$donation->request_id)
                    ->increment('amount_raised', (float)$donation->amount);
            }

            // ✅ 2) ALWAYS credit school fund_balance (campaign + school_fund)
            DB::table('schools')
                ->where('school_id', (int)$schoolId)
                ->increment('fund_balance', (float)$donation->amount);

            return response()->json([
                'status' => 'success',
                'school_id' => (int)$schoolId,
                'request_id' => $donation->request_id,
            ]);
        });

    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage()
        ], 500);
    }
}
public function recentDonors()
{
    $donors = \App\Models\Donation::where('status', 'paid')
        ->orderBy('created_at', 'desc')
        ->take(10)
        ->get([
            'donor_name as name',
            'amount',
            'created_at'
        ]);

    $donors->transform(function ($donor) {
        $donor->time = $donor->created_at
            ? $donor->created_at->diffForHumans()
            : null;

        $donor->initials = collect(explode(' ', $donor->name))
            ->map(fn ($n) => strtoupper(substr($n, 0, 1)))
            ->join('');

        unset($donor->created_at); // optional cleanup

        return $donor;
    });

    return response()->json($donors);
}

public function donationTrends()
{
    $start = \Carbon\Carbon::now()->subMonths(11)->startOfMonth();
    $end   = \Carbon\Carbon::now()->endOfMonth();

    // Get sums by YYYY-MM (so year is included)
    $rows = \App\Models\Donation::where('status', 'paid')
        ->whereBetween('created_at', [$start, $end])
        ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as ym, SUM(amount) as total")
        ->groupBy('ym')
        ->orderBy('ym')
        ->get();

    // Map results for fast lookup
    $map = $rows->pluck('total', 'ym');

    // Fill missing months with 0
    $result = [];
    $cursor = $start->copy();
    while ($cursor <= $end) {
        $ym = $cursor->format('Y-m');
        $result[] = [
            'month' => $cursor->format('M'),     // Jan, Feb...
            'ym' => $ym,                         // 2026-01 (optional but useful)
            'donations' => (int) ($map[$ym] ?? 0),
        ];
        $cursor->addMonth();
    }

    return response()->json($result);
}
public function schoolsDonationMap()
{
    $schools = DB::table('schools')
        ->select(
            'school_id',
            'school_name',
            'district',
            'province',
            'latitude',
            'longitude',
            DB::raw('COALESCE(fund_balance, 0) as total_received'),
            'need_score'
        )
        ->get();

    return response()->json($schools);
}
public function donorsWithActiveDonations()
{
    $donors = DB::table('donations')
        ->join('donors', 'donations.donor_id', '=', 'donors.donor_id')
        ->whereRaw("LOWER(donations.status)='paid'")
        ->select(
            'donors.donor_id',
            'donors.full_name as donor_name',
            'donors.email as donor_email',
            DB::raw('COUNT(donations.donation_id) as active_donations_count'),
            DB::raw('COALESCE(SUM(donations.amount), 0) as total_donated'),
            DB::raw('MIN(donations.created_at) as joined_at')
        )
        ->groupBy('donors.donor_id', 'donors.full_name', 'donors.email')
        ->orderBy('joined_at', 'desc')
        ->get();

    $donors->transform(function ($donor) {
        $names = preg_split('/\s+/', trim($donor->donor_name ?? 'Anonymous'));
        $donor->initials = strtoupper(substr($names[0] ?? 'A', 0, 1) . substr($names[1] ?? '', 0, 1));
        $donor->created_at = $donor->joined_at;
        return $donor;
    });

    return response()->json($donors);
}

public function allDonorsWithStats()
{
    $donors = DB::table('donors')
        ->leftJoin('donations', function($join) {
            $join->on('donors.donor_id', '=', 'donations.donor_id')
                 ->whereRaw("LOWER(donations.status)='paid'");
        })
        ->select(
            'donors.donor_id',
            'donors.full_name',
            'donors.email',
            'donors.phone',
            DB::raw('COUNT(donations.donation_id) as active_donations_count'),
            DB::raw('COALESCE(SUM(donations.amount), 0) as total_donated'),
            'donors.created_at'
        )
        ->groupBy(
            'donors.donor_id',
            'donors.full_name',
            'donors.email',
            'donors.phone',
            'donors.created_at'
        )
        ->orderBy('donors.created_at', 'desc')
        ->get();

    $donors->transform(function ($donor) {
        $names = preg_split('/\s+/', trim($donor->full_name));
        $donor->initials = strtoupper(substr($names[0] ?? 'A', 0, 1) . substr($names[1] ?? '', 0, 1));
        $donor->active_donations_count = (int) $donor->active_donations_count;
        $donor->total_donated = (float) $donor->total_donated;
        return $donor;
    });

    return response()->json($donors);
}

public function donationsByRequest($requestId)
{
    $rows = \App\Models\Donation::where('request_id', $requestId)
        ->where('status', 'paid') // only paid donations
        ->orderBy('created_at', 'desc')
        ->get([
            'donation_id',
            'donor_name',
            'donor_email',
            'amount',
            'status',
            'created_at'
        ]);

    return response()->json([
        'donations' => $rows
    ]);
}

public function listDonations(Request $request)
{
    $status  = strtolower($request->query('status', 'all')); // paid | pending | all
    $search  = trim($request->query('search', ''));
    $page    = max(1, (int) $request->query('page', 1));
    $limit   = max(1, min(50, (int) $request->query('limit', 10)));

    // optional filters
    $dateFrom = $request->query('dateFrom', null);
    $dateTo   = $request->query('dateTo', null);

    // sorting
    $sortBy  = $request->query('sortBy', 'created_at'); // created_at | amount | status
    $sortDir = strtolower($request->query('sortDir', 'desc')) === 'asc' ? 'asc' : 'desc';
    $allowedSort = ['created_at', 'amount', 'status'];
    if (!in_array($sortBy, $allowedSort)) $sortBy = 'created_at';

    $q = DB::table('donations')
        ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
        ->leftJoin('schools', function ($join) {
            // ✅ campaign donations: schools from donation_requests
            $join->on('schools.school_id', '=', 'donation_requests.school_id')
                 // ✅ direct fund: schools from donations.school_id
                 ->orOn('schools.school_id', '=', 'donations.school_id');
        })
        ->select(
            'donations.donation_id',
            'donations.request_id',
            'donations.school_id', // keep donation school_id too
            'donations.donor_id',
            'donations.donor_name',
            'donations.donor_email',
            'donations.amount',
            'donations.status',
            'donations.created_at',

            // request info (nullable)
            'donation_requests.request_title',

            // ✅ unified school_id for frontend
            DB::raw('COALESCE(donation_requests.school_id, donations.school_id) as school_id'),

            // ✅ school info works for campaign + direct fund
            'schools.school_name',
            'schools.district',
            'schools.province'
        );

    // status filter (case-insensitive)
    if ($status !== 'all') {
        $q->whereRaw('LOWER(donations.status) = ?', [$status]);
    }

    // date filters
    if ($dateFrom) {
        $q->where('donations.created_at', '>=', Carbon::parse($dateFrom)->startOfDay());
    }
    if ($dateTo) {
        $q->where('donations.created_at', '<=', Carbon::parse($dateTo)->endOfDay());
    }

    // search
    if ($search !== '') {
        $q->where(function ($qq) use ($search) {
            $qq->where('donations.donor_name', 'like', "%{$search}%")
               ->orWhere('donations.donor_email', 'like', "%{$search}%")
               ->orWhere('donation_requests.request_title', 'like', "%{$search}%")
               ->orWhere('schools.school_name', 'like', "%{$search}%")
               ->orWhere('schools.province', 'like', "%{$search}%")
               ->orWhere('schools.district', 'like', "%{$search}%");
        });
    }

    $total = (clone $q)->count();

    $q->orderBy("donations.$sortBy", $sortDir);

    $rows = $q->skip(($page - 1) * $limit)
        ->take($limit)
        ->get();

    $rows->transform(function ($r) {
        $name = $r->donor_name ?: 'Anonymous';
        $parts = preg_split('/\s+/', trim($name));

        $r->initials = strtoupper(substr($parts[0] ?? 'A', 0, 1) . substr($parts[1] ?? '', 0, 1));
        $r->time = $r->created_at ? Carbon::parse($r->created_at)->diffForHumans() : null;
        $r->status = strtolower($r->status ?? 'pending');
        $r->amount = (float) ($r->amount ?? 0);

        // ✅ label donation type in response (optional)
        $r->donation_type = $r->request_id ? 'campaign' : 'school_fund';

        return $r;
    });

    return response()->json([
        'donations' => $rows,
        'total' => $total,
        'page' => $page,
        'limit' => $limit,
    ]);
}







// methaninin plallehata

public function reportsSummary(Request $request)
{
    $dateFrom = $request->query('dateFrom');
    $dateTo   = $request->query('dateTo');

    $from = $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : Carbon::now()->subDays(30)->startOfDay();
    $to   = $dateTo   ? Carbon::parse($dateTo)->endOfDay()     : Carbon::now()->endOfDay();

    // Base query: donations + request + school
    $base = DB::table('donations')
        ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
        ->leftJoin('schools', 'donation_requests.school_id', '=', 'schools.school_id')
        ->whereBetween('donations.created_at', [$from, $to]);

    // KPIs
    $totalDonations = (clone $base)->count();
    $paidCount = (clone $base)->whereRaw("LOWER(donations.status)='paid'")->count();
    $pendingCount = (clone $base)->whereRaw("LOWER(donations.status)='pending'")->count();

    $paidAmount = (clone $base)->whereRaw("LOWER(donations.status)='paid'")
        ->sum('donations.amount');

    $avgPaid = $paidCount > 0 ? ($paidAmount / $paidCount) : 0;

    $uniqueDonors = (clone $base)->whereRaw("LOWER(donations.status)='paid'")
        ->distinct('donations.donor_email')
        ->count('donations.donor_email');

    // Status breakdown
    $statusBreakdown = (clone $base)
        ->selectRaw("LOWER(donations.status) as status, COUNT(*) as count")
        ->groupBy('status')
        ->orderBy('count', 'desc')
        ->get();

    return response()->json([
        'range' => [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
        ],
        'kpis' => [
            'total_donations' => (int)$totalDonations,
            'paid_count' => (int)$paidCount,
            'pending_count' => (int)$pendingCount,
            'paid_amount' => (float)$paidAmount,
            'avg_paid' => (float)$avgPaid,
            'unique_donors' => (int)$uniqueDonors,
        ],
        'status_breakdown' => $statusBreakdown,
    ]);
}

public function reportsTrends(Request $request)
{
    $dateFrom = $request->query('dateFrom');
    $dateTo   = $request->query('dateTo');

    $from = $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : Carbon::now()->subDays(30)->startOfDay();
    $to   = $dateTo   ? Carbon::parse($dateTo)->endOfDay()     : Carbon::now()->endOfDay();

    // Daily trend (paid only) for the date range
    $rows = DB::table('donations')
        ->whereBetween('created_at', [$from, $to])
        ->whereRaw("LOWER(status)='paid'")
        ->selectRaw("DATE(created_at) as day, SUM(amount) as total, COUNT(*) as count")
        ->groupBy('day')
        ->orderBy('day')
        ->get();

    // Fill missing days with 0
    $mapTotal = $rows->pluck('total', 'day');
    $mapCount = $rows->pluck('count', 'day');

    $result = [];
    $cursor = $from->copy()->startOfDay();
    while ($cursor <= $to) {
        $d = $cursor->toDateString();
        $result[] = [
            'day' => $d,
            'amount' => (float)($mapTotal[$d] ?? 0),
            'count' => (int)($mapCount[$d] ?? 0),
        ];
        $cursor->addDay();
    }

    return response()->json($result);
}

public function reportsTopProvinces(Request $request)
{
    $dateFrom = $request->query('dateFrom');
    $dateTo   = $request->query('dateTo');

    $from = $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : Carbon::now()->subDays(30)->startOfDay();
    $to   = $dateTo   ? Carbon::parse($dateTo)->endOfDay()     : Carbon::now()->endOfDay();

    $rows = DB::table('donations')
        ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
        ->leftJoin('schools', 'donation_requests.school_id', '=', 'schools.school_id')
        ->whereBetween('donations.created_at', [$from, $to])
        ->whereRaw("LOWER(donations.status)='paid'")
        ->selectRaw("COALESCE(schools.province,'Unknown') as province, SUM(donations.amount) as total")
        ->groupBy('province')
        ->orderByDesc('total')
        ->limit(8)
        ->get();

    return response()->json($rows);
}

public function reportsTopCampaigns(Request $request)
{
    $dateFrom = $request->query('dateFrom');
    $dateTo   = $request->query('dateTo');

    $from = $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : Carbon::now()->subDays(30)->startOfDay();
    $to   = $dateTo   ? Carbon::parse($dateTo)->endOfDay()     : Carbon::now()->endOfDay();

    $rows = DB::table('donations')
        ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
        ->whereBetween('donations.created_at', [$from, $to])
        ->whereRaw("LOWER(donations.status)='paid'")
        ->selectRaw("donation_requests.request_id, donation_requests.request_title, SUM(donations.amount) as total, COUNT(*) as count")
        ->groupBy('donation_requests.request_id', 'donation_requests.request_title')
        ->orderByDesc('total')
        ->limit(8)
        ->get();

    return response()->json($rows);
}


// ✅ School Donations (ONLY their school) - paginated + search + status + date filter + sorting
public function schoolDonations(Request $request)
{
    $user = Auth::guard('school')->user();
    $schoolId = $user?->school_id;

    if (!$schoolId) {
        return response()->json(['message' => 'School not authenticated'], 401);
    }

    $status = strtolower($request->query('status', 'all')); // paid | pending | all
    $search = trim($request->query('search', ''));

    $page   = max(1, (int) $request->query('page', 1));
    $limit  = max(1, min(50, (int) $request->query('limit', 10)));

    // optional date range
    $dateFrom = $request->query('dateFrom', null);
    $dateTo   = $request->query('dateTo', null);

    $from = $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : null;
    $to   = $dateTo   ? Carbon::parse($dateTo)->endOfDay()     : null;

    // optional sorting
    $sortBy  = $request->query('sortBy', 'created_at'); // created_at | amount | status
    $sortDir = strtolower($request->query('sortDir', 'desc')) === 'asc' ? 'asc' : 'desc';

    $allowedSort = ['created_at', 'amount', 'status'];
    if (!in_array($sortBy, $allowedSort)) $sortBy = 'created_at';

    $q = DB::table('donations')
        ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
        ->leftJoin('schools', 'donation_requests.school_id', '=', 'schools.school_id')
        ->where('donation_requests.school_id', $schoolId)
        ->select(
            'donations.donation_id',
            'donations.request_id',
            'donations.donor_id',
            'donations.donor_name',
            'donations.donor_email',
            'donations.amount',
            'donations.status',
            'donations.created_at',
            'donation_requests.request_title',
            'schools.school_name',
            'schools.district',
            'schools.province'
        );

    // ✅ status filter (case-insensitive)
    if ($status !== 'all') {
        $q->whereRaw('LOWER(donations.status) = ?', [$status]);
    }

    // ✅ date filters
    if ($from && $to) {
        $q->whereBetween('donations.created_at', [$from, $to]);
    } elseif ($from) {
        $q->where('donations.created_at', '>=', $from);
    } elseif ($to) {
        $q->where('donations.created_at', '<=', $to);
    }

    // ✅ search
    if ($search !== '') {
        $q->where(function ($qq) use ($search) {
            $qq->where('donations.donor_name', 'like', "%{$search}%")
               ->orWhere('donations.donor_email', 'like', "%{$search}%")
               ->orWhere('donation_requests.request_title', 'like', "%{$search}%");
        });
    }

    $total = (clone $q)->count();

    // ✅ sorting
    $q->orderBy("donations.$sortBy", $sortDir);

    $rows = $q->skip(($page - 1) * $limit)
        ->take($limit)
        ->get();

    // ✅ normalize status + initials + time
    $rows->transform(function ($r) {
        $name = $r->donor_name ?: 'Anonymous';
        $parts = preg_split('/\s+/', trim($name));

        $r->initials = strtoupper(substr($parts[0] ?? 'A', 0, 1) . substr($parts[1] ?? '', 0, 1));
        $r->time = $r->created_at ? Carbon::parse($r->created_at)->diffForHumans() : null;

        // always lowercase status for frontend
        $r->status = strtolower($r->status ?? 'pending');

        $r->amount = (float) ($r->amount ?? 0);

        return $r;
    });

    return response()->json([
        'donations' => $rows,
        'total' => $total,
        'page' => $page,
        'limit' => $limit,
    ]);
}


// ✅ Top Donors (ALL donations of that school - NOT paginated)
public function schoolTopDonors(Request $request)
{
    $user = Auth::guard('school')->user();
    $schoolId = $user?->school_id;

    if (!$schoolId) {
        return response()->json(['message' => 'School not authenticated'], 401);
    }

    $limit = max(1, min(20, (int) $request->query('limit', 8)));

    $dateFrom = $request->query('dateFrom');
    $dateTo   = $request->query('dateTo');

    $from = $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : null;
    $to   = $dateTo   ? Carbon::parse($dateTo)->endOfDay()     : null;

    $q = DB::table('donations')
        ->join('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
        ->where('donation_requests.school_id', $schoolId)
        ->whereRaw("LOWER(donations.status)='paid'");

    if ($from && $to) {
        $q->whereBetween('donations.created_at', [$from, $to]);
    } elseif ($from) {
        $q->where('donations.created_at', '>=', $from);
    } elseif ($to) {
        $q->where('donations.created_at', '<=', $to);
    }

    $rows = $q->selectRaw("
            COALESCE(NULLIF(TRIM(donations.donor_name),''), 'Anonymous') as donor_name,
            donations.donor_email as donor_email,
            COUNT(*) as donations_count,
            COALESCE(SUM(donations.amount), 0) as total_donated,
            MAX(donations.created_at) as last_donated_at
        ")
        ->groupBy('donor_email', 'donor_name')
        ->orderByDesc('total_donated')
        ->limit($limit)
        ->get();

    $rows->transform(function ($r) {
        $name = $r->donor_name ?: 'Anonymous';
        $parts = preg_split('/\s+/', trim($name));
        $r->initials = strtoupper(substr($parts[0] ?? 'A', 0, 1) . substr($parts[1] ?? '', 0, 1));
        $r->last_time = $r->last_donated_at ? Carbon::parse($r->last_donated_at)->diffForHumans() : null;
        $r->total_donated = (float) $r->total_donated;
        $r->donations_count = (int) $r->donations_count;
        return $r;
    });

    return response()->json([
        'top_donors' => $rows
    ]);
}



public function donorOverview(Request $request)
{
    $user = Auth::user();
    if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

    $donorId = $user->donor_id ?? $user->id ?? null;
    if (!$donorId) return response()->json(['message' => 'Donor not found'], 404);

    // KPI summary (paid only)
    $base = DB::table('donations')
        ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
        ->leftJoin('schools', 'donation_requests.school_id', '=', 'schools.school_id')
        ->where('donations.donor_id', $donorId)
        ->whereRaw("LOWER(donations.status)='paid'");

    $totalDonated = (clone $base)->sum('donations.amount');
    $donationsCount = (clone $base)->count();
    $schoolsSupported = (clone $base)->distinct('schools.school_id')->count('schools.school_id');
    $lastDonationAt = (clone $base)->max('donations.created_at');

    // Trend last 30 days
    $from = Carbon::now()->subDays(29)->startOfDay();
    $to   = Carbon::now()->endOfDay();

    $rows = DB::table('donations')
        ->where('donor_id', $donorId)
        ->whereBetween('created_at', [$from, $to])
        ->whereRaw("LOWER(status)='paid'")
        ->selectRaw("DATE(created_at) as day, SUM(amount) as total")
        ->groupBy('day')
        ->orderBy('day')
        ->get();

    $map = $rows->pluck('total', 'day');

    $trend = [];
    $cursor = $from->copy();
    while ($cursor <= $to) {
        $d = $cursor->toDateString();
        $trend[] = [
            'day' => $d,
            'total' => (float) ($map[$d] ?? 0),
        ];
        $cursor->addDay();
    }

 // Recent donations (PAID) - ✅ includes direct school fund too
$recent = DB::table('donations')
    ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
    ->leftJoin('schools', function ($join) {
        $join->on('schools.school_id', '=', 'donation_requests.school_id')
             ->orOn('schools.school_id', '=', 'donations.school_id'); // ✅ fallback for direct fund
    })
    ->where('donations.donor_id', $donorId)
    ->whereRaw("LOWER(donations.status)='paid'")
    ->orderByDesc('donations.created_at')
    ->limit(8)
    ->get([
        'donations.donation_id',
        'donations.amount',
        'donations.created_at',
        'donations.request_id',
        'donation_requests.request_title',
        'schools.school_id',
        'schools.school_name',
        'schools.province',
        'schools.district',
    ]);

$recent->transform(function ($d) {
    $d->time = $d->created_at ? Carbon::parse($d->created_at)->diffForHumans() : null;
    return $d;
});


// Top schools supported (PAID) - ✅ includes direct school fund too
$topSchools = DB::table('donations')
    ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
    ->leftJoin('schools', function ($join) {
        $join->on('schools.school_id', '=', 'donation_requests.school_id')
             ->orOn('schools.school_id', '=', 'donations.school_id'); // ✅ fallback
    })
    ->where('donations.donor_id', $donorId)
    ->whereRaw("LOWER(donations.status)='paid'")
    ->selectRaw("
        schools.school_id,
        schools.school_name,
        schools.province,
        schools.district,
        COALESCE(SUM(donations.amount),0) as total,
        COUNT(donations.donation_id) as count
    ")
    ->whereNotNull('schools.school_id')
    ->groupBy('schools.school_id','schools.school_name','schools.province','schools.district')
    ->orderByDesc('total')
    ->limit(5)
    ->get();

    return response()->json([
        'donor' => [
            'donor_id' => $donorId,
            'name' => $user->full_name ?? $user->name ?? 'Donor',
            'email' => $user->email ?? null,
        ],
        'kpis' => [
            'total_donated' => (float) $totalDonated,
            'donations_count' => (int) $donationsCount,
            'schools_supported' => (int) $schoolsSupported,
            'last_donation_at' => $lastDonationAt,
        ],
        'trend_30d' => $trend,
        'recent_donations' => $recent,
        'top_schools' => $topSchools,
    ]);
}


public function myDonations(Request $request)
{
    $user = Auth::user();
    if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

    $donorId = $user->donor_id ?? $user->id ?? null;
    if (!$donorId) return response()->json(['message' => 'Donor not found'], 404);

    $status  = strtolower($request->query('status', 'paid')); // paid|pending|all
    $search  = trim($request->query('search', ''));
    $page    = max(1, (int)$request->query('page', 1));
    $limit   = max(1, min(50, (int)$request->query('limit', 10)));

    $dateFrom = $request->query('dateFrom', null);
    $dateTo   = $request->query('dateTo', null);

    $sortBy  = $request->query('sortBy', 'created_at'); // created_at|amount
    $sortDir = strtolower($request->query('sortDir', 'desc')) === 'asc' ? 'asc' : 'desc';
    $allowedSort = ['created_at', 'amount'];
    if (!in_array($sortBy, $allowedSort)) $sortBy = 'created_at';

    $q = DB::table('donations')
        ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
        ->leftJoin('schools', function ($join) {
            // ✅ school from request (campaign)
            $join->on('schools.school_id', '=', 'donation_requests.school_id')
                 // ✅ fallback school from donations.school_id (direct fund)
                 ->orOn('schools.school_id', '=', 'donations.school_id');
        })
        ->where('donations.donor_id', $donorId)
        ->select(
            'donations.donation_id',
            'donations.request_id',
            'donations.school_id',
            'donations.amount',
            'donations.status',
            'donations.created_at',

            // request info (may be null)
            'donation_requests.request_title',

            // ✅ school info (now works for direct fund too)
            'schools.school_name',
            'schools.district',
            'schools.province',

            // ✅ optional: for UI thumbnails (if you have these columns)
            DB::raw('schools.logo_url as school_logo_url'),
            DB::raw('donation_requests.image_url as request_image_url')
        );

    if ($status !== 'all') {
        $q->whereRaw('LOWER(donations.status) = ?', [$status]);
    }

    if ($dateFrom) $q->where('donations.created_at', '>=', Carbon::parse($dateFrom)->startOfDay());
    if ($dateTo)   $q->where('donations.created_at', '<=', Carbon::parse($dateTo)->endOfDay());

    if ($search !== '') {
        $q->where(function ($qq) use ($search) {
            $qq->where('donation_requests.request_title', 'like', "%{$search}%")
               ->orWhere('schools.school_name', 'like', "%{$search}%")
               ->orWhere('schools.province', 'like', "%{$search}%")
               ->orWhere('schools.district', 'like', "%{$search}%");
        });
    }

    $total = (clone $q)->count();

    $q->orderBy("donations.$sortBy", $sortDir);

    $rows = $q->skip(($page - 1) * $limit)->take($limit)->get();

    $rows->transform(function ($r) {
        $r->status = strtolower($r->status ?? 'pending');
        $r->amount = (float)($r->amount ?? 0);
        $r->time = $r->created_at ? Carbon::parse($r->created_at)->diffForHumans() : null;
        return $r;
    });

    return response()->json([
        'donations' => $rows,
        'total' => $total,
        'page' => $page,
        'limit' => $limit,
    ]);
}
public function receipt($id)
{
    $user = Auth::user();
    if (!$user) {
        return response()->json(['message' => 'Unauthenticated'], 401);
    }

    $donorId = $user->donor_id ?? $user->id ?? null;

    $donation = DB::table('donations')
        ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
        ->leftJoin('schools', 'donation_requests.school_id', '=', 'schools.school_id')
        ->where('donations.donation_id', $id)
        ->where('donations.donor_id', $donorId) // 🔒 important security
        ->select(
            'donations.donation_id',
            'donations.amount',
            'donations.status',
            'donations.created_at',
            'donation_requests.request_title',
            'donation_requests.request_id',
            'schools.school_name',
            'schools.district',
            'schools.province'
        )
        ->first();

    if (!$donation) {
        return response()->json(['message' => 'Receipt not found'], 404);
    }

    return response()->json([
        'receipt' => $donation
    ]);
}



   public function createSchoolDonation(Request $request, $schoolId)
{
    $request->validate([
        'amount' => 'required|numeric|min:1',
        'message' => 'nullable|string',
        'recurring' => 'nullable|string',
        'anonymous' => 'boolean',
    ]);

    $user = Auth::user();
    if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

    $school = DB::table('schools')->where('school_id', (int)$schoolId)->first();
    if (!$school) return response()->json(['message' => 'School not found'], 404);

    // ✅ pick best existing request ONLY (do not create)
    $best = DB::table('donation_requests')
        ->where('school_id', (int)$schoolId)
        ->where('status', 'Approved')
        ->whereColumn('amount_raised', '<', 'estimated_price')
        ->orderByRaw('(estimated_price - amount_raised) DESC')
        ->orderByDesc('created_at')
        ->first();

    $donorId = $user->donor_id ?? $user->id ?? null;
    $donorName = $user->full_name ?? $user->name ?? 'Anonymous';

   $donation = Donation::create([
    'request_id' => $best ? (int)$best->request_id : null,
    'school_id'  => (int)$schoolId,
    'donation_type' => $best ? 'campaign' : 'school_fund', // ✅ FIX
    'donor_id' => $donorId,
    'amount' => (float)$request->amount,
    'message' => $request->message ?? null,
    'recurring' => $request->recurring ?? 'none',
    'anonymous' => $request->anonymous ?? 0,
    'donor_name' => $donorName,
    'donor_email' => $user->email,
    'status' => 'pending',
]);

    Stripe::setApiKey(env('STRIPE_SECRET'));

    $desc = $best
        ? "Supports request: {$best->request_title}"
        : "Supports school fund (no active requests)";

    $session = StripeSession::create([
        'payment_method_types' => ['card'],
        'customer_email' => $user->email,
        'line_items' => [[
            'price_data' => [
                'currency' => 'lkr',
                'product_data' => [
                    'name' => "Donation to {$school->school_name}",
                    'description' => $desc,
                ],
                'unit_amount' => (int) round(((float)$donation->amount) * 100),
            ],
            'quantity' => 1,
        ]],
        'mode' => 'payment',
        'success_url' => env('FRONTEND_URL') . '/donor/schools?donation=success&session_id={CHECKOUT_SESSION_ID}',
        'cancel_url'  => env('FRONTEND_URL') . '/donor/schools?donation=cancel',
        'metadata' => [
            'donation_id' => (string)$donation->donation_id,
        ],
    ]);

    $donation->update(['stripe_session_id' => $session->id]);

    return response()->json([
        'checkout_url' => $session->url,
        'request_id_used' => $best ? (int)$best->request_id : null,
        'mode' => $best ? 'request' : 'school_fund',
    ]);
}






}
