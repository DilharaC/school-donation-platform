<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LedgerController extends Controller
{
    // GET /api/admin/ledger?search=&event_type=&entity_type=&page=1&limit=20
    public function index(Request $request)
    {
        $search     = trim($request->query('search', ''));
        $eventType  = trim($request->query('event_type', ''));   // e.g. DONATION_PAID
        $entityType = trim($request->query('entity_type', ''));  // e.g. donation_request
        $page       = max(1, (int) $request->query('page', 1));
        $limit      = max(1, min(100, (int) $request->query('limit', 20)));

        $q = DB::table('ledger_entries')
            ->select([
                'id',
                'event_type',
                'entity_type',
                'entity_id',
                'payload_json',
                'prev_hash',
                'hash',
                'created_at',
            ]);

        if ($eventType !== '') {
            $q->where('event_type', $eventType);
        }

        if ($entityType !== '') {
            $q->where('entity_type', $entityType);
        }

        if ($search !== '') {
            $like = "%{$search}%";
            $q->where(function ($qq) use ($like) {
                $qq->where('event_type', 'like', $like)
                    ->orWhere('entity_type', 'like', $like)
                    ->orWhere('entity_id', 'like', $like)
                    ->orWhere('payload_json', 'like', $like)
                    ->orWhere('hash', 'like', $like)
                    ->orWhere('prev_hash', 'like', $like);
            });
        }

        $total = (clone $q)->count();

        $rows = $q->orderByDesc('id')
            ->skip(($page - 1) * $limit)
            ->take($limit)
            ->get();

        // dropdown filters
        $eventTypes = DB::table('ledger_entries')->select('event_type')->distinct()->orderBy('event_type')->pluck('event_type');
        $entityTypes = DB::table('ledger_entries')->select('entity_type')->distinct()->orderBy('entity_type')->pluck('entity_type');

        return response()->json([
            'rows' => $rows,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'filters' => [
                'event_types' => $eventTypes,
                'entity_types' => $entityTypes,
            ],
        ]);
    }

    // GET /api/admin/ledger/{id}
    public function show($id)
    {
        $row = DB::table('ledger_entries')->where('id', (int)$id)->first();
        if (!$row) return response()->json(['message' => 'Ledger entry not found'], 404);
        return response()->json(['row' => $row]);
    }
}