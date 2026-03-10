<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Ministry extends Authenticatable
{
      use HasApiTokens;
    protected $table = 'ministries';

    protected $fillable = [
        'name', 'email', 'password', 'is_active'
    ];

    protected $hidden = [
        'password',
    ];
}