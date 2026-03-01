<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class LedgerService
{
    public function record(string $eventType, string $entityType, int $entityId, array $payload): int
    {
        return DB::transaction(function () use ($eventType, $entityType, $entityId, $payload) {

            $last = DB::table('ledger_entries')->orderByDesc('id')->first();
            $prevHash = $last?->hash ?? str_repeat('0', 64);

            $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            $dataToHash = $prevHash.'|'.$eventType.'|'.$entityType.'|'.$entityId.'|'.$payloadJson;

            $hash = hash('sha256', $dataToHash);

            return DB::table('ledger_entries')->insertGetId([
                'event_type'   => $eventType,
                'entity_type'  => $entityType,
                'entity_id'    => $entityId,
                'payload_json' => $payloadJson,
                'prev_hash'    => $prevHash,
                'hash'         => $hash,
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);
        });
    }
}