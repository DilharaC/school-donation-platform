<?php
namespace Tests\Feature;
use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NotificationApiTest extends TestCase
{

    // /** @test */
    // public function admin_notifications_can_be_searched(): void
    // {
    //     $keyword = 'SEARCH_' . Str::upper(Str::random(4));

    //     DB::table('notifications')->insert([
    //         'id' => (string) Str::uuid(),
    //         'type' => 'admin',
    //         'notifiable_type' => 'admin',
    //         'notifiable_id' => 1,
    //         'data' => json_encode([
    //             'title' => $keyword,
    //             'body' => 'Search body',
    //         ]),
    //         'read_at' => null,
    //         'created_at' => now(),
    //         'updated_at' => now(),
    //     ]);

    //     $res = $this->getJson('/api/notifications?role=admin&search=' . $keyword);

    //     $res->assertStatus(200);
    //     $res->assertSee($keyword);
    // }

    // /** @test */
    // public function admin_notifications_index_returns_200(): void
    // {
    //     $res = $this->getJson('/api/notifications?role=admin');

    //     $res->assertStatus(200);
    //     $res->assertJsonStructure([
    //         'rows',
    //         'total',
    //         'unread_count',
    //         'page',
    //         'limit',
    //     ]);
    // }  
    
//  /** @test */
//     public function notifications_reject_invalid_role(): void
//     {
//         $res = $this->getJson('/api/notifications?role=abc');

//         $res->assertStatus(401);
//         $res->assertJson([
//             'message' => 'Invalid role',
//         ]);
//     }
    // /** @test */
    // public function donor_notifications_require_authentication(): void
    // {
    //     $res = $this->getJson('/api/notifications?role=donor');

    //     $res->assertStatus(401);
    //     $res->assertJson([
    //         'message' => 'Donor not authenticated',
    //     ]);
    // }

    //     /** @test */
    // public function admin_can_mark_all_notifications_as_read(): void
    // {
    //     DB::table('notifications')->insert([
    //         [
    //             'id' => (string) Str::uuid(),
    //             'type' => 'admin',
    //             'notifiable_type' => 'admin',
    //             'notifiable_id' => 1,
    //             'data' => json_encode(['title' => 'N1']),
    //             'read_at' => null,
    //             'created_at' => now(),
    //             'updated_at' => now(),
    //         ],
    //         [
    //             'id' => (string) Str::uuid(),
    //             'type' => 'admin',
    //             'notifiable_type' => 'admin',
    //             'notifiable_id' => 1,
    //             'data' => json_encode(['title' => 'N2']),
    //             'read_at' => null,
    //             'created_at' => now(),
    //             'updated_at' => now(),
    //         ],
    //     ]);

    //     $res = $this->postJson('/api/notifications/read-all?role=admin');

    //     $res->assertStatus(200);
    //     $res->assertJsonFragment([
    //         'message' => 'All marked as read',
    //     ]);
    // }

    //     /** @test */
    // public function admin_can_delete_notification(): void
    // {
    //     $id = (string) Str::uuid();

    //     DB::table('notifications')->insert([
    //         'id' => $id,
    //         'type' => 'admin',
    //         'notifiable_type' => 'admin',
    //         'notifiable_id' => 1,
    //         'data' => json_encode([
    //             'title' => 'Delete test',
    //         ]),
    //         'read_at' => null,
    //         'created_at' => now(),
    //         'updated_at' => now(),
    //     ]);

    //     $res = $this->deleteJson("/api/notifications/{$id}?role=admin");

    //     $res->assertStatus(200);
    //     $res->assertJson([
    //         'message' => 'Deleted',
    //         'deleted' => 1,
    //     ]);
    // }
}
















