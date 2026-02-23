<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\User as Authenticatable; // ✅ important

class Donor extends Authenticatable
{
    protected $table = 'donors';        // Table name
    protected $primaryKey = 'donor_id'; // Primary key

    public $incrementing = true;        // Auto-increment
    protected $keyType = 'int';         // Primary key type

    // Only one timestamp column (created_at)
    const CREATED_AT = 'created_at';
    const UPDATED_AT = null;

    // Fields that can be filled
    protected $fillable = [
        'full_name',
        'email',
        'password',
        'phone',
        'address'
    ];

       // A donor can have many donations
    public function donations()
    {
        return $this->hasMany(Donation::class, 'donor_id', 'donor_id');
    }

    // Optional: Count only active donations (status = Approved or Completed)
    public function activeDonations()
    {
        return $this->donations()->where('status', 'Approved'); // or 'Completed'
    }
    
}
