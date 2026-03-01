<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DonorController;
use App\Http\Controllers\SchoolController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DonationController;
use App\Http\Controllers\DonationRequestController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MinistryController;
use App\Http\Controllers\LedgerController;
use App\Http\Controllers\NotificationController;

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
Route::get('/recent-donors', [DonationController::class, 'recentDonors']);
Route::get('/donation-trends', [DonationController::class, 'donationTrends']);
Route::get('/analytics/schools-map', [DonationController::class, 'schoolsDonationMap']);
Route::get('/registered-donors', [DonorController::class, 'allDonors']);
// routes/api.php




Route::get('/notifications', [NotificationController::class, 'index']);
Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']); // optional


Route::get('/admin/ledger', [LedgerController::class, 'index']);   // list + filters + pagination
Route::get('/admin/ledger/{id}', [LedgerController::class, 'show']); // optional: view one entry
Route::get('/donors-active', [DonationController::class, 'donorsWithActiveDonations']);

Route::get('/all-donors', [DonationController::class, 'allDonorsWithStats']);

Route::get('/schools-donations', [SchoolController::class, 'schoolsWithDonations']);

Route::get('/donation_requests/{id}', [DonationRequestController::class, 'show']);
Route::put('/donation_requests/{id}/status', [DonationRequestController::class, 'updateStatus']);

Route::get('/donation_requests/{id}/donations', [DonationController::class, 'donationsByRequest']);
Route::get('/donor/my-donations', [DonationController::class, 'myDonations']);


Route::get('/dashboard/kpis-today-weekly', [DashboardController::class, 'kpisTodayWithWeeklyChange']);

Route::get('/donation_requests/{id}/evidences', [DonationRequestController::class, 'listEvidences']);

Route::get('/donations', [DonationController::class, 'listDonations']);
Route::post('/donation_requests/{id}/evidences', [DonationRequestController::class, 'uploadEvidence']);
Route::delete('/donation_request_evidences/{id}', [DonationRequestController::class, 'deleteEvidence']);
Route::get('/donations/{id}/receipt', [DonationController::class, 'receipt']);
// routes/api.php
Route::get('/donor/overview', [\App\Http\Controllers\DonationController::class, 'donorOverview']);

Route::middleware('auth:school')->group(function () {
    Route::get('/school/me', [SchoolController::class, 'me']);
    Route::post('/school/me', [SchoolController::class, 'updateMe']); // use POST for multipart (file upload)
     Route::get('/my-requests', [DonationRequestController::class, 'myIndex']);

       // ✅ settings APIs
    Route::post('/school/security/change-password', [SchoolController::class, 'changePassword']);

    Route::get('/school/privacy', [SchoolController::class, 'getPrivacy']);
    Route::post('/school/privacy', [SchoolController::class, 'savePrivacy']);
     Route::delete('/my-requests/{id}', [DonationRequestController::class, 'destroy']);

    Route::get('/school/exports/donations', [SchoolController::class, 'exportDonations']);
    Route::get('/school/exports/campaigns', [SchoolController::class, 'exportCampaigns']);

    Route::post('/school/deactivate', [SchoolController::class, 'deactivate']);
});

Route::post('/donation_requests/{id}/update', [DonationRequestController::class, 'update']);

Route::get('/reports/summary', [DonationController::class, 'reportsSummary']);
Route::get('/reports/trends', [DonationController::class, 'reportsTrends']);
Route::get('/reports/top-provinces', [DonationController::class, 'reportsTopProvinces']);
Route::get('/reports/top-campaigns', [DonationController::class, 'reportsTopCampaigns']);


Route::post('/schools/register', [SchoolController::class, 'register']);
Route::get('/schools', [SchoolController::class, 'listSchools']);
Route::get('/schools/{id}', [SchoolController::class, 'show']);

Route::get('/schools', [SchoolController::class, 'listSchools']);
Route::post('/schools/bulk-update', [SchoolController::class, 'bulkUpdate']);

Route::get('/school/donations', [DonationController::class, 'schoolDonations']);
Route::get('/school/top-donors', [DonationController::class, 'schoolTopDonors']);

Route::post('/donor/register', [DonorController::class, 'register']);
Route::post('/school/register', [SchoolController::class, 'register']);
Route::get('/donation_requests', [DonationRequestController::class, 'index']);
Route::post('/request/create', [DonationRequestController::class, 'create']);
Route::post('/stripe/webhook', [DonationController::class, 'stripeWebhook']);
Route::get('/donations/verify', [DonationController::class, 'verifySession']);

Route::get('/admin/donation_requests', [DonationRequestController::class, 'adminIndex']);

    Route::post('/donor/schools/{id}/donate', [DonationController::class, 'createSchoolDonation']);
     // ✅ Ministry donors
    Route::get('/donors', [MinistryController::class, 'index']);
    Route::get('/donors/{id}', [MinistryController::class, 'show']);
    Route::get('/donors/{id}/donations', [MinistryController::class, 'donations']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/donor/me', [DonorController::class, 'me']);
    Route::post('/donor/me', [DonorController::class, 'updateMe']);

    Route::post('/donor/security/change-password', [DonorController::class, 'changePassword']);

    Route::get('/donor/exports/donations', [DonorController::class, 'exportDonations']);

    Route::post('/donor/deactivate', [DonorController::class, 'deactivate']);
});
// -----------------------------
// Protected routes (must be authenticated)
// -----------------------------

 Route::get('/ministry/campaigns', [MinistryController::class, 'index2']);
    Route::get('/ministry/campaigns/{id}', [MinistryController::class, 'show2']);
    Route::get('/ministry/campaigns/{id}/donations', [MinistryController::class, 'donations2']);
    Route::get('/reports/ministry/pdf', [DonationController::class, 'ministryReportPdf']);



Route::get('/ministry/overview', [MinistryController::class, 'overview']);
// later you can protect with middleware:
// Route::middleware('auth:sanctum')->get('/ministry/overview', [MinistryController::class, 'overview']);
Route::middleware('auth:school')->get('/school/overview', [SchoolController::class, 'overview']);
Route::delete('/donation_requests/{id}', [DonationRequestController::class, 'destroy']);

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
