<?php
namespace Tests\Feature;
use Tests\TestCase;


class DonationApiTest extends TestCase
{
    /** @test */
    public function donation_allocations_requires_authentication(): void
    {
        $res = $this->getJson('/api/donor/donations/1/allocations');
        $res->assertStatus(401);
    }
      public function create_donation_requires_authentication(): void
    {
        $res = $this->postJson('/api/donations/create', [
            'request_id' => 1,
            'amount' => 1000,
            'anonymous' => false,
        ]);

        $res->assertStatus(401);
    }
    /** @test */



 /** @test */
     public function create_donation_rejects_invalid_amount(): void
{
   $login = $this->postJson('/api/login', [
    'identifier' => 'chamudithadilhara985@gmail.com', 
    'password' => '123456',
]);
   $login->assertStatus(200);

    $token = $login->json('token');

    $res = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/donations/create', [
            'request_id' => 1,
            'amount' => 0,
            'anonymous' => false,
        ]);
    $res->assertStatus(422);
}
   /** @test */
    public function verify_session_requires_session_id(): void
    {
        $res = $this->getJson('/api/donations/verify');
        $res->assertStatus(400);
        $res->assertJson(['status' => 'no_session']);
    }
}







 