<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use App\Models\Donor;
use App\Models\School;

class AuthController extends Controller
{
    // CSRF endpoint
    public function csrfCookie()
    {
        return response()->json([
            'csrf' => csrf_token(),
            'session_id' => session()->getId()
        ]);
    }

    // Login without userType (auto detect from identifier)
    public function login(Request $request)
    {
        $request->validate([
            'identifier' => 'required|string',
            'password' => 'required|string',
        ]);

        $identifier = $request->identifier;
        $password = $request->password;

        $user = null;
        $type = null;

        // Try donor first
        $donor = Donor::where('email', $identifier)->first();

        if ($donor) {
            $user = $donor;
            $type = "donor";
        }

        // If no donor found → try school (email or registration_no)
        if (!$user) {
            $school = School::where('email', $identifier)
                            ->orWhere('registration_no', $identifier)
                            ->first();

            if ($school) {
                $user = $school;
                $type = "school";
            }
        }

        if (!$user) {
            return response()->json([
                "success" => false,
                "message" => "User not found"
            ], 404);
        }

        // Correct password field detection
        $hashed = $user->password ?? $user->password_hash;

        if (!Hash::check($password, $hashed)) {
            return response()->json([
                "success" => false,
                "message" => "Incorrect password"
            ], 401);
        }

        // Sanctum login session
        Auth::login($user);

        return response()->json([
            "success" => true,
            "user" => [
                "userType" => $type,
                "id"       => $user->id,
                "name"     => $type === "donor" ? $user->full_name : $user->school_name,
                "email"    => $user->email,
                "phone"    => $user->phone ?? null,
                "address"  => $user->address ?? null,
                "logoUrl"  => $user->logo_url ?? null,
            ]
        ]);
    }

   public function logout(Request $request)
{
    Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return response()->json(['success' => true]);
}
}
