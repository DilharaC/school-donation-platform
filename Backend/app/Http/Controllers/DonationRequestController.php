<?php

namespace App\Http\Controllers;

use App\Models\DonationRequest;
use Illuminate\Http\Request;

class DonationRequestController extends Controller
{
    // Fetch projects (with pagination/search/filter)
    public function index(Request $request)
    {
        $search   = $request->query('search', '');
        $category = $request->query('category', 'All');
        $status   = $request->query('status', null); // ✅ ADD THIS
        $page     = (int) $request->query('page', 1);
        $limit    = (int) $request->query('limit', 6);

        $query = DonationRequest::with('school');

        // Search by title, description, or school name
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('request_title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('school', function ($q2) use ($search) {
                      $q2->where('school_name', 'like', "%{$search}%");
                  });
            });
        }

        // Filter by category
        if ($category && $category !== 'All') {
            $query->where('category', $category);
        }

        // ✅ Filter by status (Approved / Pending)
        if ($status) {
            $query->where('status', $status);
        }

        $total = $query->count();

        $projects = $query->skip(($page - 1) * $limit)
                          ->take($limit)
                          ->get();

        // Map to include school_name safely
        $projects = $projects->map(function ($project) {
            return [
                'request_id' => $project->request_id,
                'school_id' => $project->school_id,
                'school_name' => $project->school->school_name ?? 'Unknown School',
                'request_title' => $project->request_title,
                'category' => $project->category,
                'quantity' => $project->quantity,
                'estimated_price' => $project->estimated_price,
                'amount_raised' => $project->amount_raised,
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
        ]);
    }

    // ✅ GET single campaign detail (for View Drawer)
    public function show($id)
    {
        $project = DonationRequest::with('school')->find($id);

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
                'quantity' => $project->quantity,
                'estimated_price' => $project->estimated_price,
                'amount_raised' => $project->amount_raised,
                'description' => $project->description,
                'image_url' => $project->image_url,
                'document_url' => $project->document_url,
                'status' => $project->status,
                'created_at' => $project->created_at,
                'updated_at' => $project->updated_at,
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
            'request_title' => 'required',
            'category' => 'required',
            'quantity' => 'required|integer',
            'estimated_price' => 'required|numeric',
            'description' => 'required'
        ]);

        $donationRequest = DonationRequest::create([
            'school_id' => $request->school_id,
            'request_title' => $request->request_title,
            'category' => $request->category,
            'quantity' => $request->quantity,
            'estimated_price' => $request->estimated_price,
            'description' => $request->description,
            'image_url' => $request->image_url,
            'document_url' => $request->document_url,
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
            return response()->json([
                'message' => 'Donation request not found'
            ], 404);
        }

        $donationRequest->delete();

        return response()->json([
            'message' => 'Donation request deleted successfully'
        ]);
    }
}