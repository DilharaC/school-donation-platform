<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class Ministry extends Authenticatable
{
    protected $table = 'ministries';

    protected $fillable = [
        'name', 'email', 'password', 'is_active'
    ];

    protected $hidden = [
        'password',
    ];
}