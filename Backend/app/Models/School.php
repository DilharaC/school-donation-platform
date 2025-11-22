<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\User as Authenticatable; // ✅ important

class School extends Authenticatable
{
    use HasFactory;

    protected $table = 'schools';
    protected $primaryKey = 'school_id';

    protected $fillable = [
        'school_name',
        'registration_no',
        'category',
        'level',
        'district',
        'province',
        'postal_code',
        'principal_name',
        'contact_person',
        'contact_email',
        'contact_phone',
        'address',
        'alt_phone',
        'website',
        'student_count',
        'teacher_count',
        'establishment_year',
        'logo_url',
        'documents_url',
        'password_hash',
        'verified',
        'status',
        'bank_account',
        'bank_name',
        'account_holder',
        'need_score',
        'facilities',
        'area_type',
        'performance',
        'prev_donations'
    ];

    protected $hidden = ['password_hash'];

    // Relationship: A school has many donation requests
    public function donationRequests()
    {
        return $this->hasMany(DonationRequest::class, 'school_id', 'school_id');
    }
}
