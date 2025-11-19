<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\School;
use App\Models\Donor;
use Illuminate\Support\Facades\Session;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->only(['identifier', 'password']);
        $identifier = $data['identifier'];
        $password = $data['password'];

        // Check school first
        $school = School::where('registration_no', $identifier)->first();
        if ($school) {
            if (!Hash::check($password, $school->password_hash)) {
                return response()->json(['success' => false, 'message' => 'Incorrect password']);
            } elseif (!$school->verified) {
                return response()->json(['success' => false, 'message' => 'Account not verified']);
            } else {
                // Save session
                Session::put('user_type', 'school');
                Session::put('school_id', $school->id);
                Session::put('school_name', $school->school_name);
                Session::put('logo_url', $school->logo_url);

                return response()->json([
                    'success' => true,
                    'user' => [
                        'userType' => 'school',
                        'schoolName' => $school->school_name,
                        'logoUrl' => $school->logo_url
                    ]
                ]);
            }
        }

        // Check donor
        $donor = Donor::where('email', $identifier)->first();
        if ($donor) {
            if (!Hash::check($password, $donor->password)) {
                return response()->json(['success' => false, 'message' => 'Incorrect password']);
            } else {
                Session::put('user_type', 'donor');
                Session::put('donor_id', $donor->id);
                Session::put('donor_name', $donor->full_name);

                return response()->json([
                    'success' => true,
                    'user' => [
                        'userType' => 'donor',
                        'donorName' => $donor->full_name,
                        'email' => $donor->email,
                        'phone' => $donor->phone,
                        'address' => $donor->address
                    ]
                ]);
            }
        }

        return response()->json(['success' => false, 'message' => 'User not found']);
    }

    public function logout(Request $request)
    {
        Session::flush(); // clears all session data
        return response()->json(['success' => true, 'message' => 'Logged out']);
    }
}
