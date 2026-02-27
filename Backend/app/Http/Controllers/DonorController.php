<?php

namespace App\Http\Controllers;

use App\Models\Donor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class DonorController extends Controller
{
        protected $primaryKey = 'donor_id';

    public function register(Request $request)
    {
        $request->validate([
            'full_name' => 'required',
            'email' => 'required|email|unique:donors,email',
            'password' => 'required',
        ]);

        $donor = Donor::create([
            'full_name' => $request->full_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->phone,
            'address' => $request->address,
        ]);

        return response()->json(['message' => 'Registration successful', 'donor' => $donor]);
    }
   public function allDonors()
{
    $donors = Donor::withCount(['donations as active_donations_count' => function ($q) {
        $q->where('status', 'Approved'); // count only active/completed donations
    }])->get(['donor_id', 'full_name', 'email', 'phone', 'created_at']);

    // Add initials for frontend display
    $donors->transform(function ($donor) {
        $names = explode(' ', $donor->full_name);
        $donor->initials = strtoupper(substr($names[0], 0, 1) . (isset($names[1]) ? substr($names[1], 0, 1) : ''));
        return $donor;
    });

    return response()->json($donors);
}

 // ✅ GET /api/donor/me
    public function me(Request $request)
    {
        $donor = $request->user(); // donor guard if configured, otherwise default
        if (!$donor) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        return response()->json(['donor' => $donor]);
    }

    // ✅ POST /api/donor/me  (update profile)
    public function updateMe(Request $request)
    {
        $donor = $request->user();
        if (!$donor) return response()->json(['message' => 'Unauthenticated'], 401);

        $request->validate([
            'full_name' => 'required|string|max:150',
            'email' => 'required|email|unique:donors,email,' . $donor->donor_id . ',donor_id',
            'phone' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:255',
        ]);

        $donor->full_name = $request->full_name;
        $donor->email = $request->email;
        $donor->phone = $request->phone;
        $donor->address = $request->address;
        $donor->save();

        return response()->json(['message' => 'Profile updated', 'donor' => $donor]);
    }

    // ✅ POST /api/donor/security/change-password
    public function changePassword(Request $request)
    {
        $donor = $request->user();
        if (!$donor) return response()->json(['message' => 'Unauthenticated'], 401);

        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        if (!Hash::check($request->current_password, $donor->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $donor->password = Hash::make($request->new_password);
        $donor->save();

        return response()->json(['message' => 'Password updated']);
    }

    // ✅ GET /api/donor/exports/donations  (CSV download)
    public function exportDonations(Request $request)
    {
        $donor = $request->user();
        if (!$donor) return response()->json(['message' => 'Unauthenticated'], 401);

        $filename = "my_donations.csv";

        $response = new StreamedResponse(function () use ($donor) {
            $out = fopen('php://output', 'w');

            // header row
            fputcsv($out, [
                'donation_id', 'request_id', 'amount', 'status', 'created_at',
                'message', 'anonymous'
            ]);

            Donation::where('donor_id', $donor->donor_id)
                ->orderByDesc('donation_id')
                ->chunk(200, function ($rows) use ($out) {
                    foreach ($rows as $d) {
                        fputcsv($out, [
                            $d->donation_id,
                            $d->request_id,
                            $d->amount,
                            $d->status,
                            $d->created_at,
                            $d->message,
                            $d->anonymous,
                        ]);
                    }
                });

            fclose($out);
        });

        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', "attachment; filename={$filename}");

        return $response;
    }

    // ✅ POST /api/donor/deactivate
    public function deactivate(Request $request)
    {
        $donor = $request->user();
        if (!$donor) return response()->json(['message' => 'Unauthenticated'], 401);

        // If you have "status" column in donors table
        if (isset($donor->status)) {
            $donor->status = 'Inactive';
            $donor->save();
        }

        // Optional: revoke tokens if using Sanctum tokens
        if (method_exists($donor, 'tokens')) {
            $donor->tokens()->delete();
        }

        return response()->json(['message' => 'Account deactivated']);
    }

}

