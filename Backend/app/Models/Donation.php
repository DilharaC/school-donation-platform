<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Donation extends Model
{
    protected $primaryKey = 'donation_id';

    protected $fillable = [
        'request_id',
        'donor_id',
        'amount',
        'paid_amount',
        'recurring',
        'donor_name',
        'donor_email',
        'message',
        'anonymous',
        'status',
        'stripe_session_id',
        'paid_at',
    ];

    public function donor()
    {
        return $this->belongsTo(Donor::class, 'donor_id');
    }

    public function request()
    {
        return $this->belongsTo(Request::class, 'request_id');
    }
}
