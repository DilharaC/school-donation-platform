<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Mail\SystemNotificationMail;
use Illuminate\Support\Str;

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
     public static function sendSchoolActivated(int $schoolId, int $adminId = 1): void
    {
        $school = DB::table('schools')
            ->where('school_id', $schoolId)
            ->first(['school_id', 'school_name', 'contact_email']);

        if (!$school || empty($school->contact_email)) return;

        $payload = [
            'subject'     => 'Your school account is activated ✅',
            'title'       => 'Account Activated',
            'message'     => "Hi {$school->school_name}, your school account has been activated by the admin. You can now log in and start using the system.",
            'school_name' => $school->school_name,
            'status'      => 'active',
            'created_at'  => now()->toDateTimeString(),
        ];

        // Email
        Mail::to($school->contact_email)->send(new SystemNotificationMail($payload));

        // In-app notification row (optional but recommended)
        DB::table('notifications')->insert([
            'id'              => (string) Str::uuid(),
            'type'            => 'school.activated',
            'notifiable_type' => 'App\\Models\\School',
            'notifiable_id'   => (int) $school->school_id,
            'data'            => json_encode([
                'title'      => $payload['title'],
                'message'    => $payload['message'],
                'school_id'  => (int) $school->school_id,
                'school_name'=> $school->school_name,
                'status'     => 'active',
                'admin_id'   => $adminId,
                'created_at' => $payload['created_at'],
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'read_at'         => null,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);
    }

    public static function sendSchoolVerified(int $schoolId, int $adminId = 1): void
    {
        $school = DB::table('schools')
            ->where('school_id', $schoolId)
            ->first(['school_id', 'school_name', 'contact_email']);

        if (!$school || empty($school->contact_email)) return;

        $payload = [
            'subject'     => 'Your school is verified 🎉',
            'title'       => 'School Verified',
            'message'     => "Great news! {$school->school_name} has been verified by the admin. Your profile will now show as verified.",
            'school_name' => $school->school_name,
            'status'      => 'verified',
            'created_at'  => now()->toDateTimeString(),
        ];

        // Email
        Mail::to($school->contact_email)->send(new SystemNotificationMail($payload));

        // In-app notification row (optional but recommended)
        DB::table('notifications')->insert([
            'id'              => (string) Str::uuid(),
            'type'            => 'school.verified',
            'notifiable_type' => 'App\\Models\\School',
            'notifiable_id'   => (int) $school->school_id,
            'data'            => json_encode([
                'title'      => $payload['title'],
                'message'    => $payload['message'],
                'school_id'  => (int) $school->school_id,
                'school_name'=> $school->school_name,
                'status'     => 'verified',
                'admin_id'   => $adminId,
                'created_at' => $payload['created_at'],
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'read_at'         => null,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);
    }
}