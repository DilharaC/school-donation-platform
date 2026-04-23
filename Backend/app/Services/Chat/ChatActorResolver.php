<?php

namespace App\Services\Chat;

use Illuminate\Http\Request;
use App\Models\Donor;
use App\Models\School;
use App\Models\Ministry;

class ChatActorResolver
{
    public function resolve(Request $request): array
    {
        $sanctumUser = auth('sanctum')->user();
        if ($sanctumUser) {
            return $this->normalize($sanctumUser);
        }

        if ($school = auth('school')->user()) {
            return $this->normalize($school);
        }

        if ($ministry = auth('ministry')->user()) {
            return $this->normalize($ministry);
        }

        if (config('auth.guards.admin')) {
            $admin = auth('admin')->user();
            if ($admin) {
                return [
                    'role' => 'admin',
                    'user' => $admin,
                    'school_id' => null,
                    'donor_id' => null,
                    'ministry_id' => null,
                    'admin_id' => $admin->admin_id ?? $admin->id ?? null,
                    'name' => $admin->name ?? 'Admin',
                    'email' => $admin->email ?? null,
                ];
            }
        }

        if ($webUser = auth()->user()) {
            return $this->normalize($webUser);
        }

        return [
            'role' => 'guest',
            'user' => null,
            'school_id' => null,
            'donor_id' => null,
            'ministry_id' => null,
            'admin_id' => null,
            'name' => null,
            'email' => null,
        ];
    }

    protected function normalize($user): array
    {
        if ($user instanceof Donor) {
            return [
                'role' => 'donor',
                'user' => $user,
                'school_id' => null,
                'donor_id' => $user->donor_id ?? $user->id ?? null,
                'ministry_id' => null,
                'admin_id' => null,
                'name' => $user->full_name ?? 'Donor',
                'email' => $user->email ?? null,
            ];
        }

        if ($user instanceof School) {
            return [
                'role' => 'school',
                'user' => $user,
                'school_id' => $user->school_id ?? $user->id ?? null,
                'donor_id' => null,
                'ministry_id' => null,
                'admin_id' => null,
                'name' => $user->school_name ?? 'School',
                'email' => $user->contact_email ?? null,
            ];
        }

        if ($user instanceof Ministry) {
            return [
                'role' => 'ministry',
                'user' => $user,
                'school_id' => null,
                'donor_id' => null,
                'ministry_id' => $user->ministry_id ?? $user->id ?? null,
                'admin_id' => null,
                'name' => $user->name ?? 'Ministry',
                'email' => $user->email ?? null,
            ];
        }

        return [
            'role' => 'guest',
            'user' => $user,
            'school_id' => null,
            'donor_id' => null,
            'ministry_id' => null,
            'admin_id' => null,
            'name' => data_get($user, 'name'),
            'email' => data_get($user, 'email'),
        ];
    }
}