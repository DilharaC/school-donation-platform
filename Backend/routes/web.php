<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Http;

// Test route
Route::get('/test-need', function () {
    $response = Http::post('http://127.0.0.1:5000/calculate_need', [
        'students' => 620,
        'facilities' => 10,
        'area_type' => 'Suburban',
        'performance' => 88,
        'prev_donations' => 18000
    ]);

    return $response->json();
});

Route::get('/ssl-config-check', function () {
    return response()->json([
        'php_version' => PHP_VERSION,
        'loaded_ini' => php_ini_loaded_file(),
        'curl.cainfo' => ini_get('curl.cainfo'),
        'openssl.cafile' => ini_get('openssl.cafile'),
        'curl_ca_exists' => file_exists(ini_get('curl.cainfo')),
        'openssl_ca_exists' => file_exists(ini_get('openssl.cafile')),
    ]);
});

    Route::get('/phpinfo-test', function () {
    phpinfo();
});

// // // Sanctum built-in CSRF cookie route
// Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show']);
// // Login / Logout
// Route::middleware('web')->group(function () {
//     Route::post('/login', [AuthController::class, 'login']);
//     Route::post('/logout', [AuthController::class, 'logout']);
// });

// Default route
Route::get('/', function () {
    return view('welcome');
});
