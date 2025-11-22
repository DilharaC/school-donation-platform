<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DonorController;
use App\Http\Controllers\SchoolController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DonationController;
use App\Http\Controllers\DonationRequestController;

// -----------------------------
// CSRF Route
// -----------------------------
Route::middleware('web')->get('/sanctum/csrf-cookie', function () {
    return response()->json(['status' => 'csrf cookie set']);
});


// -----------------------------
// Public routes (with web middleware for session support)
// -----------------------------
Route::middleware('web')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::post('/donor/register', [DonorController::class, 'register']);
Route::post('/school/register', [SchoolController::class, 'register']);
Route::get('/donation_requests', [DonationRequestController::class, 'index']);
Route::post('/request/create', [DonationRequestController::class, 'create']);
Route::post('/stripe/webhook', [DonationController::class, 'stripeWebhook']);
Route::get('/donations/verify', [DonationController::class, 'verifySession']);

// -----------------------------
// Protected routes (must be authenticated)
// -----------------------------
Route::middleware(['web', 'auth:sanctum'])->group(function () {
     
    Route::post('/donations/create', [DonationController::class, 'createDonation']);
    
    Route::get('/user', function (Request $request) {
        $user = $request->user();
        $type = $user instanceof \App\Models\Donor ? 'donor' : 'school';
        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'userType' => $type,
                'name' => $type === 'donor' ? $user->full_name : $user->school_name,
                'email' => $user->email,
                'phone' => $user->phone ?? null,
                'address' => $user->address ?? null,
                'logoUrl' => $user->logo_url ?? null,
            ]
        ]);
    });
});
