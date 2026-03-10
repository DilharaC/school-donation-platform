<?php
namespace Tests\Feature;
use Tests\TestCase;
use Illuminate\Support\Str;

class DonorApiTest extends TestCase
{
    // /** @test */
    // public function donor_change_password_requires_authentication(): void
    // {
    //     $res = $this->postJson('/api/donor/security/change-password', [
    //         'current_password' => '123456',
    //         'new_password' => '654321',
    //     ]);

    //     $res->assertStatus(401);
    // }

     // /** @test */
    // public function donor_can_register_successfully(): void
    // {
    //     $email = 'donor_' . Str::random(6) . '@example.com';

    //     $res = $this->postJson('/api/donor/register', [
    //         'full_name' => 'Test Donor',
    //         'email' => $email,
    //         'password' => '123456',
    //         'phone' => '0771234567',
    //         'address' => 'Colombo',
    //     ]);

    //     $res->assertStatus(200);
    //     $res->assertJsonStructure([
    //         'message',
    //         'donor'
    //     ]);
    //     $res->assertJson([
    //         'message' => 'Registration successful',
    //     ]);
    // }


    //   /** @test */
    // public function donor_registration_rejects_duplicate_email(): void
    // {
    //     $email = 'duplicate_' . Str::random(6) . '@example.com';

    //     // First registration
    //     $this->postJson('/api/donor/register', [
    //         'full_name' => 'First Donor',
    //         'email' => $email,
    //         'password' => '123456',
    //     ])->assertStatus(200);

    //     // Duplicate registration
    //     $res = $this->postJson('/api/donor/register', [
    //         'full_name' => 'Second Donor',
    //         'email' => $email,
    //         'password' => '123456',
    //     ]);

    //     $res->assertStatus(422);
    //     $res->assertJsonValidationErrors(['email']);
    // }

    //     /** @test */
    // public function donor_me_requires_authentication(): void
    // {
    //     $res = $this->getJson('/api/donor/me');
    //     $res->assertStatus(401);
    // }

    //     /** @test */
    // public function donor_update_profile_requires_authentication(): void
    // {
    //     $res = $this->postJson('/api/donor/me', [
    //         'full_name' => 'Updated Name',
    //         'email' => 'updated@example.com',
    //         'phone' => '0770000000',
    //         'address' => 'Kandy',
    //     ]);

    //     $res->assertStatus(401);
    // }

}











   