<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DonationRequestEvidence extends Model
{
    protected $table = 'donation_request_evidences'; // ✅ force correct table
    protected $fillable = ['request_id', 'file_url', 'file_type', 'note'];
}