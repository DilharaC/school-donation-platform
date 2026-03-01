<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class EvidenceUploadedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public int $requestId,
        public string $requestTitle,
        public int $schoolId,
        public int $evidenceCount
    ) {}

    public function via($notifiable)
    {
        return ['database']; // store in notifications table
    }

    public function toDatabase($notifiable)
    {
        return [
            'title' => 'New spending proof uploaded',
            'body'  => "New invoice/receipt/proof was uploaded for: {$this->requestTitle}",
            'request_id' => $this->requestId,
            'school_id'  => $this->schoolId,
            'evidence_count' => $this->evidenceCount,
            'time' => now()->toDateTimeString(),
        ];
    }
}