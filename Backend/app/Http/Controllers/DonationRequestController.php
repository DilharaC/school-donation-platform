<?php

namespace App\Http\Controllers;

use App\Models\DonationRequest;
use Illuminate\Http\Request;

class DonationRequestController extends Controller
{
    // Fetch projects (GET)
    public function index(Request $request)
    {
        $search = $request->query('search', '');
        $category = $request->query('category', 'All');
        $page = $request->query('page', 1);
        $limit = $request->query('limit', 6);

        $query = DonationRequest::query();

        // Search by title or description
        if ($search) {
            $query->where('request_title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        }

        // Filter by category
        if ($category && $category !== 'All') {
            $query->where('category', $category);
        }

        $total = $query->count();

        // Pagination
        $projects = $query->skip(($page - 1) * $limit)
                          ->take($limit)
                          ->get();

        return response()->json([
            'projects' => $projects,
            'total' => $total
        ]);
    }

    // Create project (POST)
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

        return response()->json(['message' => 'Donation request created', 'request' => $donationRequest]);
    }
}
