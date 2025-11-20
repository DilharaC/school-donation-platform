<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/
use Illuminate\Support\Facades\Http;

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





Route::get('/', function () {
    return view('welcome');
});
