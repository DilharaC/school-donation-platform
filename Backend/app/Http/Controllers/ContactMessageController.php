<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ContactMessage;

class ContactMessageController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'    => ['required', 'string', 'max:255'],
            'email'   => ['required', 'email', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $contact = ContactMessage::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Message sent successfully.',
            'data' => $contact,
        ], 201);
    }


    public function index(Request $request)
{
    $search = trim((string) $request->query('search', ''));
    $page = max(1, (int) $request->query('page', 1));
    $limit = max(1, min(50, (int) $request->query('limit', 10)));
    $sortBy = $request->query('sortBy', 'created_at');
    $sortDir = strtolower($request->query('sortDir', 'desc')) === 'asc' ? 'asc' : 'desc';

    $allowedSorts = ['created_at', 'name', 'email'];
    if (!in_array($sortBy, $allowedSorts, true)) {
        $sortBy = 'created_at';
    }

    $q = \App\Models\ContactMessage::query();

    if ($search !== '') {
        $q->where(function ($qq) use ($search) {
            $qq->where('name', 'like', "%{$search}%")
               ->orWhere('email', 'like', "%{$search}%")
               ->orWhere('message', 'like', "%{$search}%");
        });
    }

    $total = $q->count();

    $messages = $q->orderBy($sortBy, $sortDir)
        ->skip(($page - 1) * $limit)
        ->take($limit)
        ->get();

    return response()->json([
        'messages' => $messages,
        'total' => $total,
    ]);
}
}