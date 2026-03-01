<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SchoolStatusChangedNotification extends Notification
{
    use Queueable;

    public function __construct(public array $data = []) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $status = $this->data['status'] ?? 'unknown';

        return [
            'title' => 'Account status updated',
            'body'  => "Your school account is now {$status}.",
            'meta'  => $this->data,
        ];
    }
}