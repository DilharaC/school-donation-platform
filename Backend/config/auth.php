<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Authentication Defaults
    |--------------------------------------------------------------------------
    */

    'defaults' => [
        'guard' => 'web',
        'passwords' => 'donors', // default password reset table
    ],

    /*
    |--------------------------------------------------------------------------
    | Authentication Guards
    |--------------------------------------------------------------------------
    */

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'donors', // default provider
        ],

        // Optional: separate guard for schools
        'school' => [
            'driver' => 'session',
            'provider' => 'schools',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | User Providers
    |--------------------------------------------------------------------------
    */

    'providers' => [
        'donors' => [
            'driver' => 'eloquent',
            'model' => App\Models\Donor::class,
        ],

        'schools' => [
            'driver' => 'eloquent',
            'model' => App\Models\School::class,
        ],

        // If you ever create a User model, you can add it here
        // 'users' => [
        //     'driver' => 'eloquent',
        //     'model' => App\Models\User::class,
        // ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Resetting Passwords
    |--------------------------------------------------------------------------
    */

    'passwords' => [
        'donors' => [
            'provider' => 'donors',
            'table' => 'password_resets',
            'expire' => 60,
            'throttle' => 60,
        ],

        'schools' => [
            'provider' => 'schools',
            'table' => 'password_resets',
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Password Confirmation Timeout
    |--------------------------------------------------------------------------
    */

    'password_timeout' => 10800,

];
