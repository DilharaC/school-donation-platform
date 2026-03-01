<?php

namespace App\Http\Controllers;

use App\Models\Donor;
use App\Models\Donation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use App\Services\LedgerService;

class DonorController extends Controller
{
    // NOTE: primaryKey belongs in the Model, not Controller.
    // protected $primaryKey = 'donor_id';

    public function register(Request $request)
    {
        $request->validate([
            'full_name' => 'required',
            'email' => 'required|email|unique:donors,email',
            'password' => 'required|min:6',
            'phone' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:255',
        ]);

        $donor = Donor::create([
            'full_name' => $request->full_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->phone,
            'address' => $request->address,
        ]);

        // ✅ LEDGER
        app(LedgerService::class)->record(
            'DONOR_REGISTERED',
            'donor',
            (int) $donor->donor_id,
            [
                'donor_id' => (int) $donor->donor_id,
                'full_name' => $donor->full_name,
                'email' => $donor->email,
                'phone' => $donor->phone,
                'created_at' => $donor->created_at?->toDateTimeString(),
            ]
        );

        return response()->json(['message' => 'Registration successful', 'donor' => $donor]);
    }

    // Admin dashboard list
    public function allDonors()
    {
        $donors = Donor::withCount(['donations as active_donations_count' => function ($q) {
            // NOTE: donations status in your project is usually paid/pending.
            // If you really have Approved in donations, keep it.
            $q->whereRaw("LOWER(status)='paid'"); // safer
        }])->get(['donor_id', 'full_name', 'email', 'phone', 'created_at']);

        $donors->transform(function ($donor) {
            $names = preg_split('/\s+/', trim((string)$donor->full_name));
            $donor->initials = strtoupper(substr($names[0] ?? 'D', 0, 1) . substr($names[1] ?? '', 0, 1));
            return $donor;
        });

        

        return response()->json($donors);
    }

    // ✅ GET /api/donor/me
    public function me(Request $request)
    {
        $donor = $request->user(); // if donor guard configured
        if (!$donor) return response()->json(['message' => 'Unauthenticated'], 401);

       

        return response()->json(['donor' => $donor]);
    }

    // ✅ POST /api/donor/me  (update profile)
    public function updateMe(Request $request)
    {
        $donor = $request->user();
        if (!$donor) return response()->json(['message' => 'Unauthenticated'], 401);

        // BEFORE snapshot
        $before = [
            'full_name' => $donor->full_name,
            'email' => $donor->email,
            'phone' => $donor->phone,
            'address' => $donor->address,
        ];

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

        // AFTER snapshot
        $after = [
            'full_name' => $donor->full_name,
            'email' => $donor->email,
            'phone' => $donor->phone,
            'address' => $donor->address,
        ];

        // ✅ LEDGER
        app(LedgerService::class)->record(
            'DONOR_PROFILE_UPDATED',
            'donor',
            (int) $donor->donor_id,
            [
                'donor_id' => (int) $donor->donor_id,
                'before' => $before,
                'after' => $after,
                'at' => now()->toDateTimeString(),
            ]
        );

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

        // ✅ LEDGER (never store the password itself)
        app(LedgerService::class)->record(
            'DONOR_PASSWORD_CHANGED',
            'donor',
            (int) $donor->donor_id,
            [
                'donor_id' => (int) $donor->donor_id,
                'at' => now()->toDateTimeString(),
            ]
        );

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

        $beforeStatus = $donor->status ?? null;

        if (isset($donor->status)) {
            $donor->status = 'Inactive';
            $donor->save();
        }

        if (method_exists($donor, 'tokens')) {
            $donor->tokens()->delete();
        }

        // ✅ LEDGER
        app(LedgerService::class)->record(
            'DONOR_DEACTIVATED',
            'donor',
            (int) $donor->donor_id,
            [
                'donor_id' => (int) $donor->donor_id,
                'before_status' => $beforeStatus,
                'after_status' => $donor->status ?? null,
                'at' => now()->toDateTimeString(),
            ]
        );

        return response()->json(['message' => 'Account deactivated']);
    }
}