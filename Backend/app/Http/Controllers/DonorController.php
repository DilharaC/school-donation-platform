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
    $donors = Donor::all(['donor_id', 'full_name', 'email', 'phone', 'created_at']);

    // Add initials for frontend display (optional)
    $donors->transform(function ($donor) {
        $names = explode(' ', $donor->full_name);
        $donor->initials = strtoupper(substr($names[0], 0, 1) . (isset($names[1]) ? substr($names[1], 0, 1) : ''));
        return $donor;
    });

    return response()->json($donors);
}
}

