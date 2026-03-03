<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\School;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Facades\Auth;
use App\Services\LedgerService;
use App\Notifications\SchoolVerifiedNotification;
use App\Notifications\SchoolStatusChangedNotification;
use App\Services\NotificationMailer;





use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SchoolController extends Controller
{
    
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

        'category'        => 'nullable|string|max:100',
        'district'        => 'nullable|string|max:100',
        'province'        => 'nullable|string|max:100',
        'contact_person'  => 'nullable|string|max:150',
        'address'         => 'nullable|string|max:255',
        'contact_phone'   => 'nullable|string|max:20',

        'bank_name'       => 'nullable|string|max:50',
        'account_holder'  => 'nullable|string|max:100',
        'bank_account'    => 'nullable|string|max:50',

        'document'        => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
    ]);

    return DB::transaction(function () use ($request, $validated) {

       
        $docPath = null;
        if ($request->hasFile('document')) {
            $file = $request->file('document');
            $name = time() . '_' . Str::random(8) . '_' . $file->getClientOriginalName();
            $file->move(public_path('uploads/docs'), $name);
            $docPath = 'uploads/docs/' . $name;
        }

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
            'documents_url'   => $docPath,
        ]);
        //  Call Flask API to calculate need_score
        try {
            $response = Http::timeout(5)->withHeaders(['Content-Type' => 'application/json'])
                ->post('http://127.0.0.1:5000/calculate_need', [
                    'student_count'  => (int) $school->student_count,
                    'facilities'     => (int) $school->facilities,
                    'area_type'      => (string) $school->area_type,
                    'performance'    => (int) $school->performance,
            
                ]);

            Log::info('Flask API raw response: ' . $response->body());

            $json = $response->json();
            if ($response->successful() && isset($json['need_score'])) {
                $school->need_score = (float) $json['need_score'];
                $school->save();
            } else {
                Log::error('Flask API invalid: ' . $response->body());
            }
        } catch (\Throwable $e) {
            Log::error('Flask API call failed: ' . $e->getMessage());
        }



        // ✅ LEDGER: school registered (NOW it runs)
        app(LedgerService::class)->record(
            'SCHOOL_REGISTERED',
            'school',
            (int) $school->school_id,
            [
                'school_id' => (int)$school->school_id,
                'school_name' => $school->school_name,
                'registration_no' => $school->registration_no,
                'contact_email' => $school->contact_email,
                'district' => $school->district,
                'province' => $school->province,
                'documents_url' => $school->documents_url,
                'need_score' => (float)$school->need_score,
                'verified' => (int)$school->verified,
                'status' => (string)$school->status,
                'at' => now()->toDateTimeString(),
            ]
        );

        // ✅ ADMIN notification
        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => 'admin',
            'notifiable_type' => 'admin',
            'notifiable_id' => 1,
            'data' => json_encode([
                'title' => 'New school registered',
                'body'  => 'A new school registered and needs verification.',
                'school_id' => (int)$school->school_id,
                'school_name' => $school->school_name,
                'registration_no' => $school->registration_no,
                'document_link' => $school->documents_url ? url($school->documents_url) : null,
                'time' => now()->toDateTimeString(),
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'School registered successfully!',
            'school'  => $school,
        ], 201);
    });
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
                'schools.fund_balance as total_received'
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
    $status   = $request->query('status', 'all');

    $verifiedFilter = $request->query('verifiedFilter', 'all'); // all | verified | not_verified
    $needBand       = $request->query('needBand', 'all');       // all | high | medium | low
    $donationBand   = $request->query('donationBand', 'all');   // all | has | zero

    $page  = max(1, (int) $request->query('page', 1));
    $limit = max(1, min(50, (int) $request->query('limit', 10)));

    $sortBy  = $request->query('sortBy', 'created_at');
    $sortDir = strtolower($request->query('sortDir', 'desc')) === 'asc' ? 'asc' : 'desc';

    $allowedSort = ['created_at', 'need_score', 'total_received', 'school_name', 'donations_count', 'last_donation_at', 'campaigns_count'];
    if (!in_array($sortBy, $allowedSort)) $sortBy = 'created_at';

    // ✅ Subquery: donation stats by school (counts both campaign + direct fund)
    $donStats = DB::table('donations')
        ->whereRaw("LOWER(status)='paid'")
        ->select(
            'school_id',
            DB::raw('COUNT(*) as donations_count'),
            DB::raw('MAX(created_at) as last_donation_at')
        )
        ->groupBy('school_id');

    // ✅ Subquery: campaign count by school
    $campStats = DB::table('donation_requests')
        ->select(
            'school_id',
            DB::raw('COUNT(*) as campaigns_count')
        )
        ->groupBy('school_id');

    $q = DB::table('schools')
        ->leftJoinSub($donStats, 'ds', function ($join) {
            $join->on('schools.school_id', '=', 'ds.school_id');
        })
        ->leftJoinSub($campStats, 'cs', function ($join) {
            $join->on('schools.school_id', '=', 'cs.school_id');
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
            'schools.logo_url',

            // ✅ use fund_balance as total_received
            DB::raw('COALESCE(schools.fund_balance, 0) as total_received'),

            // ✅ from subqueries
            DB::raw('COALESCE(cs.campaigns_count, 0) as campaigns_count'),
            DB::raw('COALESCE(ds.donations_count, 0) as donations_count'),
            DB::raw('ds.last_donation_at as last_donation_at')
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

    // ✅ donation filter based on fund_balance
    if ($donationBand === 'has') {
        $q->whereRaw('COALESCE(schools.fund_balance, 0) > 0');
    } elseif ($donationBand === 'zero') {
        $q->whereRaw('COALESCE(schools.fund_balance, 0) = 0');
    }

    // ✅ total count (no groupBy needed because we used subqueries)
    $total = (clone $q)->count();

    // ---------- sorting ----------
    if ($sortBy === 'total_received') {
        $q->orderBy(DB::raw('total_received'), $sortDir);
    } elseif ($sortBy === 'donations_count') {
        $q->orderBy(DB::raw('donations_count'), $sortDir);
    } elseif ($sortBy === 'campaigns_count') {
        $q->orderBy(DB::raw('campaigns_count'), $sortDir);
    } elseif ($sortBy === 'last_donation_at') {
        $q->orderBy(DB::raw('last_donation_at'), $sortDir);
    } else {
        $q->orderBy("schools.$sortBy", $sortDir);
    }

    // ✅ pagination
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

        $r->document_link = $r->documents_url ? url($r->documents_url) : null;
        $r->logo_link = $r->logo_url ? url($r->logo_url) : null;

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
        $row = DB::table('schools')->where('school_id', $id)->first();

        if (!$row) {
            return response()->json(['message' => 'School not found'], 404);
        }

        $row->status = strtolower($row->status ?? 'inactive');
        $row->verified = (int)($row->verified ?? 0);
        $row->need_score = (float)($row->need_score ?? 0);
        $row->document_link = $row->documents_url ? url($row->documents_url) : null;
        $row->logo_link = $row->logo_url ? url($row->logo_url) : null;

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

        // ✅ donation summary: fund_balance + donations count + last donation
      // ✅ donation summary: counts BOTH campaign + direct fund (uses donations.school_id)
$donationSummary = DB::table('donations')
    ->where('school_id', (int)$id)
    ->whereRaw("LOWER(status)='paid'")
    ->selectRaw("COALESCE(SUM(amount),0) as total_received")
    ->selectRaw("COUNT(*) as donations_count")
    ->selectRaw("MAX(created_at) as last_donation_at")
    ->first();

        return response()->json([
            'school' => $row,
            'campaigns' => $campaigns,
            'donation_summary' => $donationSummary,
        ]);
    }

    /**
     * ✅ Bulk update
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

    // ✅ If verifying, ensure required fields exist
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

    // ✅ read BEFORE update (so we can detect changes)
    $before = DB::table('schools')
        ->whereIn('school_id', $ids)
        ->get(['school_id', 'verified', 'status', 'school_name']);

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

    // ✅ Update
    $affected = DB::table('schools')
        ->whereIn('school_id', $ids)
        ->update($update);

    // ✅ read AFTER update
    $after = DB::table('schools')
        ->whereIn('school_id', $ids)
        ->get(['school_id', 'verified', 'status', 'school_name']);

    $afterMap = $after->keyBy('school_id');

    // if you have real admin auth, use it; otherwise keep 1
    $adminId = 1;

    // ✅ ledger + notifications per school that actually changed
    foreach ($before as $b) {
        $a = $afterMap->get($b->school_id);
        if (!$a) continue;

        $oldVerified = (int)($b->verified ?? 0);
        $newVerified = (int)($a->verified ?? 0);

        $oldStatus = strtolower((string)($b->status ?? ''));
        $newStatus = strtolower((string)($a->status ?? ''));

        $changedVerified = ($oldVerified !== $newVerified);
        $changedStatus   = ($oldStatus !== $newStatus);

        // if no meaningful change, skip
        if (!$changedVerified && !$changedStatus) continue;

        // ✅ LEDGER entry
        app(LedgerService::class)->record(
            'SCHOOL_UPDATED_BY_ADMIN',
            'school',
            (int)$a->school_id,
            [
                'school_id'   => (int)$a->school_id,
                'school_name' => $a->school_name ?? null,
                'before' => [
                    'verified' => $oldVerified,
                    'status'   => (string)($b->status ?? null),
                ],
                'after' => [
                    'verified' => $newVerified,
                    'status'   => (string)($a->status ?? null),
                ],
                'changed' => [
                    'verified' => $changedVerified,
                    'status'   => $changedStatus,
                ],
                'at' => now()->toDateTimeString(),
            ]
        );

        // ✅ NOTIFY the school (DB notifications via Laravel notify())
        $schoolModel = \App\Models\School::where('school_id', (int)$a->school_id)->first();

        // -------- Verified -> 1 --------
        if ($schoolModel && $changedVerified && $newVerified === 1) {
            // existing notification
            $schoolModel->notify(new SchoolVerifiedNotification([
                'school_id' => (int)$a->school_id,
            ]));

            // ✅ NEW: send email + insert notification row (optional) using your mail blade
            NotificationMailer::sendSchoolVerified((int)$a->school_id, $adminId);
        }

        // -------- Status change --------
        if ($schoolModel && $changedStatus) {
            // existing notification
            $schoolModel->notify(new SchoolStatusChangedNotification([
                'school_id' => (int)$a->school_id,
                'status'    => $newStatus,
            ]));

            // ✅ NEW: only when it becomes active
            if ($newStatus === 'active') {
                NotificationMailer::sendSchoolActivated((int)$a->school_id, $adminId);
            }
        }
    }

    return response()->json([
        'message' => 'Bulk update completed',
        'affected' => $affected,
    ]);
}


 public function overview(Request $request)
    {
        try {
            $user = Auth::guard('school')->user();
            $schoolId = $user?->school_id;

            if (!$schoolId) return response()->json(['message' => 'School not authenticated'], 401);

            $schoolRow = DB::table('schools')->where('school_id', $schoolId)->first();
            if (!$schoolRow) return response()->json(['message' => 'School not found'], 404);

            $school = (array) $schoolRow;

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

            $activeCampaigns = DB::table('donation_requests')
                ->where('school_id', $schoolId)
                ->where('status', 'Approved')
                ->count();

            $pendingCampaigns = DB::table('donation_requests')
                ->where('school_id', $schoolId)
                ->where('status', 'Pending')
                ->count();

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

            $recentDonations->transform(function ($d) {
                $d->time_ago = $d->created_at ? Carbon::parse($d->created_at)->diffForHumans() : null;
                return $d;
            });

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
                    'total' => (float) ($trendMap->get($day, 0)),
                ];
                $cursor->addDay();
            }

            $docPath =
                $school['documents_url'] ??
                $school['document_url'] ??
                $school['document_link'] ??
                $school['document_path'] ??
                null;

            $documentLink = $docPath ? url($docPath) : null;

            return response()->json([
                'school' => [
                    'school_id' => (int) ($school['school_id'] ?? 0),
                    'school_name' => $school['school_name'] ?? '',
                    'registration_no' => $school['registration_no'] ?? null,
                    'contact_email' => $school['contact_email'] ?? null,
                    'contact_phone' => $school['contact_phone'] ?? null,
                    'district' => $school['district'] ?? null,
                    'province' => $school['province'] ?? null,
                    'address' => $school['address'] ?? null,
                    'need_score' => (float) ($school['need_score'] ?? 0),
                    'verified' => (int) ($school['verified'] ?? 0),
                    'status' => strtolower($school['status'] ?? 'inactive'),
                    'document_link' => $documentLink,
                ],
                'kpis' => [
                    'total_received' => (float) ($summary->total_received ?? 0),
                    'donations_count' => (int) ($summary->donations_count ?? 0),
                    'last_donation_at' => $summary->last_donation_at ?? null,
                    'active_campaigns' => (int) $activeCampaigns,
                    'pending_campaigns' => (int) $pendingCampaigns,
                ],
                'trend_30d' => $trend,
                'recent_donations' => $recentDonations,
                'top_campaigns' => $campaigns,
            ]);
        } catch (\Throwable $e) {
            Log::error('School overview error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json(['message' => 'Internal Server Error'], 500);
        }
    }

public function me(Request $request)
    {
        $user = Auth::guard('school')->user();
        $schoolId = $user?->school_id;

        if (!$schoolId) return response()->json(['message' => 'School not authenticated'], 401);

        $row = DB::table('schools')->where('school_id', $schoolId)->first();
        if (!$row) return response()->json(['message' => 'School not found'], 404);

        $row->status = strtolower($row->status ?? 'inactive');
        $row->verified = (int)($row->verified ?? 0);
        $row->need_score = (float)($row->need_score ?? 0);

        $row->document_link = $row->documents_url ? url($row->documents_url) : null;
        $row->logo_link = $row->logo_url ? url($row->logo_url) : null;

        return response()->json(['school' => $row]);
    }

   public function updateMe(Request $request)
{
    $user = Auth::guard('school')->user();
    $schoolId = $user?->school_id;

    if (!$schoolId) {
        return response()->json(['message' => 'School not authenticated'], 401);
    }

    $current = DB::table('schools')->where('school_id', $schoolId)->first();
    if (!$current) {
        return response()->json(['message' => 'School not found'], 404);
    }

    // ✅ BEFORE snapshot (take after $current is loaded)
    $before = [
        'school_name'     => $current->school_name ?? null,
        'registration_no' => $current->registration_no ?? null,
        'contact_email'   => $current->contact_email ?? null,
        'contact_phone'   => $current->contact_phone ?? null,
        'district'        => $current->district ?? null,
        'province'        => $current->province ?? null,
        'address'         => $current->address ?? null,
        'logo_url'        => $current->logo_url ?? null,
        'documents_url'   => $current->documents_url ?? null,
    ];

    $validated = $request->validate([
        'school_name'     => 'required|string|max:255',
        'registration_no' => 'nullable|string|max:255',
        'contact_email'   => 'required|email|max:255',
        'contact_phone'   => 'nullable|string|max:20',

        'alt_phone'       => 'nullable|string|max:20',
        'principal_name'  => 'nullable|string|max:150',
        'postal_code'     => 'nullable|string|max:10',
        'website'         => 'nullable|url|max:255',

        'district'        => 'nullable|string|max:100',
        'province'        => 'nullable|string|max:100',
        'address'         => 'nullable|string|max:255',
        'contact_person'  => 'nullable|string|max:150',

        'category'        => 'required|in:Primary,Secondary',
        'level'           => 'required|in:Grade 1-5,Grade 6-9,Grade 10-13,All',

        'student_count'      => 'nullable|integer|min:0',
        'teacher_count'      => 'nullable|integer|min:0',
        'establishment_year' => 'nullable|integer|min:1800|max:2100',

        'latitude'        => 'nullable|numeric',
        'longitude'       => 'nullable|numeric',

        'bank_name'      => 'nullable|string|max:50',
        'account_holder' => 'nullable|string|max:100',
        'bank_account'   => 'nullable|string|max:50',

        'logo'     => 'nullable|file|mimes:jpg,jpeg,png|max:4096',
        'document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
    ]);

    // prepare upload paths
    $logoPath = $current->logo_url ?? null;
    if ($request->hasFile('logo')) {
        $file = $request->file('logo');
        $name = time() . '_' . Str::random(8) . '_' . $file->getClientOriginalName();
        $file->move(public_path('uploads/logos'), $name);
        $logoPath = 'uploads/logos/' . $name;
    }

    $docPath = $current->documents_url ?? null;
    if ($request->hasFile('document')) {
        $file = $request->file('document');
        $name = time() . '_' . Str::random(8) . '_' . $file->getClientOriginalName();
        $file->move(public_path('uploads/docs'), $name);
        $docPath = 'uploads/docs/' . $name;
    }

    return DB::transaction(function () use ($schoolId, $validated, $logoPath, $docPath, $before) {

        DB::table('schools')->where('school_id', $schoolId)->update([
            'school_name'     => $validated['school_name'],
            'registration_no' => $validated['registration_no'] ?? null,
            'contact_email'   => $validated['contact_email'],
            'contact_phone'   => $validated['contact_phone'] ?? null,

            'alt_phone'       => $validated['alt_phone'] ?? null,
            'principal_name'  => $validated['principal_name'] ?? null,
            'postal_code'     => $validated['postal_code'] ?? null,
            'website'         => $validated['website'] ?? null,

            'district'        => $validated['district'] ?? null,
            'province'        => $validated['province'] ?? null,
            'address'         => $validated['address'] ?? null,
            'contact_person'  => $validated['contact_person'] ?? null,

            'category'        => $validated['category'],
            'level'           => $validated['level'],

            'student_count'      => $validated['student_count'] ?? null,
            'teacher_count'      => $validated['teacher_count'] ?? null,
            'establishment_year' => $validated['establishment_year'] ?? null,

            'latitude'        => $validated['latitude'] ?? null,
            'longitude'       => $validated['longitude'] ?? null,

            'bank_name'      => $validated['bank_name'] ?? null,
            'account_holder' => $validated['account_holder'] ?? null,
            'bank_account'   => $validated['bank_account'] ?? null,

            'logo_url'       => $logoPath,
            'documents_url'  => $docPath,
            'updated_at'     => now(),
        ]);

        $row = DB::table('schools')->where('school_id', $schoolId)->first();

        // normalize for frontend
        $row->status = strtolower($row->status ?? 'inactive');
        $row->verified = (int)($row->verified ?? 0);
        $row->need_score = (float)($row->need_score ?? 0);
        $row->document_link = $row->documents_url ? url($row->documents_url) : null;
        $row->logo_link = $row->logo_url ? url($row->logo_url) : null;

        // ✅ AFTER snapshot
        $after = [
            'school_name'     => $row->school_name ?? null,
            'registration_no' => $row->registration_no ?? null,
            'contact_email'   => $row->contact_email ?? null,
            'contact_phone'   => $row->contact_phone ?? null,
            'district'        => $row->district ?? null,
            'province'        => $row->province ?? null,
            'address'         => $row->address ?? null,
            'logo_url'        => $row->logo_url ?? null,
            'documents_url'   => $row->documents_url ?? null,
        ];

        // optional: skip if nothing changed
        if ($before != $after) {
            // ✅ LEDGER
            app(LedgerService::class)->record(
                'SCHOOL_PROFILE_UPDATED',
                'school',
                (int)$schoolId,
                [
                    'school_id' => (int)$schoolId,
                    'before' => $before,
                    'after'  => $after,
                    'at' => now()->toDateTimeString(),
                ]
            );

            // ✅ ADMIN NOTIFICATION (DB insert style)
            DB::table('notifications')->insert([
                'id' => (string) Str::uuid(),
                'type' => 'admin',
                'notifiable_type' => 'admin',
                'notifiable_id' => 1,
                'data' => json_encode([
                    'title' => 'School profile updated',
                    'body'  => ($row->school_name ?? 'A school') . ' updated profile details.',
                    'school_id' => (int)$schoolId,
                    'school_name' => $row->school_name ?? null,
                    'time' => now()->toDateTimeString(),
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'read_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Profile updated', 'school' => $row]);
    });
}

public function changePassword(Request $request)
{
    $user = Auth::guard('school')->user();
    if (!$user) return response()->json(['message' => 'School not authenticated'], 401);

    $request->validate([
        'current_password' => 'required|string',
        'new_password' => 'required|string|min:6',
    ]);

    $row = DB::table('schools')->where('school_id', $user->school_id)->first();
    if (!$row) return response()->json(['message' => 'School not found'], 404);

    if (!Hash::check($request->current_password, $row->password_hash)) {
        return response()->json(['message' => 'Current password is incorrect'], 422);
    }

    DB::table('schools')->where('school_id', $user->school_id)->update([
        'password_hash' => Hash::make($request->new_password),
        'updated_at' => now(),
    ]);

    return response()->json(['message' => 'Password updated']);
}


public function getPrivacy()
{
    $user = Auth::guard('school')->user();
    if (!$user) return response()->json(['message' => 'School not authenticated'], 401);

    $row = DB::table('schools')->where('school_id', $user->school_id)->first();
    if (!$row) return response()->json(['message' => 'School not found'], 404);

    return response()->json([
        'privacy' => [
            'show_contact_public' => (int)($row->show_contact_public ?? 0),
            'show_donations_public' => (int)($row->show_donations_public ?? 0),
            'allow_donor_contact' => (int)($row->allow_donor_contact ?? 1),
        ]
    ]);
}

public function savePrivacy(Request $request)
{
    $user = Auth::guard('school')->user();
    if (!$user) return response()->json(['message' => 'School not authenticated'], 401);

    $data = $request->validate([
        'show_contact_public' => 'required|integer|in:0,1',
        'show_donations_public' => 'required|integer|in:0,1',
        'allow_donor_contact' => 'required|integer|in:0,1',
    ]);

    DB::table('schools')->where('school_id', $user->school_id)->update([
        'show_contact_public' => $data['show_contact_public'],
        'show_donations_public' => $data['show_donations_public'],
        'allow_donor_contact' => $data['allow_donor_contact'],
        'updated_at' => now(),
    ]);

    return response()->json(['message' => 'Privacy saved']);
}





public function exportDonations()
{
    $user = Auth::guard('school')->user();
    if (!$user) return response()->json(['message' => 'School not authenticated'], 401);

    $schoolId = $user->school_id;

    $rows = DB::table('donations')
        ->leftJoin('donation_requests', 'donations.request_id', '=', 'donation_requests.request_id')
        ->where('donation_requests.school_id', $schoolId)
        ->orderByDesc('donations.created_at')
        ->get([
            'donations.donation_id',
            'donations.request_id',
            'donation_requests.request_title',
            'donations.donor_name',
            'donations.donor_email',
            'donations.amount',
            'donations.status',
            'donations.created_at',
        ]);

    $headers = [
        "Content-Type" => "text/csv",
        "Content-Disposition" => "attachment; filename=donations.csv",
    ];

    return new StreamedResponse(function () use ($rows) {
        $out = fopen('php://output', 'w');
        fputcsv($out, ['donation_id','request_id','request_title','donor_name','donor_email','amount','status','created_at']);
        foreach ($rows as $r) {
            fputcsv($out, [(string)$r->donation_id,(string)$r->request_id,$r->request_title,$r->donor_name,$r->donor_email,(string)$r->amount,$r->status,$r->created_at]);
        }
        fclose($out);
    }, 200, $headers);
}

public function exportCampaigns()
{
    $user = Auth::guard('school')->user();
    if (!$user) return response()->json(['message' => 'School not authenticated'], 401);

    $rows = DB::table('donation_requests')
        ->where('school_id', $user->school_id)
        ->orderByDesc('created_at')
        ->get([
            'request_id',
            'request_title',
            'category',
            'quantity',
            'estimated_price',
            'amount_raised',
            'status',
            'created_at',
        ]);

    $headers = [
        "Content-Type" => "text/csv",
        "Content-Disposition" => "attachment; filename=campaigns.csv",
    ];

    return new StreamedResponse(function () use ($rows) {
        $out = fopen('php://output', 'w');
        fputcsv($out, ['request_id','request_title','category','quantity','estimated_price','amount_raised','status','created_at']);
        foreach ($rows as $r) {
            fputcsv($out, [(string)$r->request_id,$r->request_title,$r->category,(string)$r->quantity,(string)$r->estimated_price,(string)$r->amount_raised,$r->status,$r->created_at]);
        }
        fclose($out);
    }, 200, $headers);
}


public function deactivate()
{
    $user = Auth::guard('school')->user();
    if (!$user) return response()->json(['message' => 'School not authenticated'], 401);

    DB::table('schools')->where('school_id', $user->school_id)->update([
        'status' => 'Inactive',
        'updated_at' => now(),
    ]);

    return response()->json(['message' => 'Account deactivated']);
}
}