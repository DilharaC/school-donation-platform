<?php

namespace App\Http\Controllers;

use App\Models\DonationRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\DonationRequestEvidence;
use Illuminate\Support\Facades\Auth;

class DonationRequestController extends Controller
{
    // Fetch projects (with pagination/search/filter)
    public function index(Request $request)
    {
        $search   = trim($request->query('search', ''));
        $category = $request->query('category', 'All');
        $status   = $request->query('status', null);
        $page     = max(1, (int) $request->query('page', 1));
        $limit    = max(1, min(50, (int) $request->query('limit', 6)));

        $query = DonationRequest::with('school');

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

        if ($status) {
            $query->where('status', $status);
        }

        // ✅ IMPORTANT: do NOT put orderBy before summary (summary must be clean)
        // ✅ Summary for ALL filtered rows (not just current page)
        $summary = (clone $query)->reorder()->selectRaw('
            COUNT(*) as total_requests,
            SUM(CASE WHEN status = "Approved" THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN status = "Pending" THEN 1 ELSE 0 END) as pending_count,
            COALESCE(SUM(amount_raised),0) as total_raised,
            COALESCE(SUM(estimated_price),0) as total_target
        ')->first();

        // ✅ Latest first (ONLY for list)
        $query->orderBy('created_at', 'desc');

        // pagination
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
                    'updated_at' => $project->updated_at,
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

    // ✅ GET single campaign detail (for View Drawer)
    public function show($id)
    {
        $project = DonationRequest::with(['school','evidences'])->find($id);

        if (!$project) {
            return response()->json(['message' => 'Donation request not found'], 404);
        }

        return response()->json([
            'project' => [
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

    // ✅ PUT update status (Approve / Mark Pending)
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:Approved,Pending',
        ]);

        $project = DonationRequest::find($id);

        if (!$project) {
            return response()->json(['message' => 'Donation request not found'], 404);
        }

        $project->status = $request->status;
        $project->save();

        return response()->json([
            'message' => 'Status updated successfully',
            'project' => [
                'request_id' => $project->request_id,
                'status' => $project->status,
            ]
        ]);
    }

    // Create project
    public function create(Request $request)
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

        $imageUrl = null;

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('donation_requests', 'public');
            $imageUrl = '/storage/' . $path;
        }

        $donationRequest = DonationRequest::create([
            'school_id' => $request->school_id,
            'request_title' => $request->request_title,
            'category' => $request->category,
            'quantity' => $request->quantity,
            'estimated_price' => $request->estimated_price,
            'description' => $request->description,
            'image_url' => $imageUrl,
            'document_url' => $request->document_url ? trim($request->document_url) : null,
            'status' => 'Pending'
        ]);

        return response()->json([
            'message' => 'Donation request created',
            'request' => $donationRequest
        ]);
    }

    // Delete project
    public function destroy($id)
    {
        $donationRequest = DonationRequest::find($id);

        if (!$donationRequest) {
            return response()->json(['message' => 'Donation request not found'], 404);
        }

        $donationRequest->delete();

        return response()->json(['message' => 'Donation request deleted successfully']);
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

        $project->update([
            'request_title' => $request->request_title,
            'category' => $request->category,
            'quantity' => $request->quantity,
            'estimated_price' => $request->estimated_price,
            'description' => $request->description,
            'image_url' => $imageUrl,
            'document_url' => $request->document_url ? trim($request->document_url) : null,
        ]);

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

        $dr = DonationRequest::find($id);
        if (!$dr) return response()->json(['message' => 'Request not found'], 404);

        $saved = [];

        foreach ($request->file('files') as $file) {
            $path = $file->store('donation_evidences', 'public');
            $url = '/storage/' . $path;

            $type = str_contains($file->getMimeType(), 'pdf') ? 'pdf' : 'image';

            $ev = DonationRequestEvidence::create([
                'request_id' => $dr->request_id,
                'file_url' => $url,
                'file_type' => $type,
                'note' => $request->note,
            ]);

            $saved[] = $ev;
        }

        return response()->json([
            'message' => 'Evidence uploaded',
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