<?php

namespace App\Http\Controllers;

use App\Models\Donor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class DonorController extends Controller
{
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
}

