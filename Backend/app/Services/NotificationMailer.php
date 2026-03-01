<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Mail\SystemNotificationMail;

class NotificationMailer
{
    public static function sendDonationEmails(array $data): void
    {
        $donorId  = (int)($data['donor_id'] ?? 0);
        $schoolId = (int)($data['school_id'] ?? 0);
        $requestId = !empty($data['request_id']) ? (int)$data['request_id'] : null;

        // Emails + names
        $donor = $donorId
            ? DB::table('donors')->where('donor_id', $donorId)->first(['email', 'full_name'])
            : null;

        $school = $schoolId
            ? DB::table('schools')->where('school_id', $schoolId)->first(['contact_email', 'school_name'])
            : null;

        $requestTitle = null;
        if ($requestId) {
            $requestTitle = DB::table('donation_requests')
                ->where('request_id', $requestId)
                ->value('request_title');
        }

        $amount = $data['amount'] ?? null;
        $status = $data['status'] ?? null;

        // ---------- DONOR EMAIL (thank you) ----------
        if (!empty($donor?->email)) {
            $payloadDonor = [
                'subject'      => $data['subject_donor'] ?? 'Donation Sent Successfully ',
                'title'        => $data['title_donor'] ?? 'Thank you for your donation!',
                'message'      => $data['message_donor'] ?? 'Your donation was received successfully.',
                'amount'       => $amount,
                'status'       => $status,
                'school_name'  => $school->school_name ?? null,
                'request_title'=> $requestTitle,
                'created_at'   => now()->toDateTimeString(),
            ];

            Mail::to($donor->email)->send(new SystemNotificationMail($payloadDonor));
        }

        // ---------- SCHOOL EMAIL (received from donor) ----------
        if (!empty($school?->contact_email)) {
            $donorName = $donor->full_name ?? 'A donor';

            $schoolMsg = $requestTitle
                ? "You received a donation from {$donorName} for “{$requestTitle}”."
                : "You received a donation from {$donorName} to your school fund.";

            $payloadSchool = [
                'subject'      => $data['subject_school'] ?? 'New donation received 🎉',
                'title'        => $data['title_school'] ?? 'You received a donation!',
                'message'      => $data['message_school'] ?? $schoolMsg,
                'amount'       => $amount,
                'status'       => $status,
                'school_name'  => $school->school_name ?? null,
                'request_title'=> $requestTitle,
                'created_at'   => now()->toDateTimeString(),
            ];

            Mail::to($school->contact_email)->send(new SystemNotificationMail($payloadSchool));
        }
    }
}