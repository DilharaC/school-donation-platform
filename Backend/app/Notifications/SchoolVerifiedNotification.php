<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SchoolVerifiedNotification extends Notification
{
    use Queueable;

    public function __construct(public array $data = []) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => 'School verified',
            'body'  => 'Your school account has been verified by admin.',
            'meta'  => $this->data,
        ];
    }
}