<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DonationRequest extends Model
{
    protected $table = 'donation_requests';
    protected $primaryKey = 'request_id';

    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
    'school_id',
    'request_title',
    'category',
    'quantity',
    'estimated_price',
    'amount_raised',
    'description',
    'image_url',
    'document_url'
];
}
