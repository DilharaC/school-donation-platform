<?php

namespace App\Http\Controllers;

use App\Models\DonationRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\DonationRequestEvidence;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\LedgerService;
use App\Models\Donor;
use App\Notifications\EvidenceUploadedNotification;

use Illuminate\Support\Str;

class DonationRequestController extends Controller
{
public function index(Request $request)
{
    $search   = trim($request->query('search', ''));
    $category = $request->query('category', 'All');
    $page     = max(1, (int) $request->query('page', 1));
    $limit    = max(1, min(50, (int) $request->query('limit', 6)));

    $needBand = $request->query('needBand', 'all'); 
    $sortBy   = $request->query('sortBy', 'latest');
    $query = DonationRequest::with('school');
    $query->where('status', 'Approved');
    if ($search !== '') {
        $query->where(function ($q) use ($search) {
            $q->where('request_title', 'like', "%{$search}%")
              ->orWhere('description', 'like', "%{$search}%")
              ->orWhereHas('school', function ($q2) use ($search) {
                  $q2->where('school_name', 'like', "%{$search}%");
              });
        });
    }
    if ($category && $category !== 'All') {
        $query->where('category', $category);
    }
    if ($needBand === 'high') {
        $query->whereHas('school', fn ($q) => $q->where('need_score', '>=', 70));
    } elseif ($needBand === 'medium') {
        $query->whereHas('school', fn ($q) => $q->whereBetween('need_score', [40, 69.9999]));
    } elseif ($needBand === 'low') {
        $query->whereHas('school', fn ($q) => $q->where('need_score', '<', 40));
    }
    $summary = (clone $query)->reorder()->selectRaw('
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = "Approved" THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = "Pending" THEN 1 ELSE 0 END) as pending_count,
        COALESCE(SUM(amount_raised),0) as total_raised,
        COALESCE(SUM(estimated_price),0) as total_target
    ')->first();

    if ($sortBy === 'need_high' || $sortBy === 'need_low') {
        $dir = $sortBy === 'need_high' ? 'desc' : 'asc';
        $query->leftJoin('schools', 'donation_requests.school_id', '=', 'schools.school_id')
              ->select('donation_requests.*')
              ->orderBy('schools.need_score', $dir)
              ->orderBy('donation_requests.created_at', 'desc');
    } else {
        $query->orderBy('donation_requests.created_at', 'desc');
    }
    $total = (clone $query)->distinct('donation_requests.request_id')->count('donation_requests.request_id');
  $projects = (clone $query)
        ->skip(($page - 1) * $limit)
        ->take($limit)
        ->get()
        ->map(function ($project) {
            return [
                'request_id' => $project->request_id,
                'school_id' => $project->school_id,
                'school_name' => $project->school->school_name ?? 'Unknown School',
                'need_score' => (float) ($project->school->need_score ?? 0),
                'request_title' => $project->request_title,
                'category' => $project->category,
                'quantity' => (int)$project->quantity,
                'estimated_price' => (float)$project->estimated_price,
                'amount_raised' => (float)$project->amount_raised,
                'description' => $project->description,
                'image_url' => $project->image_url,
                'document_url' => $project->document_url,
                'status' => $project->status,
                'created_at' => $project->created_at,
                'updated_at' => $project->updated_at,
            ];
        });

    return response()->json([
        'projects' => $projects,
        'total' => (int)$total,
        'summary' => [
            'total_requests' => (int) ($summary->total_requests ?? 0),
            'approved_count' => (int) ($summary->approved_count ?? 0),
            'pending_count' => (int) ($summary->pending_count ?? 0),
            'total_raised' => (float) ($summary->total_raised ?? 0),
            'total_target' => (float) ($summary->total_target ?? 0),
        ],
    ]);
}
public function adminIndex(Request $request)
{
    $search   = trim($request->query('search', ''));
    $category = $request->query('category', 'All');
    $status   = $request->query('status', null); // ✅ admin can filter status
    $page     = max(1, (int) $request->query('page', 1));
    $limit    = max(1, min(50, (int) $request->query('limit', 10)));

    $needBand = $request->query('needBand', 'all');
    $sortBy   = $request->query('sortBy', 'latest');

    $query = DonationRequest::with('school');

    // ✅ ADMIN: show ALL (no forced Approved)

    if ($search !== '') {
        $query->where(function ($q) use ($search) {
            $q->where('request_title', 'like', "%{$search}%")
              ->orWhere('description', 'like', "%{$search}%")
              ->orWhereHas('school', function ($q2) use ($search) {
                  $q2->where('school_name', 'like', "%{$search}%");
              });
        });
    }

    if ($category && $category !== 'All') {
        $query->where('category', $category);
    }

    if ($status && $status !== 'All') {
        $query->where('status', $status);
    }

    if ($needBand === 'high') {
        $query->whereHas('school', fn ($q) => $q->where('need_score', '>=', 70));
    } elseif ($needBand === 'medium') {
        $query->whereHas('school', fn ($q) => $q->whereBetween('need_score', [40, 69.9999]));
    } elseif ($needBand === 'low') {
        $query->whereHas('school', fn ($q) => $q->where('need_score', '<', 40));
    }

    $summary = (clone $query)->reorder()->selectRaw('
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = "Approved" THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = "Pending" THEN 1 ELSE 0 END) as pending_count,
        COALESCE(SUM(amount_raised),0) as total_raised,
        COALESCE(SUM(estimated_price),0) as total_target
    ')->first();

    if ($sortBy === 'need_high' || $sortBy === 'need_low') {
        $dir = $sortBy === 'need_high' ? 'desc' : 'asc';
        $query->leftJoin('schools', 'donation_requests.school_id', '=', 'schools.school_id')
              ->select('donation_requests.*')
              ->orderBy('schools.need_score', $dir)
              ->orderBy('donation_requests.created_at', 'desc');
    } else {
        $query->orderBy('donation_requests.created_at', 'desc');
    }

    $total = (clone $query)->distinct('donation_requests.request_id')->count('donation_requests.request_id');

    $projects = (clone $query)
        ->skip(($page - 1) * $limit)
        ->take($limit)
        ->get()
        ->map(function ($project) {
            return [
                'request_id' => $project->request_id,
                'school_id' => $project->school_id,
                'school_name' => $project->school->school_name ?? 'Unknown School',
                'need_score' => (float) ($project->school->need_score ?? 0),
                'request_title' => $project->request_title,
                'category' => $project->category,
                'quantity' => (int)$project->quantity,
                'estimated_price' => (float)$project->estimated_price,
                'amount_raised' => (float)$project->amount_raised,
                'description' => $project->description,
                'image_url' => $project->image_url,
                'document_url' => $project->document_url,
                'status' => $project->status,
                'created_at' => $project->created_at,
                'updated_at' => $project->updated_at,
            ];
        });

    return response()->json([
        'projects' => $projects,
        'total' => (int)$total,
        'summary' => [
            'total_requests' => (int) ($summary->total_requests ?? 0),
            'approved_count' => (int) ($summary->approved_count ?? 0),
            'pending_count' => (int) ($summary->pending_count ?? 0),
            'total_raised' => (float) ($summary->total_raised ?? 0),
            'total_target' => (float) ($summary->total_target ?? 0),
        ],
    ]);
}
   // ✅ GET single campaign detail (for View Drawer)
public function show($id)
{
    $project = DonationRequest::with(['school','evidences'])->find($id);

    if (!$project) {
        return response()->json(['message' => 'Donation request not found'], 404);
    }

    $school = $project->school;

    return response()->json([
        'project' => [
            'request_id' => $project->request_id,
            'school_id' => $project->school_id,
            'school_name' => $school->school_name ?? 'Unknown School',

            // ✅ add school contact details
            'school' => [
                'school_id' => $school->school_id ?? null,
                'school_name' => $school->school_name ?? null,
                'contact_email' => $school->contact_email ?? null,
                'contact_phone' => $school->contact_phone ?? null,
                'address' => $school->address ?? null,
                'district' => $school->district ?? null,
                'province' => $school->province ?? null,
                'registration_no' => $school->registration_no ?? null,
            ],

            'request_title' => $project->request_title,
            'category' => $project->category,
            'quantity' => (int)$project->quantity,
            'estimated_price' => (float)$project->estimated_price,
            'amount_raised' => (float)$project->amount_raised,
            'description' => $project->description,
            'image_url' => $project->image_url,
            'document_url' => $project->document_url,
            'status' => $project->status,
            'created_at' => $project->created_at,
            'updated_at' => $project->updated_at,

            'evidences' => $project->evidences->map(fn($e) => [
                'id' => $e->id,
                'file_url' => $e->file_url,
                'file_type' => $e->file_type,
                'note' => $e->note,
                'created_at' => $e->created_at,
            ]),
        ]
    ]);
}

