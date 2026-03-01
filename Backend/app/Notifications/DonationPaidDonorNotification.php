<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DonationPaidDonorNotification extends Notification
{
    use Queueable;

    public function __construct(
        public array $data
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => 'Donation successful',
            'body'  => 'Thank you! Your donation was received.',
            'meta'  => $this->data,
        ];
    }
}