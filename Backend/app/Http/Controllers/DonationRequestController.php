<?php

namespace App\Http\Controllers;

use App\Models\DonationRequest;
use Illuminate\Http\Request;

class DonationRequestController extends Controller
{
    // Fetch projects
    public function index(Request $request)
    {
        $search = $request->query('search', '');
        $category = $request->query('category', 'All');
        $page = (int) $request->query('page', 1);
        $limit = (int) $request->query('limit', 6);

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
            ];
        });

        return response()->json([
            'projects' => $projects,
            'total' => $total,
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
}
