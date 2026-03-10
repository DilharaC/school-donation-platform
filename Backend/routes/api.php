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
use App\Http\Controllers\ContactMessageController;

Route::middleware('web')->get('/sanctum/csrf-cookie', function () {
    return response()->json(['status' => 'csrf cookie set']);
});



Route::middleware('web')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);
});
Route::middleware(['web', 'auth:sanctum'])->group(function () {
      Route::post('/donations/create', [DonationController::class, 'createDonation']); 
});
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/donor/donations/{donationId}/allocations', [DonationController::class, 'donationAllocations']);
});


Route::get('/recent-donors', [DonationController::class, 'recentDonors']);
Route::get('/donation-trends', [DonationController::class, 'donationTrends']);
Route::get('/analytics/schools-map', [DonationController::class, 'schoolsDonationMap']);
Route::get('/registered-donors', [DonorController::class, 'allDonors']);
Route::get('/donors-active', [DonationController::class, 'donorsWithActiveDonations']);
Route::get('/all-donors', [DonationController::class, 'allDonorsWithStats']);
Route::get('/donation_requests/{id}/donations', [DonationController::class, 'donationsByRequest']);
Route::get('/donor/my-donations', [DonationController::class, 'myDonations']);
Route::get('/donations', [DonationController::class, 'listDonations']);
Route::get('/donations/{id}/receipt', [DonationController::class, 'receipt']);
Route::get('/reports/summary', [DonationController::class, 'reportsSummary']);
Route::get('/reports/trends', [DonationController::class, 'reportsTrends']);
Route::get('/reports/top-provinces', [DonationController::class, 'reportsTopProvinces']);
Route::get('/reports/top-campaigns', [DonationController::class, 'reportsTopCampaigns']);
Route::get('/school/donations', [DonationController::class, 'schoolDonations']);
Route::get('/school/top-donors', [DonationController::class, 'schoolTopDonors']);


Route::post('/stripe/webhook', [DonationController::class, 'stripeWebhook']);
Route::get('/donations/verify', [DonationController::class, 'verifySession']);
    Route::post('/donor/schools/{id}/donate', [DonationController::class, 'createSchoolDonation']);


Route::get('/donor/overview', [DonationController::class, 'donorOverview']);


Route::get('/notifications', [NotificationController::class, 'index']);
Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']); 



Route::get('/admin/ledger', [LedgerController::class, 'index']);   
Route::get('/admin/ledger/{id}', [LedgerController::class, 'show']); 


Route::get('/schools-donations', [SchoolController::class, 'schoolsWithDonations']);
Route::post('/schools/register', [SchoolController::class, 'register']);
Route::get('/schools', [SchoolController::class, 'listSchools']);
Route::get('/schools/{id}', [SchoolController::class, 'show']);
Route::get('/schools', [SchoolController::class, 'listSchools']);
Route::post('/schools/bulk-update', [SchoolController::class, 'bulkUpdate']);


Route::get('/dashboard/kpis-today-weekly', [DashboardController::class, 'kpisTodayWithWeeklyChange']);


Route::get('/donation_requests/{id}', [DonationRequestController::class, 'show']);
Route::put('/donation_requests/{id}/status', [DonationRequestController::class, 'updateStatus']);
Route::get('/donation_requests/{id}/evidences', [DonationRequestController::class, 'listEvidences']);
Route::post('/donation_requests/{id}/evidences', [DonationRequestController::class, 'uploadEvidence']);
Route::delete('/donation_request_evidences/{id}', [DonationRequestController::class, 'deleteEvidence']);
Route::get('/donation_requests', [DonationRequestController::class, 'index']);
Route::post('/request/create', [DonationRequestController::class, 'create']);
Route::delete('/donation_requests/{id}', [DonationRequestController::class, 'destroy']);
Route::post('/donation_requests/{id}/update', [DonationRequestController::class, 'update']);
Route::get('/admin/donation_requests', [DonationRequestController::class, 'adminIndex']);



Route::middleware('auth:school')->group(function () {
 Route::get('/school/me', [SchoolController::class, 'me']);
Route::post('/school/me', [SchoolController::class, 'updateMe']);
 Route::get('/my-requests', [DonationRequestController::class, 'myIndex']);
 Route::post('/school/security/change-password', [SchoolController::class, 'changePassword']);
Route::get('/school/privacy', [SchoolController::class, 'getPrivacy']); Route::post('/school/privacy', [SchoolController::class, 'savePrivacy']);
 Route::delete('/my-requests/{id}', [DonationRequestController::class, 'destroy']);
Route::get('/school/exports/donations', [SchoolController::class, 'exportDonations']);
Route::get('/school/exports/campaigns', [SchoolController::class, 'exportCampaigns']);
 Route::post('/school/deactivate', [SchoolController::class, 'deactivate']);
 Route::middleware('auth:school')->get('/school/overview', [SchoolController::class, 'overview']);
 Route::post('/school/register', [SchoolController::class, 'register']);
});


Route::post('/donor/register', [DonorController::class, 'register']);
Route::middleware(['auth:sanctum'])->group(function () {
Route::get('/donor/me', [DonorController::class, 'me']);
 Route::post('/donor/me', [DonorController::class, 'updateMe']);
Route::post('/donor/security/change-password', [DonorController::class, 'changePassword']);
Route::get('/donor/exports/donations', [DonorController::class, 'exportDonations']);
 Route::post('/donor/deactivate', [DonorController::class, 'deactivate']);
});



Route::get('/ministry/accounts', [MinistryController::class, 'accounts']);
Route::post('/ministry/accounts', [MinistryController::class, 'storeAccount']);
Route::put('/ministry/accounts/{id}', [MinistryController::class, 'updateAccount']);
Route::patch('/ministry/accounts/{id}/toggle', [MinistryController::class, 'toggleAccount']);

Route::middleware(['web', 'auth:ministry'])->group(function () {
    Route::get('/ministry/campaigns', [MinistryController::class, 'index2']);
    Route::get('/ministry/campaigns/{id}', [MinistryController::class, 'show2']);
    Route::get('/ministry/campaigns/{id}/donations', [MinistryController::class, 'donations2']);
    Route::get('/reports/ministry/pdf', [DonationController::class, 'ministryReportPdf']);
    Route::get('/ministry/overview', [MinistryController::class, 'overview']);
});
    Route::get('/donors', [MinistryController::class, 'index']);
    Route::get('/donors/{id}', [MinistryController::class, 'show']);
    Route::get('/donors/{id}/donations', [MinistryController::class, 'donations']);




Route::get('/contact-messages', [ContactMessageController::class, 'index']);

Route::post('/contact-messages', [ContactMessageController::class, 'store']);