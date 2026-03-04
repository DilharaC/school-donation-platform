<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FundAllocation extends Model
{
    protected $table = 'fund_allocations';
    protected $primaryKey = 'allocation_id';

    protected $fillable = [
        'donation_id',
        'school_id',
        'request_id',
        'allocated_amount',
        'allocation_type',
        'status',
    ];
}