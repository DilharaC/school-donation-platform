<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DonationRequest extends Model
{
    use HasFactory;

    protected $table = 'donation_requests';
    protected $primaryKey = 'request_id';

    protected $fillable = [
        'school_id',
        'request_title',
        'category',
        'quantity',
        'estimated_price',
        'amount_raised',
        'description',
        'image_url',
        'document_url',
        'status'
    ];

    // Relationship: DonationRequest belongs to a School
    public function school()
    {
        return $this->belongsTo(School::class, 'school_id', 'school_id');
    }
    // App/Models/DonationRequest.php
public function evidences()
{
    return $this->hasMany(\App\Models\DonationRequestEvidence::class, 'request_id', 'request_id');
}
}
