<?php
namespace Tests\Feature;
use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LedgerApiTest extends TestCase
{
    // /** @test */
    // public function ledger_show_returns_404_for_invalid_id(): void
    // {
    //     $res = $this->getJson('/api/admin/ledger/999999');

    //     $res->assertStatus(404);
    //     $res->assertJson([
    //         'message' => 'Ledger entry not found',
    //     ]);
    // }

    
    // /** @test */
    // public function ledger_index_returns_200(): void
    // {
    //     $res = $this->getJson('/api/admin/ledger');

    //     $res->assertStatus(200);
    //     $res->assertJsonStructure([
    //         'rows',
    //         'total',
    //         'page',
    //         'limit',
    //         'filters' => [
    //             'event_types',
    //             'entity_types',
    //         ],
    //     ]);
    // }


    //   /** @test */
    // public function ledger_index_can_filter_by_event_type(): void
    // {
    //     $event = 'TEST_EVENT_' . Str::upper(Str::random(5));

    //     DB::table('ledger_entries')->insert([
    //         'event_type' => $event,
    //         'entity_type' => 'donation',
    //         'entity_id' => 1,
    //         'payload_json' => json_encode(['ok' => true]),
    //         'prev_hash' => 'prev_' . Str::random(10),
    //         'hash' => 'hash_' . Str::random(10),
    //         'created_at' => now(),
    //     ]);

    //     $res = $this->getJson('/api/admin/ledger?event_type=' . $event);

    //     $res->assertStatus(200);
    //     $res->assertJsonFragment([
    //         'event_type' => $event,
    //     ]);
    // }

    //     /** @test */
    // public function ledger_index_can_filter_by_entity_type(): void
    // {
    //     $entityType = 'entity_' . Str::lower(Str::random(5));

    //     DB::table('ledger_entries')->insert([
    //         'event_type' => 'TEST_LEDGER_EVENT',
    //         'entity_type' => $entityType,
    //         'entity_id' => 2,
    //         'payload_json' => json_encode(['x' => 1]),
    //         'prev_hash' => 'prev_' . Str::random(10),
    //         'hash' => 'hash_' . Str::random(10),
    //         'created_at' => now(),
    //     ]);

    //     $res = $this->getJson('/api/admin/ledger?entity_type=' . $entityType);

    //     $res->assertStatus(200);
    //     $res->assertJsonFragment([
    //         'entity_type' => $entityType,
    //     ]);
    // }

    //     /** @test */
    // public function ledger_index_can_search_entries(): void
    // {
    //     $keyword = 'SEARCHKEY_' . Str::upper(Str::random(4));

    //     DB::table('ledger_entries')->insert([
    //         'event_type' => $keyword,
    //         'entity_type' => 'donation_request',
    //         'entity_id' => 3,
    //         'payload_json' => json_encode(['keyword' => $keyword]),
    //         'prev_hash' => 'prev_' . Str::random(10),
    //         'hash' => 'hash_' . Str::random(10),
    //         'created_at' => now(),
    //     ]);

    //     $res = $this->getJson('/api/admin/ledger?search=' . $keyword);

    //     $res->assertStatus(200);
    //     $res->assertJsonFragment([
    //         'event_type' => $keyword,
    //     ]);
    // }

    //     /** @test */
    // public function ledger_show_returns_200_for_valid_id(): void
    // {
    //     DB::table('ledger_entries')->insert([
    //         'event_type' => 'SHOW_TEST',
    //         'entity_type' => 'donation',
    //         'entity_id' => 4,
    //         'payload_json' => json_encode(['show' => true]),
    //         'prev_hash' => 'prev_' . Str::random(10),
    //         'hash' => 'hash_' . Str::random(10),
    //         'created_at' => now(),
    //     ]);
    //     $id = DB::table('ledger_entries')->max('id');
    //     $res = $this->getJson('/api/admin/ledger/' . $id);
    //      $res->assertStatus(200);
    //     $res->assertJsonStructure([
    //         'row' => [
    //             'id',
    //             'event_type',
    //             'entity_type',
    //             'entity_id',
    //             'payload_json',
    //             'prev_hash',
    //             'hash',
    //             'created_at',
    //         ]
    //     ]);
    // }
}













