<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\School;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

class SchoolController extends Controller
{
    /**
     * Register a new school and get AI-generated need_score
     */
    public function register(Request $request)
{
    // Validate incoming data
    $validated = $request->validate([
        'school_name'     => 'required|string|max:255',
        'registration_no' => 'required|string|unique:schools',
        'contact_email'   => 'required|email|unique:schools',
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
    ]);

    // Step 1: Create school record with temporary need_score = 0
    $school = School::create([
        'school_name'    => $validated['school_name'],
        'registration_no'=> $validated['registration_no'],
        'category'       => $validated['category'] ?? null,
        'district'       => $validated['district'] ?? null,
        'province'       => $validated['province'] ?? null,
        'contact_person' => $validated['contact_person'] ?? null,
        'address'        => $validated['address'] ?? null,
        'contact_email'  => $validated['contact_email'],
        'contact_phone'  => $validated['contact_phone'] ?? null,
        'logo_url'       => null,
        'bank_name'      => $validated['bank_name'] ?? null,
        'account_holder' => $validated['account_holder'] ?? null,
        'bank_account'   => $validated['bank_account'] ?? null,
        'password_hash'  => Hash::make($validated['password']),
        'student_count'  => $validated['student_count'],
        'facilities'     => $validated['facilities'],
        'area_type'      => $validated['area_type'],
        'performance'    => $validated['performance'],
        'prev_donations' => $validated['prev_donations'],
        'need_score'     => 0,
        'verified'       => 0,
        'status'         => 'Inactive',
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

        // Debug: show raw response
        \Log::info('Flask API raw response: ' . $response->body());

        if ($response->successful() && isset($response->json()['need_score'])) {
            $needScore = (float) $response->json()['need_score'];
            \Log::info('Need Score from Flask: ' . $needScore);

            $school->need_score = $needScore;

            $saved = $school->save(); // save updated score
            \Log::info('School save result: ' . ($saved ? 'success' : 'failed'));

            // Reload school from DB
            $school->refresh();
            \Log::info('School after save: ' . $school->need_score);

        } else {
            \Log::error('Flask API returned invalid data: ' . $response->body());
        }
    } catch (\Exception $e) {
        \Log::error('Flask API call failed: ' . $e->getMessage());
    }

    // Step 3: Return JSON response
    return response()->json([
        'success' => true,
        'message' => 'School registered successfully!',
        'school'  => $school
    ], 201);
}

}
