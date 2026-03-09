<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\Ministry;


use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;



class MinistryController extends Controller
{
   public function overview(Request $request)
{
    $ministry = auth()->guard('ministry')->user();

    if (!$ministry) {
        return response()->json([
            'message' => 'Ministry not authenticated'
        ], 401);
    }

    $days = (int) $request->query('days', 30);
    if ($days < 7) $days = 7;
    if ($days > 365) $days = 365;

    $from = Carbon::now()->subDays($days - 1)->startOfDay();
    $to   = Carbon::now()->endOfDay();

    $totalSchools = (int) DB::table('schools')->count();

    $schoolsByStatus = DB::table('schools')
        ->selectRaw("LOWER(COALESCE(status,'inactive')) as status, COUNT(*) as count")
        ->groupBy('status')
        ->orderByDesc('count')
        ->get();

    $totalDonors = (int) DB::table('donors')->count();

    $donationsKpiBase = DB::table('donations');
    $totalDonations = (int) (clone $donationsKpiBase)->count();
    $paidCount = (int) (clone $donationsKpiBase)->whereRaw("LOWER(status)='paid'")->count();
    $pendingCount = (int) (clone $donationsKpiBase)->whereRaw("LOWER(status)='pending'")->count();
    $paidAmountTotal = (float) (clone $donationsKpiBase)->whereRaw("LOWER(status)='paid'")->sum('amount');

    $totalCampaigns = (int) DB::table('donation_requests')->count();
    $approvedCampaigns = (int) DB::table('donation_requests')->where('status', 'Approved')->count();
    $pendingCampaigns  = (int) DB::table('donation_requests')->where('status', 'Pending')->count();

    $trendRows = DB::table('donations')
        ->whereBetween('created_at', [$from, $to])
        ->whereRaw("LOWER(status)='paid'")
        ->selectRaw("DATE(created_at) as day, SUM(amount) as amount, COUNT(*) as count")
        ->groupBy('day')
        ->orderBy('day')
        ->get();

    $trendAmountMap = $trendRows->pluck('amount', 'day');
    $trendCountMap  = $trendRows->pluck('count', 'day');

    $trend = [];
    $cursor = $from->copy();
    while ($cursor <= $to) {
        $d = $cursor->toDateString();
        $trend[] = [
            'day' => $d,
            'amount' => (float) ($trendAmountMap[$d] ?? 0),
            'count' => (int) ($trendCountMap[$d] ?? 0),
        ];
        $cursor->addDay();
    }

    $recentDonations = DB::table('donations')
        ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
        ->leftJoin('schools', function ($join) {
            $join->on('schools.school_id', '=', 'donation_requests.school_id')
                 ->orOn('schools.school_id', '=', 'donations.school_id');
        })
        ->whereRaw("LOWER(donations.status)='paid'")
        ->orderByDesc('donations.created_at')
        ->limit(10)
        ->get([
            'donations.donation_id',
            'donations.amount',
            'donations.created_at',
            'donations.donor_name',
            'donations.donor_email',
            'donations.request_id',
            'donation_requests.request_title',
            'schools.school_id',
            'schools.school_name',
            'schools.province',
            'schools.district',
        ]);

    $recentDonations->transform(function ($d) {
        $d->time = $d->created_at ? Carbon::parse($d->created_at)->diffForHumans() : null;
        $d->amount = (float) ($d->amount ?? 0);
        return $d;
    });

    $topProvinces = DB::table('donations')
        ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
        ->leftJoin('schools', function ($join) {
            $join->on('schools.school_id', '=', 'donation_requests.school_id')
                 ->orOn('schools.school_id', '=', 'donations.school_id');
        })
        ->whereBetween('donations.created_at', [$from, $to])
        ->whereRaw("LOWER(donations.status)='paid'")
        ->selectRaw("COALESCE(schools.province,'Unknown') as province, SUM(donations.amount) as total")
        ->groupBy('province')
        ->orderByDesc('total')
        ->limit(8)
        ->get();

    $topCampaigns = DB::table('donations')
        ->join('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
        ->whereBetween('donations.created_at', [$from, $to])
        ->whereRaw("LOWER(donations.status)='paid'")
        ->selectRaw("donation_requests.request_id, donation_requests.request_title, SUM(donations.amount) as total, COUNT(*) as count")
        ->groupBy('donation_requests.request_id', 'donation_requests.request_title')
        ->orderByDesc('total')
        ->limit(8)
        ->get();

    $schoolsMap = DB::table('schools as s')
        ->leftJoin('fund_allocations as fa', function ($join) {
            $join->on('s.school_id', '=', 'fa.school_id')
                 ->where('fa.status', '=', 'active');
        })
        ->selectRaw("
            s.school_id,
            s.school_name,
            s.district,
            s.province,
            s.latitude,
            s.longitude,
            COALESCE(SUM(fa.allocated_amount), 0) as total_received,
            COALESCE(s.need_score, 0) as need_score
        ")
        ->groupBy(
            's.school_id',
            's.school_name',
            's.district',
            's.province',
            's.latitude',
            's.longitude',
            's.need_score'
        )
        ->orderByDesc('total_received')
        ->limit(500)
        ->get();

    return response()->json([
        'ministry' => [
            'ministry_id' => $ministry->ministry_id,
            'name' => $ministry->name,
            'email' => $ministry->email,
        ],
        'range' => [
            'days' => $days,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
        ],
        'kpis' => [
            'total_schools' => $totalSchools,
            'schools_by_status' => $schoolsByStatus,
            'total_donors' => $totalDonors,
            'total_campaigns' => $totalCampaigns,
            'approved_campaigns' => $approvedCampaigns,
            'pending_campaigns' => $pendingCampaigns,
            'total_donations' => $totalDonations,
            'paid_count' => $paidCount,
            'pending_count' => $pendingCount,
            'paid_amount_total' => $paidAmountTotal,
        ],
        'trend' => $trend,
        'recent_donations' => $recentDonations,
        'top_provinces' => $topProvinces,
        'top_campaigns' => $topCampaigns,
        'schools_map' => $schoolsMap,
    ]);
}

    // GET /api/ministry/donors?search=&sortBy=created_at|total_donated|donations_count&sortDir=asc|desc
    public function index(Request $request)
    {
        $search = trim($request->query('search', ''));
        $sortBy = $request->query('sortBy', 'created_at');
        $sortDir = strtolower($request->query('sortDir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowedSort = ['created_at', 'total_donated', 'donations_count'];
        if (!in_array($sortBy, $allowedSort)) $sortBy = 'created_at';

        $q = DB::table('donors')
            ->leftJoin('donations', function ($join) {
                $join->on('donors.donor_id', '=', 'donations.donor_id')
                    ->whereRaw("LOWER(donations.status)='paid'");
            })
            ->select(
                'donors.donor_id',
                'donors.full_name',
                'donors.email',
                'donors.phone',
                'donors.created_at',
                DB::raw('COUNT(donations.donation_id) as donations_count'),
                DB::raw('COALESCE(SUM(donations.amount), 0) as total_donated'),
                DB::raw('MAX(donations.created_at) as last_donated_at')
            )
            ->groupBy('donors.donor_id', 'donors.full_name', 'donors.email', 'donors.phone', 'donors.created_at');

        if ($search !== '') {
            $q->where(function ($qq) use ($search) {
                $qq->where('donors.full_name', 'like', "%{$search}%")
                    ->orWhere('donors.email', 'like', "%{$search}%")
                    ->orWhere('donors.phone', 'like', "%{$search}%");
            });
        }

        // sorting
        if ($sortBy === 'created_at') {
            $q->orderBy('donors.created_at', $sortDir);
        } elseif ($sortBy === 'total_donated') {
            $q->orderBy('total_donated', $sortDir);
        } else {
            $q->orderBy('donations_count', $sortDir);
        }

        $rows = $q->get();

        $rows->transform(function ($d) {
            $name = $d->full_name ?: 'Anonymous';
            $parts = preg_split('/\s+/', trim($name));
            $d->initials = strtoupper(substr($parts[0] ?? 'A', 0, 1) . substr($parts[1] ?? '', 0, 1));
            $d->donations_count = (int) $d->donations_count;
            $d->total_donated = (float) $d->total_donated;
            $d->last_time = $d->last_donated_at ? Carbon::parse($d->last_donated_at)->diffForHumans() : null;
            return $d;
        });

        // KPIs for header cards
        $totalDonors = (int) DB::table('donors')->count();
        $paidTotal = (float) DB::table('donations')->whereRaw("LOWER(status)='paid'")->sum('amount');
        $paidCount = (int) DB::table('donations')->whereRaw("LOWER(status)='paid'")->count();

        return response()->json([
            'kpis' => [
                'total_donors' => $totalDonors,
                'paid_amount' => $paidTotal,
                'paid_count' => $paidCount,
            ],
            'donors' => $rows,
        ]);
    }

    // GET /api/ministry/donors/{id}
    public function show($id)
    {
        $donor = DB::table('donors')->where('donor_id', (int)$id)->first();
        if (!$donor) return response()->json(['message' => 'Donor not found'], 404);

        $base = DB::table('donations')
            ->where('donor_id', (int)$id)
            ->whereRaw("LOWER(status)='paid'");

        $total = (float) (clone $base)->sum('amount');
        $count = (int) (clone $base)->count();
        $last = (clone $base)->max('created_at');

        return response()->json([
            'donor' => [
                'donor_id' => $donor->donor_id,
                'full_name' => $donor->full_name,
                'email' => $donor->email,
                'phone' => $donor->phone,
                'created_at' => $donor->created_at,
            ],
            'stats' => [
                'total_donated' => $total,
                'donations_count' => $count,
                'last_donation_at' => $last,
            ]
        ]);
    }

    // GET /api/ministry/donors/{id}/donations
    public function donations(Request $request, $id)
    {
        $limit = max(1, min(50, (int)$request->query('limit', 20)));

        // ✅ Works for campaign + direct fund
        $rows = DB::table('donations')
            ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
            ->leftJoin('schools', function ($join) {
                $join->on('schools.school_id', '=', 'donation_requests.school_id')
                    ->orOn('schools.school_id', '=', 'donations.school_id');
            })
            ->where('donations.donor_id', (int)$id)
            ->whereRaw("LOWER(donations.status)='paid'")
            ->orderByDesc('donations.created_at')
            ->limit($limit)
            ->get([
                'donations.donation_id',
                'donations.amount',
                'donations.created_at',
                'donations.request_id',
                'donations.school_id',
                'donations.donation_type',
                'donation_requests.request_title',
                'schools.school_name',
                'schools.province',
                'schools.district',
            ]);

        $rows->transform(function ($r) {
            $r->amount = (float) ($r->amount ?? 0);
            $r->time = $r->created_at ? Carbon::parse($r->created_at)->diffForHumans() : null;
            return $r;
        });

        return response()->json(['donations' => $rows]);
    }

    // GET /api/ministry/campaigns
    public function index2(Request $request)
    {
        $search = trim($request->query('search', ''));
        $status = $request->query('status', 'all'); // all | Approved | Pending | Rejected...
        $sortBy = $request->query('sortBy', 'newest'); // newest | goal | raised | remaining
        $dir    = strtolower($request->query('dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $q = DB::table('donation_requests')
            ->leftJoin('schools', 'donation_requests.school_id', '=', 'schools.school_id')
            ->leftJoin('donations', function ($join) {
                $join->on('donation_requests.request_id', '=', 'donations.request_id')
                     ->whereRaw("LOWER(donations.status)='paid'");
            })
            ->select(
                'donation_requests.request_id',
                'donation_requests.school_id',
                'donation_requests.request_title',
                'donation_requests.category',
                'donation_requests.quantity',
                'donation_requests.estimated_price',
                'donation_requests.amount_raised',
                'donation_requests.status',
                'donation_requests.description',
                'donation_requests.image_url',
                'donation_requests.document_url',
                'donation_requests.created_at',
                'schools.school_name',
                'schools.province',
                'schools.district',
                DB::raw('COUNT(donations.donation_id) as paid_donations_count'),
                DB::raw('COALESCE(SUM(donations.amount),0) as paid_amount')
            )
            ->groupBy(
                'donation_requests.request_id',
                'donation_requests.school_id',
                'donation_requests.request_title',
                'donation_requests.category',
                'donation_requests.quantity',
                'donation_requests.estimated_price',
                'donation_requests.amount_raised',
                'donation_requests.status',
                'donation_requests.description',
                'donation_requests.image_url',
                'donation_requests.document_url',
                'donation_requests.created_at',
                'schools.school_name',
                'schools.province',
                'schools.district'
            );

        if ($status !== 'all') {
            $q->where('donation_requests.status', $status);
        }

        if ($search !== '') {
            $q->where(function ($qq) use ($search) {
                $qq->where('donation_requests.request_title', 'like', "%{$search}%")
                   ->orWhere('donation_requests.description', 'like', "%{$search}%")
                   ->orWhere('schools.school_name', 'like', "%{$search}%")
                   ->orWhere('schools.province', 'like', "%{$search}%")
                   ->orWhere('schools.district', 'like', "%{$search}%")
                   ->orWhere('donation_requests.category', 'like', "%{$search}%");
            });
        }

        // sorting
        if ($sortBy === 'goal') {
            $q->orderBy('donation_requests.estimated_price', $dir);
        } elseif ($sortBy === 'raised') {
            $q->orderBy('donation_requests.amount_raised', $dir);
        } elseif ($sortBy === 'remaining') {
            $q->orderByRaw('(donation_requests.estimated_price - donation_requests.amount_raised) ' . $dir);
        } else {
            $q->orderBy('donation_requests.created_at', $dir);
        }

        $rows = $q->get();

        $rows->transform(function ($r) {
            $r->estimated_price = (float) ($r->estimated_price ?? 0);
            $r->amount_raised   = (float) ($r->amount_raised ?? 0);
            $r->paid_amount     = (float) ($r->paid_amount ?? 0);
            $r->paid_donations_count = (int) ($r->paid_donations_count ?? 0);
            $r->time = $r->created_at ? Carbon::parse($r->created_at)->diffForHumans() : null;
            return $r;
        });

        $kpis = [
            'total_campaigns' => (int) DB::table('donation_requests')->count(),
            'approved_campaigns' => (int) DB::table('donation_requests')->where('status', 'Approved')->count(),
            'paid_amount' => (float) DB::table('donations')->whereRaw("LOWER(status)='paid'")->sum('amount'),
            'paid_count'  => (int) DB::table('donations')->whereRaw("LOWER(status)='paid'")->count(),
        ];

        return response()->json(['kpis' => $kpis, 'campaigns' => $rows]);
    }

    // GET /api/ministry/campaigns/{id}
    public function show2($id)
    {
        $c = DB::table('donation_requests')
            ->leftJoin('schools', 'donation_requests.school_id', '=', 'schools.school_id')
            ->where('donation_requests.request_id', (int)$id)
            ->first([
                'donation_requests.request_id',
                'donation_requests.school_id',
                'donation_requests.request_title',
                'donation_requests.category',
                'donation_requests.quantity',
                'donation_requests.estimated_price',
                'donation_requests.amount_raised',
                'donation_requests.status',
                'donation_requests.description',
                'donation_requests.image_url',
                'donation_requests.document_url',
                'donation_requests.created_at',
                'schools.school_name',
                'schools.province',
                'schools.district',
                'schools.contact_email',
                'schools.contact_phone',
                'schools.address'
            ]);

        if (!$c) return response()->json(['message' => 'Campaign not found'], 404);

        $stats = DB::table('donations')
            ->where('request_id', (int)$id)
            ->whereRaw("LOWER(status)='paid'")
            ->selectRaw("COALESCE(SUM(amount),0) as paid_amount, COUNT(*) as paid_count, MAX(created_at) as last_paid_at")
            ->first();

        return response()->json([
            'campaign' => $c,
            'stats' => [
                'paid_amount' => (float) ($stats->paid_amount ?? 0),
                'paid_count'  => (int) ($stats->paid_count ?? 0),
                'last_paid_at' => $stats->last_paid_at ?? null,
            ]
        ]);
    }

    // GET /api/ministry/campaigns/{id}/donations?limit=20
    public function donations2(Request $request, $id)
    {
        $limit = max(1, min(50, (int)$request->query('limit', 20)));

        $rows = DB::table('donations')
            ->where('request_id', (int)$id)
            ->whereRaw("LOWER(status)='paid'")
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get([
                'donation_id',
                'donor_name',
                'donor_email',
                'amount',
                'created_at',
                'donation_type',
            ]);

        $rows->transform(function ($r) {
            $r->amount = (float) ($r->amount ?? 0);
            $r->time = $r->created_at ? Carbon::parse($r->created_at)->diffForHumans() : null;
            return $r;
        });

        return response()->json(['donations' => $rows]);
    }

// GET /api/ministry/accounts
public function accounts(Request $request)
{
    $search = trim($request->query('search', ''));

    $q = Ministry::select(
        'id',
        'name',
        'email',
        'is_active',
        'created_at',
        'updated_at'
    );

    if ($search !== '') {
        $q->where(function ($qq) use ($search) {
            $qq->where('name', 'like', "%{$search}%")
               ->orWhere('email', 'like', "%{$search}%");
        });
    }

    $rows = $q->orderByDesc('id')->get();

    $rows->transform(function ($r) {
        $r->is_active = (int) ($r->is_active ?? 0);
        $r->time = $r->created_at ? Carbon::parse($r->created_at)->diffForHumans() : null;
        return $r;
    });

    return response()->json([
        'accounts' => $rows
    ]);
}

// POST /api/ministry/accounts
public function storeAccount(Request $request)
{
    $validated = $request->validate([
        'name' => ['required', 'string', 'max:255'],
        'email' => ['required', 'email', 'max:255', 'unique:ministries,email'],
        'password' => ['required', 'string', 'min:6'],
        'is_active' => ['nullable', 'boolean'],
    ]);

    $account = Ministry::create([
        'name' => $validated['name'],
        'email' => $validated['email'],
        'password' => Hash::make($validated['password']),
        'is_active' => $validated['is_active'] ?? 1,
    ]);

    return response()->json([
        'message' => 'Ministry account created successfully',
        'account' => [
            'id' => $account->id,
            'name' => $account->name,
            'email' => $account->email,
            'is_active' => (int) $account->is_active,
            'created_at' => $account->created_at,
        ]
    ], 201);
}

// PUT /api/ministry/accounts/{id}
public function updateAccount(Request $request, $id)
{
    $account = Ministry::find($id);

    if (!$account) {
        return response()->json([
            'message' => 'Ministry account not found'
        ], 404);
    }

    $validated = $request->validate([
        'name' => ['required', 'string', 'max:255'],
        'email' => [
            'required',
            'email',
            'max:255',
            Rule::unique('ministries', 'email')->ignore($account->id),
        ],
        'password' => ['nullable', 'string', 'min:6'],
        'is_active' => ['nullable', 'boolean'],
    ]);

    $account->name = $validated['name'];
    $account->email = $validated['email'];

    if ($request->filled('password')) {
        $account->password = Hash::make($validated['password']);
    }

    if ($request->has('is_active')) {
        $account->is_active = $validated['is_active'];
    }

    $account->save();

    return response()->json([
        'message' => 'Ministry account updated successfully',
        'account' => [
            'id' => $account->id,
            'name' => $account->name,
            'email' => $account->email,
            'is_active' => (int) $account->is_active,
            'updated_at' => $account->updated_at,
        ]
    ]);
}

// PATCH /api/ministry/accounts/{id}/toggle
public function toggleAccount($id)
{
    $account = Ministry::find($id);

    if (!$account) {
        return response()->json([
            'message' => 'Ministry account not found'
        ], 404);
    }

    $account->is_active = !$account->is_active;
    $account->save();

    return response()->json([
        'message' => 'Account status updated successfully',
        'account' => [
            'id' => $account->id,
            'name' => $account->name,
            'email' => $account->email,
            'is_active' => (int) $account->is_active,
        ]
    ]);
}

    
}