   public function updateStatus(Request $request, $id)
{
    $request->validate([
        'status' => 'required|in:Approved,Pending',
    ]);

    $project = DonationRequest::where('request_id', (int)$id)->first();

    if (!$project) {
        return response()->json(['message' => 'Donation request not found'], 404);
    }

   
    $old = $project->status;


    if ($old === $request->status) {
        return response()->json([
            'message' => 'Status already set',
            'project' => [
                'request_id' => (int)$project->request_id,
                'status' => $project->status,
            ]
        ]);
    }

    $project->status = $request->status;
    $project->save();

    // ✅ Ledger
    app(\App\Services\LedgerService::class)->record(
        'REQUEST_STATUS_UPDATED',
        'donation_request',
        (int)$project->request_id,
        [
            'request_id' => (int)$project->request_id,
            'school_id'  => (int)$project->school_id,
            'from'       => $old,
            'to'         => $project->status,
            'at'         => now()->toDateTimeString(),
        ]
    );

    return response()->json([
        'message' => 'Status updated successfully',
        'project' => [
            'request_id' => (int)$project->request_id,
            'status' => $project->status,
        ]
    ]);
}

    // Create project
  public function create(Request $request)
{
    $user = Auth::guard('school')->user();
    $schoolId = $user?->school_id;

    if (!$schoolId) {
        return response()->json(['message' => 'School not authenticated'], 401);
    }

    $request->validate([
        'request_title' => 'required|string|max:255',
        'category' => 'required|string|max:100',
        'quantity' => 'required|integer|min:1',
        'estimated_price' => 'required|numeric|min:0',
        'description' => 'required|string',
        'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
        'document_url' => 'nullable|string',
    ]);

    $imageUrl = null;

    if ($request->hasFile('image')) {
        $path = $request->file('image')->store('donation_requests', 'public');
        $imageUrl = '/storage/' . $path;
    }

    // ✅ Create donation request
    $donationRequest = DonationRequest::create([
        'school_id' => (int)$schoolId,
        'request_title' => $request->request_title,
        'category' => $request->category,
        'quantity' => (int)$request->quantity,
        'estimated_price' => (float)$request->estimated_price,
        'amount_raised' => 0,
        'description' => $request->description,
        'image_url' => $imageUrl,
        'document_url' => $request->document_url ? trim($request->document_url) : null,
        'status' => 'Pending',
    ]);

    // ==============================
    // ✅ LEDGER ENTRY
    // ==============================
    app(\App\Services\LedgerService::class)->record(
        'REQUEST_CREATED',
        'donation_request',
        (int)$donationRequest->request_id,
        [
            'request_id' => (int)$donationRequest->request_id,
            'school_id' => (int)$schoolId,
            'request_title' => (string)$donationRequest->request_title,
            'estimated_price' => (float)$donationRequest->estimated_price,
            'status' => 'Pending',
            'created_at' => now()->toDateTimeString(),
        ]
    );

    // ==============================
    // ✅ MANUAL ADMIN NOTIFICATION
    // ==============================
    DB::table('notifications')->insert([
        'id' => \Illuminate\Support\Str::uuid()->toString(),
        'type' => 'admin',
        'notifiable_type' => 'admin',
        'notifiable_id' => 1, // static admin
        'data' => json_encode([
            'title' => 'New Campaign Created',
            'body' => 'A school created a new donation request. Review and approve.',
            'request_id' => (int)$donationRequest->request_id,
            'school_id' => (int)$schoolId,
        ]),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return response()->json([
        'message' => 'Donation request created',
        'request' => $donationRequest
    ]);
}

   public function destroy($id)
{
    return DB::transaction(function () use ($id) {

        $donationRequest = DonationRequest::where('request_id', (int)$id)->first();

        if (!$donationRequest) {
            return response()->json(['message' => 'Donation request not found'], 404);
        }

        // ❌ Prevent delete if donations exist
        $hasPaidDonations = DB::table('donations')
            ->where('request_id', (int)$donationRequest->request_id)
            ->whereRaw("LOWER(status)='paid'")
            ->exists();

        if ($hasPaidDonations) {
            return response()->json([
                'message' => 'Cannot delete. This request already has donations.'
            ], 422);
        }

        // Save info for ledger before delete
        $snapshot = [
            'request_id' => (int)$donationRequest->request_id,
            'school_id' => (int)$donationRequest->school_id,
            'request_title' => $donationRequest->request_title,
            'category' => $donationRequest->category,
            'estimated_price' => (float)$donationRequest->estimated_price,
            'amount_raised' => (float)$donationRequest->amount_raised,
            'status' => $donationRequest->status,
        ];

        // Delete evidences first
        DB::table('donation_request_evidences')
            ->where('request_id', (int)$donationRequest->request_id)
            ->delete();

        // Delete request
        $donationRequest->delete();

        // ✅ Ledger entry
        app(LedgerService::class)->record(
            'DONATION_REQUEST_DELETED',
            'donation_request',
            (int)$snapshot['request_id'],
            [
                'deleted_request' => $snapshot,
                'at' => now()->toDateTimeString(),
            ]
        );

        // ✅ Notify admin
        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => 'admin',
            'notifiable_type' => 'admin',
            'notifiable_id' => 1,
            'data' => json_encode([
                'title' => 'Campaign deleted',
                'body' => 'A campaign was deleted by the school.',
                'request_id' => (int)$snapshot['request_id'],
                'school_id' => (int)$snapshot['school_id'],
                'request_title' => $snapshot['request_title'],
                'time' => now()->toDateTimeString(),
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Donation request deleted successfully'
        ]);
    });
}

    public function update(Request $request, $id)
    {
        $request->validate([
            'school_id' => 'required|exists:schools,school_id',
            'request_title' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'quantity' => 'required|integer|min:1',
            'estimated_price' => 'required|numeric|min:0',
            'description' => 'required|string',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'document_url' => 'nullable|string',
        ]);

        $project = DonationRequest::find($id);

        if (!$project) {
            return response()->json(['message' => 'Donation request not found'], 404);
        }

        if ((int)$project->school_id !== (int)$request->school_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($project->status === 'Approved') {
            return response()->json(['message' => 'Approved requests cannot be edited'], 422);
        }

        $imageUrl = $project->image_url;

        if ($request->hasFile('image')) {
            if ($project->image_url && str_starts_with($project->image_url, '/storage/')) {
                $oldPath = str_replace('/storage/', '', $project->image_url);
                Storage::disk('public')->delete($oldPath);
            }

            $path = $request->file('image')->store('donation_requests', 'public');
            $imageUrl = '/storage/' . $path;
        }
$before = [
  'title' => $project->request_title,
  'category' => $project->category,
  'quantity' => (int)$project->quantity,
  'estimated_price' => (float)$project->estimated_price,
  'description' => $project->description,
  'image_url' => $project->image_url,
  'document_url' => $project->document_url,
];

        $project->update([
            'request_title' => $request->request_title,
            'category' => $request->category,
            'quantity' => $request->quantity,
            'estimated_price' => $request->estimated_price,
            'description' => $request->description,
            'image_url' => $imageUrl,
            'document_url' => $request->document_url ? trim($request->document_url) : null,
        ]);
        app(\App\Services\LedgerService::class)->record(
    'REQUEST_UPDATED',
    'donation_request',
    (int)$project->request_id,
    [
        'request_id' => (int)$project->request_id,
        'school_id' => (int)$project->school_id,
        'before' => $before,
        'after' => [
          'title' => $project->request_title,
          'category' => $project->category,
          'quantity' => (int)$project->quantity,
          'estimated_price' => (float)$project->estimated_price,
          'description' => $project->description,
          'image_url' => $project->image_url,
          'document_url' => $project->document_url,
        ],
        'at' => now()->toDateTimeString(),
    ]
);

        return response()->json([
            'message' => 'Donation request updated successfully',
            'project' => [
                'request_id' => $project->request_id,
                'school_id' => $project->school_id,
                'request_title' => $project->request_title,
                'category' => $project->category,
                'quantity' => $project->quantity,
                'estimated_price' => $project->estimated_price,
                'description' => $project->description,
                'image_url' => $project->image_url,
                'document_url' => $project->document_url,
                'status' => $project->status,
                'updated_at' => $project->updated_at,
            ]
        ]);
    }

 public function uploadEvidence(Request $request, $id)
{
    $request->validate([
        'files' => 'required',
        'files.*' => 'file|mimes:jpg,jpeg,png,webp,pdf|max:8192',
        'note' => 'nullable|string|max:255',
    ]);

    $dr = DonationRequest::where('request_id', (int)$id)->first();
    if (!$dr) return response()->json(['message' => 'Request not found'], 404);

    $saved = [];

    foreach ($request->file('files') as $file) {
        $path = $file->store('donation_evidences', 'public');
        $url  = '/storage/' . $path;

        $type = str_contains($file->getMimeType(), 'pdf') ? 'pdf' : 'image';

        $ev = DonationRequestEvidence::create([
            'request_id' => (int)$dr->request_id,
            'file_url'   => $url,
            'file_type'  => $type,
            'note'       => $request->note,
        ]);

      
        app(\App\Services\LedgerService::class)->record(
            'REQUEST_EVIDENCE_UPLOADED',
            'donation_request_evidence',
            (int)$ev->id,
            [
                'evidence_id' => (int)$ev->id,
                'request_id'  => (int)$ev->request_id,
                'file_url'    => $ev->file_url,
                'file_type'   => $ev->file_type,
                'note'        => $ev->note,
                'at'          => now()->toDateTimeString(),
            ]
        );

        $saved[] = $ev;
    }

    $donorIds = DB::table('donations')
        ->where('request_id', (int)$dr->request_id)
        ->whereRaw("LOWER(status)='paid'")
        ->whereNotNull('donor_id')
        ->distinct()
        ->pluck('donor_id');

    if ($donorIds->count() > 0) {
        $title = 'New spending proof uploaded';
        $body  = 'The school uploaded new invoice/receipt/proof for your supported request: '
            . ($dr->request_title ?? ('Request #' . $dr->request_id));

        $now = now();
        $rows = [];
        foreach ($donorIds as $donorId) {
            $rows[] = [
                'id' => (string) Str::uuid(),

                'type' => 'App\\Notifications\\EvidenceUploadedNotification',
                'notifiable_type' => 'App\\Models\\Donor',
                'notifiable_id' => (int) $donorId,

                'data' => json_encode([
                    'title' => $title,
                    'body' => $body,
                    'request_id' => (int)$dr->request_id,
                    'school_id' => (int)$dr->school_id,
                    'evidence_count' => count($saved),
                    'time' => $now->toDateTimeString(),
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),

                'read_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('notifications')->insert($rows);

        // ✅ optional: ledger that donors were notified
        app(\App\Services\LedgerService::class)->record(
            'DONORS_NOTIFIED_EVIDENCE_UPLOADED',
            'donation_request',
            (int)$dr->request_id,
            [
                'request_id' => (int)$dr->request_id,
                'donors_notified' => (int)$donorIds->count(),
                'evidence_uploaded' => (int)count($saved),
                'at' => $now->toDateTimeString(),
            ]
        );
    }

    return response()->json([
        'message'   => 'Evidence uploaded',
        'evidences' => $saved
    ]);
}
    public function listEvidences($id)
    {
        $dr = DonationRequest::find($id);
        if (!$dr) return response()->json(['message' => 'Request not found'], 404);

        $evidences = DonationRequestEvidence::where('request_id', $dr->request_id)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json(['evidences' => $evidences]);
    }

    public function deleteEvidence($evidenceId)
    {
        $ev = DonationRequestEvidence::find($evidenceId);

        if (!$ev) {
            return response()->json(['message' => 'Evidence not found'], 404);
        }

        if ($ev->file_url && str_starts_with($ev->file_url, '/storage/')) {
            $path = str_replace('/storage/', '', $ev->file_url);
            Storage::disk('public')->delete($path);
        }
app(\App\Services\LedgerService::class)->record(
    'REQUEST_EVIDENCE_DELETED',
    'donation_request_evidence',
    (int)$ev->id,
    [
        'evidence_id' => (int)$ev->id,
        'request_id' => (int)$ev->request_id,
        'file_url' => $ev->file_url,
        'file_type' => $ev->file_type,
        'note' => $ev->note,
        'at' => now()->toDateTimeString(),
    ]
);
        $ev->delete();

        return response()->json(['message' => 'Evidence deleted']);
    }

    // ✅ My Requests (only this school)
    public function myIndex(Request $request)
    {
        $user = Auth::guard('school')->user();
        $schoolId = $user?->school_id;

        if (!$schoolId) {
            return response()->json(['message' => 'School not authenticated'], 401);
        }

        $search   = trim($request->query('search', ''));
        $category = $request->query('category', 'All');
        $status   = $request->query('status', null);
        $page     = max(1, (int) $request->query('page', 1));
        $limit    = max(1, min(50, (int) $request->query('limit', 6)));

        $query = DonationRequest::with('school')->where('school_id', $schoolId);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('request_title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($category && $category !== 'All') {
            $query->where('category', $category);
        }

        if ($status) {
            $query->where('status', $status);
        }

        // ✅ summary without ORDER BY (fix SQLSTATE 1140)
        $summary = (clone $query)->reorder()->selectRaw('
            COUNT(*) as total_requests,
            SUM(CASE WHEN status = "Approved" THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN status = "Pending" THEN 1 ELSE 0 END) as pending_count,
            COALESCE(SUM(amount_raised),0) as total_raised,
            COALESCE(SUM(estimated_price),0) as total_target
        ')->first();

        // ✅ list order only
        $query->orderBy('created_at', 'desc');

        $total = (clone $query)->count();

        $projects = (clone $query)
            ->skip(($page - 1) * $limit)
            ->take($limit)
            ->get()
            ->map(function ($project) {
                return [
                    'request_id' => $project->request_id,
                    'school_id' => $project->school_id,
                    'school_name' => $project->school->school_name ?? 'Unknown School',
                    'request_title' => $project->request_title,
                    'category' => $project->category,
                    'quantity' => (int)$project->quantity,
                    'estimated_price' => (float)$project->estimated_price,
                    'amount_raised' => (float)$project->amount_raised,
                    'description' => $project->description,
                    'image_url' => $project->image_url,
                    'document_url' => $project->document_url,
                    'status' => $project->status,
                    'created_at' => $project->created_at,
                ];
            });

        return response()->json([
            'projects' => $projects,
            'total' => $total,
            'summary' => [
                'total_requests' => (int) ($summary->total_requests ?? 0),
                'approved_count' => (int) ($summary->approved_count ?? 0),
                'pending_count' => (int) ($summary->pending_count ?? 0),
                'total_raised' => (float) ($summary->total_raised ?? 0),
                'total_target' => (float) ($summary->total_target ?? 0),
            ],
        ]);
    }
}