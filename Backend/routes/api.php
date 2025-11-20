<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DonorController;
use App\Http\Controllers\DonationRequestController;
use App\Http\Controllers\AuthController;

use App\Http\Controllers\SchoolController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/


Route::post('/school/register', [SchoolController::class, 'register']);



Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);

Route::get('/donation_requests', [DonationRequestController::class, 'index']);
Route::post('/request/create', [DonationRequestController::class, 'create']);

Route::post('/donor/register', [DonorController::class, 'register']);
Route::post('/donor/login', [DonorController::class, 'login']);

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
