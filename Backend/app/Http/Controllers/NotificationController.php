<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
  
    private function resolveNotifiable(Request $request): array
{
    $role = strtolower((string) $request->query('role', 'admin'));

    if (!in_array($role, ['admin', 'school', 'donor'])) {
        return ['ok' => false, 'message' => 'Invalid role'];
    }

    if ($role === 'school') {
        $u = null;

        try { $u = Auth::guard('school')->user(); } catch (\Throwable $e) {}

        if (!$u) $u = $request->user();

        if (!$u) return ['ok' => false, 'message' => 'School not authenticated'];

        $schoolId = (int) ($u->getKey()); 
        if (!$schoolId) return ['ok' => false, 'message' => 'Invalid school session'];

        return ['ok' => true, 'type' => 'App\\Models\\School', 'id' => $schoolId];
    }
    if ($role === 'donor') {
        $u = $request->user();
        if (!$u) return ['ok' => false, 'message' => 'Donor not authenticated'];

        $donorId = (int) ($u->donor_id ?? $u->id ?? 0);
        if (!$donorId) return ['ok' => false, 'message' => 'Invalid donor session'];

        return ['ok' => true, 'type' => 'App\\Models\\Donor', 'id' => $donorId];
    }

    return ['ok' => true, 'type' => 'admin', 'id' => 1];
}
public function index(Request $request)
{
    $who = $this->resolveNotifiable($request);
    if (!$who['ok']) return response()->json(['message' => $who['message']], 401);

    $role   = strtolower((string) $request->query('role', 'admin')); // admin|school|donor
    $page   = max(1, (int) $request->query('page', 1));
    $limit  = max(1, min(50, (int) $request->query('limit', 20)));
    $unread = (int) $request->query('unread', 0); 
    $search = trim((string) $request->query('search', ''));

    $q = DB::table('notifications')
        ->where('notifiable_type', $who['type'])
        ->where('notifiable_id', $who['id']);

    if ($unread === 1) {
        $q->whereNull('read_at');
    }

    if ($search !== '') {
        $q->where(function ($qq) use ($search) {
            $qq->where('data', 'like', "%{$search}%")
               ->orWhere('type', 'like', "%{$search}%")
               ->orWhere('id', 'like', "%{$search}%");
        });
    }

    $total = (clone $q)->count();

    $rows = (clone $q)
        ->orderByDesc('created_at')
        ->skip(($page - 1) * $limit)
        ->take($limit)
        ->get(['id', 'type', 'data', 'read_at', 'created_at', 'updated_at']);

    //  decode json once
    $rows->transform(function ($r) {
        $r->data_obj = null;
        if (!empty($r->data)) {
            $decoded = json_decode($r->data, true);
            if (json_last_error() === JSON_ERROR_NONE) $r->data_obj = $decoded;
        }
        return $r;
    });

    // donor enrich: school_name + request_title
    if ($role === 'donor') {
        $schoolIds  = [];
        $requestIds = [];

        foreach ($rows as $r) {
            $d = $r->data_obj ?? null;
            if (!$d) continue;

            if (!empty($d['school_id']))  $schoolIds[]  = (int) $d['school_id'];
            if (!empty($d['request_id'])) $requestIds[] = (int) $d['request_id'];
        }

        $schoolIds  = array_values(array_unique($schoolIds));
        $requestIds = array_values(array_unique($requestIds));

        $schoolMap = [];
        if (count($schoolIds)) {
            $schoolMap = DB::table('schools')
                ->whereIn('school_id', $schoolIds)
                ->pluck('school_name', 'school_id')
                ->toArray();
        }

        $requestMap = [];
        if (count($requestIds)) {
            $requestMap = DB::table('donation_requests')
                ->whereIn('request_id', $requestIds)
                ->pluck('request_title', 'request_id')
                ->toArray();
        }

        $rows->transform(function ($r) use ($schoolMap, $requestMap) {
            $d = $r->data_obj ?? null;
            if (!$d) return $r;

            if (!empty($d['school_id']) && empty($d['school_name'])) {
                $sid = (int) $d['school_id'];
                $d['school_name'] = $schoolMap[$sid] ?? null;
            }

            if (!empty($d['request_id']) && empty($d['request_title'])) {
                $rid = (int) $d['request_id'];
                $d['request_title'] = $requestMap[$rid] ?? null;
            }

            $r->data_obj = $d;
            return $r;
        });
    }

    $unreadCount = DB::table('notifications')
        ->where('notifiable_type', $who['type'])
        ->where('notifiable_id', $who['id'])
        ->whereNull('read_at')
        ->count();

    return response()->json([
        'rows' => $rows,
        'total' => $total,
        'unread_count' => $unreadCount,
        'page' => $page,
        'limit' => $limit,
    ]);
}

    // POST /api/notifications/{id}/read?role=admin|school|donor
    public function markRead(Request $request, $id)
    {
        $who = $this->resolveNotifiable($request);
        if (!$who['ok']) return response()->json(['message' => $who['message']], 401);

        $affected = DB::table('notifications')
            ->where('id', (string)$id)
            ->where('notifiable_type', $who['type'])
            ->where('notifiable_id', $who['id'])
            ->whereNull('read_at') // ✅ don't rewrite if already read
            ->update([
                'read_at' => now(),
                'updated_at' => now()
            ]);

        return response()->json(['message' => 'Marked as read', 'affected' => $affected]);
    }

    // POST /api/notifications/read-all?role=admin|school|donor
    public function markAllRead(Request $request)
    {
        $who = $this->resolveNotifiable($request);
        if (!$who['ok']) return response()->json(['message' => $who['message']], 401);

        $affected = DB::table('notifications')
            ->where('notifiable_type', $who['type'])
            ->where('notifiable_id', $who['id'])
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
                'updated_at' => now()
            ]);

        return response()->json(['message' => 'All marked as read', 'affected' => $affected]);
    }

    // DELETE /api/notifications/{id}?role=admin|school|donor
    public function destroy(Request $request, $id)
    {
        $who = $this->resolveNotifiable($request);
        if (!$who['ok']) return response()->json(['message' => $who['message']], 401);

        $deleted = DB::table('notifications')
            ->where('id', (string)$id)
            ->where('notifiable_type', $who['type'])
            ->where('notifiable_id', $who['id'])
            ->delete();

        return response()->json(['message' => 'Deleted', 'deleted' => $deleted]);
    }
}