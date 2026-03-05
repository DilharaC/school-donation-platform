<?php
namespace Tests\Feature;
use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuthApiTest extends TestCase
{
    use DatabaseTransactions;
/** @test */
public function ministry_login_with_inactive_account_returns_403(): void
{
    $email = 'ministry_' . rand(1000,9999) . '@test.com';

    DB::table('ministries')->insert([
        'name' => 'Test Ministry',
        'email' => $email,
        'password' => bcrypt('123456'),
        'is_active' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $res = $this->postJson('/api/login', [
        'identifier' => $email,
        'password' => '123456',
    ]);

    $res->assertStatus(403);

    $res->assertJson([
        "success" => false,
        "message" => "Ministry account is not active."
    ]);
}
    /** @test */
    public function logout_returns_success_true(): void
    {
        $email = 'donor_' . Str::random(6) . 'Dilhara@example.com';

        DB::table('donors')->insert([
            'full_name' => 'Test Donor',
            'email' => $email,
            'password' => bcrypt('123456'),
            'created_at' => now(),
           
        ]);

        $login = $this->postJson('/api/login', [
            'identifier' => $email,
            'password' => '123456',
        ]);

        $login->assertStatus(200);

        $res = $this->postJson('/api/logout', []);

        $res->assertStatus(200);
        $res->assertJson([
            'success' => true,
        ]);
    }


 /** @test */
    public function login_requires_password(): void
    {
        $res = $this->postJson('/api/login', [
            'identifier' => 'Dilhara@example.com',
        ]);

        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['password']);
    }


   /** @test */
    public function login_requires_identifier(): void
    {
        $res = $this->postJson('/api/login', [
            'password' => '123456',
        ]);

        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['identifier']);
    }

     /** @test */
    public function donor_can_login_successfully(): void
    {
        $email = 'donor_' . Str::random(6) . 'Dilhara@example.com';

        DB::table('donors')->insert([
            'full_name' => 'Test Donor',
            'email' => $email,
            'password' => bcrypt('123456'),
            'created_at' => now(),
            
        ]);

        $res = $this->postJson('/api/login', [
            'identifier' => $email,
            'password' => '123456',
        ]);

        $res->assertStatus(200);
        $res->assertJson([
            'success' => true,
        ]);

        $res->assertJsonStructure([
            'success',
            'user' => ['userType', 'id', 'name', 'email']
        ]);
    }
    /** @test */
    public function login_returns_401_for_wrong_password(): void
    {
        $email = 'donor_' . Str::random(6) . 'Dilhara@example.com';

        DB::table('donors')->insert([
            'full_name' => 'Test Donor',
            'email' => $email,
            'password' => bcrypt('correct_password'),
            'created_at' => now(),
            
        ]);

        $res = $this->postJson('/api/login', [
            'identifier' => $email,
            'password' => 'wrong_password',
        ]);

        $res->assertStatus(401);
        $res->assertJson([
            'success' => false,
            'message' => 'Incorrect password',
        ]);
    }

    //     /** @test */
    public function login_returns_404_when_user_not_found(): void
    {
        $res = $this->postJson('/api/login', [
            'identifier' => 'notfound_' . Str::random(6) . 'Dilhara@example.com',
            'password' => '123456',
        ]);

        $res->assertStatus(404);
        $res->assertJson([
            'success' => false,
            'message' => 'User not found',
        ]);
    }

}







