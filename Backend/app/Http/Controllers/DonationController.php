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
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Determine donor ID and name
        $donorId = $user->donor_id ?? $user->id ?? null;
        $donorName = $user->full_name ?? $user->school_name ?? 'Anonymous';

        // Create donation in DB
        $donation = Donation::create([
            'request_id' => $request->request_id,
            'donor_id' => $donorId,
            'amount' => $request->amount,
            'message' => $request->message ?? null,
            'recurring' => $request->recurring ?? 'none',
            'anonymous' => $request->anonymous ?? 0,
            'donor_name' => $donorName,
            'donor_email' => $user->email,
            'status' => 'pending', // default pending until Stripe confirms
        ]);

        // Stripe checkout
        Stripe::setApiKey(env('STRIPE_SECRET'));
        $session = StripeSession::create([
            'payment_method_types' => ['card'],
            'customer_email' => $user->email,
            'line_items' => [[
                'price_data' => [
                    'currency' => 'usd',
                    'product_data' => ['name' => 'Donation to Request #' . $donation->request_id],
                    'unit_amount' => $donation->amount * 100,
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => env('FRONTEND_URL') . '/donation/success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => env('FRONTEND_URL') . '/donation/failed',
            'metadata' => ['donation_id' => $donation->donation_id],
        ]);

        // Save Stripe session ID
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

            // Find donation
            $donation = Donation::where('stripe_session_id', $sessionId)->first();
            if (!$donation) {
                return response()->json(['status' => 'donation_not_found'], 404);
            }

            // Only update if not already marked paid
            if ($session->payment_status === 'paid' && $donation->status !== 'paid') {
                $donation->update(['status' => 'paid']);

                // Update amount_raised in donation_requests
                $donationRequest = DonationRequest::find($donation->request_id);
                if ($donationRequest) {
                    $donationRequest->amount_raised = (float)$donationRequest->amount_raised + (float)$donation->amount;
                    $donationRequest->save();
                }

                return response()->json(['status' => 'success']);
            } elseif ($donation->status === 'paid') {
                return response()->json(['status' => 'already_paid']);
            } else {
                return response()->json(['status' => 'pending']);
            }

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
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
        ->leftJoin('donation_requests', 'schools.school_id', '=', 'donation_requests.school_id')
        ->leftJoin('donations', function($join) {
            $join->on('donation_requests.request_id', '=', 'donations.request_id')
                 ->where('donations.status', 'paid'); 
        })
        ->select(
            'schools.school_id',
            'schools.school_name',
            'schools.district',
            'schools.province',
            'schools.latitude',
            'schools.longitude',
            DB::raw('COALESCE(SUM(donations.amount), 0) as total_received'),
            'schools.need_score' 
        )
        ->groupBy(
            'schools.school_id',
            'schools.school_name',
            'schools.district',
            'schools.province',
            'schools.latitude',
            'schools.longitude',
            'schools.need_score' 
        )
        ->get();

    return response()->json($schools);
}

public function donorsWithActiveDonations()
{
    $donors = DB::table('donations')
        ->select(
            'donor_id',
            'donor_name',
            'donor_email',
            DB::raw('COUNT(*) as active_donations_count'),
            DB::raw('SUM(amount) as total_donated'), 
            DB::raw('MIN(created_at) as joined_at')  
        )
        ->where('status', 'paid')
        ->groupBy('donor_id', 'donor_name', 'donor_email')
        ->orderBy('joined_at', 'desc')
        ->get();

    
    $donors->transform(function ($donor) {
        $names = explode(' ', $donor->donor_name);
        $donor->initials = strtoupper(substr($names[0], 0, 1) . (isset($names[1]) ? substr($names[1], 0, 1) : ''));
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
                 ->where('donations.status', 'paid'); 
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
        $names = explode(' ', $donor->full_name);
        $donor->initials = strtoupper(
            substr($names[0], 0, 1) . (isset($names[1]) ? substr($names[1], 0, 1) : '')
        );
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

    // ✅ optional filters
    $dateFrom = $request->query('dateFrom', null);
    $dateTo   = $request->query('dateTo', null);

    // ✅ sorting
    $sortBy  = $request->query('sortBy', 'created_at'); // created_at | amount | status
    $sortDir = strtolower($request->query('sortDir', 'desc')) === 'asc' ? 'asc' : 'desc';
    $allowedSort = ['created_at', 'amount', 'status'];
    if (!in_array($sortBy, $allowedSort)) $sortBy = 'created_at';

    $q = DB::table('donations')
        ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
        ->leftJoin('schools', 'donation_requests.school_id', '=', 'schools.school_id')
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
            'donation_requests.school_id',
            'schools.school_name',
            'schools.district',
            'schools.province'
        );

    // ✅ status filter (case-insensitive)
    if ($status !== 'all') {
        $q->whereRaw('LOWER(donations.status) = ?', [$status]);
    }

    // ✅ date filters
    if ($dateFrom) {
        $q->where('donations.created_at', '>=', Carbon::parse($dateFrom)->startOfDay());
    }
    if ($dateTo) {
        $q->where('donations.created_at', '<=', Carbon::parse($dateTo)->endOfDay());
    }

    // ✅ search
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

    // ✅ total before pagination
    $total = (clone $q)->count();

    // ✅ sorting
    $q->orderBy("donations.$sortBy", $sortDir);

    // ✅ pagination
    $rows = $q->skip(($page - 1) * $limit)
        ->take($limit)
        ->get();

    // ✅ Normalize (initials + time + status lowercase)
    $rows->transform(function ($r) {
        $name = $r->donor_name ?: 'Anonymous';
        $parts = preg_split('/\s+/', trim($name));

        $r->initials = strtoupper(substr($parts[0] ?? 'A', 0, 1) . substr($parts[1] ?? '', 0, 1));
        $r->time = $r->created_at ? Carbon::parse($r->created_at)->diffForHumans() : null;
        $r->status = strtolower($r->status ?? 'pending');

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
}
