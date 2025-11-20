<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class School extends Model
{
    use HasFactory;

    // Optional if table name is non-standard
    protected $table = 'schools';

    // Primary key (default is id, change if different)
    protected $primaryKey = 'school_id';

    // Fillable fields (all columns you want to mass assign)
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
        'address'  ,
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

    // Hide sensitive fields when converting to JSON
    protected $hidden = [
        'password_hash'
    ];
}
