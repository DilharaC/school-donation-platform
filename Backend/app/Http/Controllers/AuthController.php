<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use App\Models\Donor;
use App\Models\School;
use App\Models\Ministry;

class AuthController extends Controller
{
    public function csrfCookie()
    {
        return response()->json([
            'csrf' => csrf_token(),
            'session_id' => session()->getId()
        ]);
    }

  public function login(Request $request)
{
    $request->validate([
        'identifier' => 'required|string',
        'password'   => 'required|string',
    ]);

    $identifier = trim($request->identifier);
    $password   = $request->password;

    $user = null;
    $type = null;

    // 1) Donor login by email
    $donor = Donor::where('email', $identifier)->first();
    if ($donor) {
        $user = $donor;
        $type = "donor";
    }

    // 2) Ministry login by email
    if (!$user) {
        $ministry = Ministry::where('email', $identifier)->first();
        if ($ministry) {
            if (isset($ministry->is_active) && (int)$ministry->is_active !== 1) {
                return response()->json([
                    "success" => false,
                    "message" => "Ministry account is not active."
                ], 403);
            }

            $user = $ministry;
            $type = "ministry";
        }
    }

    // 3) School login ONLY by registration_no
    if (!$user) {
        $school = School::where('registration_no', $identifier)->first();
        if ($school) {
            $isActive =
                (isset($school->is_active) && (int)$school->is_active === 1) ||
                (isset($school->status) && strtolower((string)$school->status) === 'active') ||
                (isset($school->verified) && (int)$school->verified === 1);

            if (!$isActive) {
                return response()->json([
                    "success" => false,
                    "message" => "School account is not active. Please wait for admin approval."
                ], 403);
            }

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

    $hashed = $user->password ?? $user->password_hash;

    if (!Hash::check($password, $hashed)) {
        return response()->json([
            "success" => false,
            "message" => "Incorrect password"
        ], 401);
    }

    // login using correct guard
    if ($type === 'school') {
        Auth::guard('school')->login($user);
    } elseif ($type === 'ministry') {
        Auth::guard('ministry')->login($user);
    } else {
        Auth::guard('web')->login($user); // donor
    }

    return response()->json([
        "success" => true,
        "user" => [
            "userType" => $type,
            "id"       => $user->id,
            "name"     => $type === "donor" ? $user->full_name : ($type === "school" ? $user->school_name : $user->name),
            "email"    => in_array($type, ["donor","ministry"]) ? $user->email : null,
        ]
    ]);
}
    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        Auth::guard('school')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['success' => true]);
    }
}