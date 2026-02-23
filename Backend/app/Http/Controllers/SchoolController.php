<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\School;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SchoolController extends Controller
{
    /**
     * ✅ Register School (with optional document upload)
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'school_name'     => 'required|string|max:255',
            'registration_no' => 'required|string|unique:schools,registration_no',
            'contact_email'   => 'required|email|unique:schools,contact_email',
            'password'        => 'required|min:6',

            'student_count'   => 'required|integer',
            'facilities'      => 'required|integer',
            'area_type'       => 'required|string|max:50',
            'performance'     => 'required|integer',
            'prev_donations'  => 'required|integer',

            'category'        => 'nullable|string',
            'district'        => 'nullable|string|max:100',
            'province'        => 'nullable|string|max:100',
            'contact_person'  => 'nullable|string|max:150',
            'address'         => 'nullable|string|max:255',
            'contact_phone'   => 'nullable|string|max:20',

            'bank_name'       => 'nullable|string|max:50',
            'account_holder'  => 'nullable|string|max:100',
            'bank_account'    => 'nullable|string|max:50',

            // ✅ file
            'document'        => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        // ✅ store file into /public/uploads/docs
        $docPath = null;
        if ($request->hasFile('document')) {
            $file = $request->file('document');
            $name = time() . '_' . Str::random(8) . '_' . $file->getClientOriginalName();
            $file->move(public_path('uploads/docs'), $name);
            $docPath = 'uploads/docs/' . $name; // ✅ matches DB format
        }

        // Step 1: Create school record with temporary need_score = 0
        $school = School::create([
            'school_name'     => $validated['school_name'],
            'registration_no' => $validated['registration_no'],
            'category'        => $validated['category'] ?? null,
            'district'        => $validated['district'] ?? null,
            'province'        => $validated['province'] ?? null,
            'contact_person'  => $validated['contact_person'] ?? null,
            'address'         => $validated['address'] ?? null,
            'contact_email'   => $validated['contact_email'],
            'contact_phone'   => $validated['contact_phone'] ?? null,

            'logo_url'        => null,

            'bank_name'       => $validated['bank_name'] ?? null,
            'account_holder'  => $validated['account_holder'] ?? null,
            'bank_account'    => $validated['bank_account'] ?? null,

            'password_hash'   => Hash::make($validated['password']),

            'student_count'   => $validated['student_count'],
            'facilities'      => $validated['facilities'],
            'area_type'       => $validated['area_type'],
            'performance'     => $validated['performance'],
            'prev_donations'  => $validated['prev_donations'],

            'need_score'      => 0,
            'verified'        => 0,
            'status'          => 'Inactive',

            // ✅ document path in DB
            'documents_url'   => $docPath,
        ]);

        // Step 2: Call Flask API to calculate need_score
        try {
            $response = Http::withHeaders(['Content-Type' => 'application/json'])
                ->post('http://127.0.0.1:5000/calculate_need', [
                    'student_count'  => $school->student_count,
                    'facilities'     => $school->facilities,
                    'area_type'      => $school->area_type,
                    'performance'    => $school->performance,
                    'prev_donations' => $school->prev_donations,
                ]);

            \Log::info('Flask API raw response: ' . $response->body());

            if ($response->successful() && isset($response->json()['need_score'])) {
                $needScore = (float) $response->json()['need_score'];
                \Log::info('Need Score from Flask: ' . $needScore);

                $school->need_score = $needScore;
                $school->save();
                $school->refresh();
            } else {
                \Log::error('Flask API returned invalid data: ' . $response->body());
            }
        } catch (\Exception $e) {
            \Log::error('Flask API call failed: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'School registered successfully!',
            'school'  => $school,
        ], 201);
    }

    /**
     * ✅ Schools map summary (optional)
     */
    public function schoolsWithDonations()
    {
        $schools = DB::table('schools')
            ->leftJoin('donations', function ($join) {
                $join->on('schools.school_id', '=', 'donations.school_id')
                     ->whereRaw('LOWER(donations.status) = ?', ['paid']);
            })
            ->select(
                'schools.school_id',
                'schools.school_name',
                'schools.district',
                'schools.province',
                'schools.latitude',
                'schools.longitude',
                'schools.need_score',
                DB::raw('COALESCE(SUM(donations.amount), 0) as total_received')
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

    /**
     * ✅ Admin list Schools (filters + sort + donation activity + doc link)
     * GET /api/schools
     */
    public function listSchools(Request $request)
    {
        $search   = trim($request->query('search', ''));
        $province = $request->query('province', 'all');
        $district = $request->query('district', 'all');
        $status   = $request->query('status', 'all'); // Active | Inactive | all

        // quick chips
        $verifiedFilter = $request->query('verifiedFilter', 'all'); // all | verified | not_verified
        $needBand       = $request->query('needBand', 'all');       // all | high | medium | low
        $donationBand   = $request->query('donationBand', 'all');   // all | has | zero

        $page  = max(1, (int) $request->query('page', 1));
        $limit = max(1, min(50, (int) $request->query('limit', 10)));

        $sortBy  = $request->query('sortBy', 'created_at');
        $sortDir = strtolower($request->query('sortDir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowedSort = ['created_at', 'need_score', 'total_received', 'school_name', 'donations_count', 'last_donation_at'];
        if (!in_array($sortBy, $allowedSort)) $sortBy = 'created_at';

        $q = DB::table('schools')
            ->leftJoin('donation_requests', 'schools.school_id', '=', 'donation_requests.school_id')
            ->leftJoin('donations', function ($join) {
                $join->on('donation_requests.request_id', '=', 'donations.request_id')
                    ->whereRaw('LOWER(donations.status) = ?', ['paid']);
            })
            ->select(
                'schools.school_id',
                'schools.school_name',
                'schools.registration_no',
                'schools.contact_email',
                'schools.contact_phone',
                'schools.district',
                'schools.province',
                'schools.address',
                'schools.status',
                'schools.verified',
                'schools.need_score',
                'schools.created_at',
                'schools.documents_url',

                // summary
                DB::raw('COALESCE(SUM(donations.amount), 0) as total_received'),
                DB::raw('COUNT(DISTINCT donation_requests.request_id) as campaigns_count'),

                // activity
                DB::raw('COUNT(donations.donation_id) as donations_count'),
                DB::raw('MAX(donations.created_at) as last_donation_at')
            )
            ->groupBy(
                'schools.school_id',
                'schools.school_name',
                'schools.registration_no',
                'schools.contact_email',
                'schools.contact_phone',
                'schools.district',
                'schools.province',
                'schools.address',
                'schools.status',
                'schools.verified',
                'schools.need_score',
                'schools.created_at',
                'schools.documents_url' // ✅ IMPORTANT (fix)
            );

        // ---------- filters ----------
        if ($province !== 'all') {
            $q->where('schools.province', $province);
        }

        if ($district !== 'all') {
            $q->where('schools.district', $district);
        }

        if ($status !== 'all') {
            $q->whereRaw('LOWER(schools.status) = ?', [strtolower($status)]);
        }

        if ($verifiedFilter === 'verified') {
            $q->where('schools.verified', 1);
        } elseif ($verifiedFilter === 'not_verified') {
            $q->where(function ($qq) {
                $qq->whereNull('schools.verified')->orWhere('schools.verified', 0);
            });
        }

        if ($needBand === 'high') {
            $q->where('schools.need_score', '>=', 70);
        } elseif ($needBand === 'medium') {
            $q->whereBetween('schools.need_score', [40, 69.9999]);
        } elseif ($needBand === 'low') {
            $q->where('schools.need_score', '<', 40);
        }

        if ($search !== '') {
            $q->where(function ($qq) use ($search) {
                $qq->where('schools.school_name', 'like', "%{$search}%")
                    ->orWhere('schools.registration_no', 'like', "%{$search}%")
                    ->orWhere('schools.contact_email', 'like', "%{$search}%")
                    ->orWhere('schools.province', 'like', "%{$search}%")
                    ->orWhere('schools.district', 'like', "%{$search}%");
            });
        }

        // computed donation filters => HAVING
        if ($donationBand === 'has') {
            $q->havingRaw('COALESCE(SUM(donations.amount), 0) > 0');
        } elseif ($donationBand === 'zero') {
            $q->havingRaw('COALESCE(SUM(donations.amount), 0) = 0');
        }

        // ✅ correct total for grouped/having query
        $total = DB::query()->fromSub(clone $q, 't')->count();

        // ---------- sorting ----------
        if ($sortBy === 'total_received') {
            $q->orderBy(DB::raw('total_received'), $sortDir);
        } elseif ($sortBy === 'donations_count') {
            $q->orderBy(DB::raw('donations_count'), $sortDir);
        } elseif ($sortBy === 'last_donation_at') {
            $q->orderBy(DB::raw('last_donation_at'), $sortDir);
        } else {
            $q->orderBy("schools.$sortBy", $sortDir);
        }

        $rows = $q->skip(($page - 1) * $limit)
            ->take($limit)
            ->get();

        // normalize fields for frontend
        $rows->transform(function ($r) {
            $name = $r->school_name ?: 'School';
            $parts = preg_split('/\s+/', trim($name));
            $r->initials = strtoupper(substr($parts[0] ?? 'S', 0, 1) . substr($parts[1] ?? '', 0, 1));

            $r->status = strtolower($r->status ?? 'inactive');
            $r->verified = (int) ($r->verified ?? 0);

            $r->need_score = (float) ($r->need_score ?? 0);
            $r->total_received = (float) ($r->total_received ?? 0);
            $r->campaigns_count = (int) ($r->campaigns_count ?? 0);

            $r->donations_count = (int) ($r->donations_count ?? 0);
            $r->last_donation_at = $r->last_donation_at;

            // ✅ full url for admin to open
            $r->document_link = $r->documents_url ? url($r->documents_url) : null;

            return $r;
        });

        // dropdown values
        $provinces = DB::table('schools')
            ->select('province')
            ->whereNotNull('province')
            ->distinct()
            ->orderBy('province')
            ->pluck('province');

        $districts = DB::table('schools')
            ->select('district')
            ->whereNotNull('district')
            ->when($province !== 'all', fn ($qq) => $qq->where('province', $province))
            ->distinct()
            ->orderBy('district')
            ->pluck('district');

        return response()->json([
            'schools' => $rows,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'filters' => [
                'provinces' => $provinces,
                'districts' => $districts,
            ],
        ]);
    }

    /**
     * ✅ View school detail for Drawer
     * GET /api/schools/{id}
     */
    public function show($id)
    {
        $row = DB::table('schools')
            ->where('school_id', $id)
            ->first();

        if (!$row) {
            return response()->json(['message' => 'School not found'], 404);
        }

        $row->status = strtolower($row->status ?? 'inactive');
        $row->verified = (int)($row->verified ?? 0);
        $row->need_score = (float)($row->need_score ?? 0);
        $row->document_link = $row->documents_url ? url($row->documents_url) : null;

        // top 5 campaigns
        $campaigns = DB::table('donation_requests')
            ->where('school_id', $id)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get([
                'request_id',
                'request_title',
                'category',
                'amount_raised',
                'estimated_price',
                'status',
                'created_at',
            ]);

        // donation summary
        $donationSummary = DB::table('donation_requests')
            ->leftJoin('donations', function ($join) {
                $join->on('donation_requests.request_id', '=', 'donations.request_id')
                    ->whereRaw('LOWER(donations.status) = ?', ['paid']);
            })
            ->where('donation_requests.school_id', $id)
            ->selectRaw('COALESCE(SUM(donations.amount), 0) as total_received')
            ->selectRaw('COUNT(donations.donation_id) as donations_count')
            ->selectRaw('MAX(donations.created_at) as last_donation_at')
            ->first();

        return response()->json([
            'school' => $row,
            'campaigns' => $campaigns,
            'donation_summary' => $donationSummary,
        ]);
    }

    /**
     * ✅ Bulk update
     * POST /api/schools/bulk-update
     * body: { school_ids: [1,2], status?: "active|inactive", verified?: 0|1 }
     */
    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'school_ids' => 'required|array|min:1',
            'school_ids.*' => 'integer',
            'status' => 'nullable|string',
            'verified' => 'nullable|integer|in:0,1',
        ]);

        $ids = $data['school_ids'];

        // ✅ rule: cannot verify without reg no + document
        if (array_key_exists('verified', $data) && (int)$data['verified'] === 1) {
            $missing = DB::table('schools')
                ->whereIn('school_id', $ids)
                ->where(function ($qq) {
                    $qq->whereNull('registration_no')
                        ->orWhere('registration_no', '')
                        ->orWhereNull('documents_url')
                        ->orWhere('documents_url', '');
                })
                ->count();

            if ($missing > 0) {
                return response()->json([
                    'message' => 'Some schools missing registration_no or document. Cannot verify.'
                ], 422);
            }
        }

        $update = [];

        if (isset($data['status'])) {
            $st = strtolower($data['status']);
            $update['status'] = $st === 'active' ? 'Active' : ($st === 'inactive' ? 'Inactive' : $data['status']);
        }
        if (array_key_exists('verified', $data)) {
            $update['verified'] = (int)$data['verified'];
        }

        if (empty($update)) {
            return response()->json(['message' => 'No fields to update'], 422);
        }

        $affected = DB::table('schools')
            ->whereIn('school_id', $ids)
            ->update($update);

        return response()->json([
            'message' => 'Bulk update completed',
            'affected' => $affected,
        ]);
    }






    public function overview(Request $request)
    {
        $user = Auth::user();

        // ✅ You must have school_id on authenticated school user
        $schoolId = $user->school_id ?? null;

        if (!$schoolId) {
            return response()->json(['message' => 'School not authenticated'], 401);
        }

        // --- school basic info ---
        $school = DB::table('schools')
            ->where('school_id', $schoolId)
            ->first();

        if (!$school) {
            return response()->json(['message' => 'School not found'], 404);
        }

        // --- totals (paid only) ---
        $summary = DB::table('donation_requests')
            ->leftJoin('donations', function ($join) {
                $join->on('donation_requests.request_id', '=', 'donations.request_id')
                    ->whereRaw("LOWER(donations.status)='paid'");
            })
            ->where('donation_requests.school_id', $schoolId)
            ->selectRaw('COALESCE(SUM(donations.amount),0) as total_received')
            ->selectRaw('COUNT(donations.donation_id) as donations_count')
            ->selectRaw('MAX(donations.created_at) as last_donation_at')
            ->first();

        // --- campaign counts ---
        $activeCampaigns = DB::table('donation_requests')
            ->where('school_id', $schoolId)
            ->where('status', 'Approved') // your system uses Approved/Pending
            ->count();

        $pendingCampaigns = DB::table('donation_requests')
            ->where('school_id', $schoolId)
            ->where('status', 'Pending')
            ->count();

        // --- recent donations (paid only) ---
        $recentDonations = DB::table('donations')
            ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
            ->where('donation_requests.school_id', $schoolId)
            ->whereRaw("LOWER(donations.status)='paid'")
            ->orderByDesc('donations.created_at')
            ->limit(8)
            ->get([
                'donations.donation_id',
                'donations.donor_name',
                'donations.donor_email',
                'donations.amount',
                'donations.created_at',
                'donation_requests.request_title',
            ]);

        // add "time_ago"
        $recentDonations->transform(function ($d) {
            $d->time_ago = $d->created_at ? Carbon::parse($d->created_at)->diffForHumans() : null;
            return $d;
        });

        // --- top campaigns (latest 5) ---
        $campaigns = DB::table('donation_requests')
            ->where('school_id', $schoolId)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get([
                'request_id',
                'request_title',
                'category',
                'estimated_price',
                'amount_raised',
                'status',
                'created_at',
            ]);

        // --- trend (last 30 days): paid amount per day ---
        $from = Carbon::now()->subDays(29)->startOfDay();
        $to   = Carbon::now()->endOfDay();

        $trendRows = DB::table('donations')
            ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
            ->where('donation_requests.school_id', $schoolId)
            ->whereBetween('donations.created_at', [$from, $to])
            ->whereRaw("LOWER(donations.status)='paid'")
            ->selectRaw("DATE(donations.created_at) as day, SUM(donations.amount) as total")
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        $trendMap = $trendRows->pluck('total', 'day');

        $trend = [];
        $cursor = $from->copy();
        while ($cursor <= $to) {
            $day = $cursor->toDateString();
            $trend[] = [
                'day' => $day,
                'total' => (float)($trendMap[$day] ?? 0),
            ];
            $cursor->addDay();
        }

        // ✅ build safe document link
        $documentLink = $school->documents_url ? url($school->documents_url) : null;

        return response()->json([
            'school' => [
                'school_id' => (int)$school->school_id,
                'school_name' => $school->school_name,
                'registration_no' => $school->registration_no,
                'contact_email' => $school->contact_email,
                'contact_phone' => $school->contact_phone,
                'district' => $school->district,
                'province' => $school->province,
                'address' => $school->address,
                'need_score' => (float)($school->need_score ?? 0),
                'verified' => (int)($school->verified ?? 0),
                'status' => strtolower($school->status ?? 'inactive'),
                'document_link' => $documentLink,
            ],
            'kpis' => [
                'total_received' => (float)($summary->total_received ?? 0),
                'donations_count' => (int)($summary->donations_count ?? 0),
                'last_donation_at' => $summary->last_donation_at,
                'active_campaigns' => (int)$activeCampaigns,
                'pending_campaigns' => (int)$pendingCampaigns,
            ],
            'trend_30d' => $trend,
            'recent_donations' => $recentDonations,
            'top_campaigns' => $campaigns,
        ]);
    }
}