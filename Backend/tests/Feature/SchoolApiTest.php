<?php
namespace Tests\Feature;
use Tests\TestCase;
use Illuminate\Support\Str;

class SchoolApiTest extends TestCase
{
    // /** @test */
    // public function school_change_password_requires_authentication(): void
    // {
    //     $res = $this->postJson('/api/school/security/change-password', [
    //         'current_password' => '123456',
    //         'new_password' => '654321',
    //     ]);

    //     $res->assertStatus(401);
    // }
//         /** @test */
//     public function school_can_register_successfully(): void
//     {
//         $regNo = 'REG' . rand(10000, 99999);
//         $email = 'school_' . Str::random(6) . '@example.com';

//      $res = $this->postJson('/api/schools/register', [
//     'school_name' => 'Test School',
//     'registration_no' => 'REG' . rand(10000, 99999),
//     'category' => 'Primary',
//     'district' => 'Colombo',
//     'province' => 'Western',
//     'contact_person' => 'Principal',
//     'address' => 'Colombo',
//     'contact_email' => 'school_' . Str::random(6) . '@example.com',
//     'contact_phone' => '0771234567',
//     'password' => '123456',
//     'student_count' => 500,
//     'facilities' => 10,
//     'area_type' => 'Rural',
//     'performance' => 75,
//     'prev_donations' => 0,
// ]);
//         $res->assertStatus(201);
//         $res->assertJson([
//             'success' => true,
//             'message' => 'School registered successfully!',
//         ]);
//         $res->assertJsonStructure([
//             'success',
//             'message',
//             'school'
//         ]);
//     }
// /** @test */
//     public function school_registration_rejects_duplicate_registration_number(): void
//     {$regNo = 'REG' . rand(10000, 99999);
// $email1 = 'school1_' . Str::random(5) . '@example.com';
// $email2 = 'school2_' . Str::random(5) . '@example.com';
// $this->postJson('/api/schools/register', [
//     'school_name' => 'First School',
//     'registration_no' => $regNo,
//     'category' => 'Primary',
//     'district' => 'Colombo',
//     'province' => 'Western',
//     'contact_person' => 'Principal',
//     'address' => 'Colombo',
//     'contact_email' => $email1,
//     'contact_phone' => '0771234567',
//     'password' => '123456',
//     'student_count' => 400,
//     'facilities' => 8,
//     'area_type' => 'Urban',
//     'performance' => 70,
//     'prev_donations' => 0,
// ])->assertStatus(201);
// $res = $this->postJson('/api/schools/register', [
//     'school_name' => 'Second School',
//     'registration_no' => $regNo, 
//     'category' => 'Primary',
//     'district' => 'Colombo',
//     'province' => 'Western',
//     'contact_person' => 'Principal',
//     'address' => 'Colombo',
//     'contact_email' => $email2,
//     'contact_phone' => '0771234567',
//     'password' => '123456',
//     'student_count' => 450,
//     'facilities' => 9,
//     'area_type' => 'Urban',
//     'performance' => 72,
//     'prev_donations' => 0,
// ]);

// $res->assertStatus(422);
// $res->assertJsonValidationErrors(['registration_no']);
// }


//     /** @test */
// public function school_registration_rejects_duplicate_contact_email(): void
// {
//     $regNo1 = 'REG' . rand(10000, 99999);
//     $regNo2 = 'REG' . rand(10000, 99999);
//     $email = 'school_' . Str::random(6) . '@example.com';
//     $this->postJson('/api/schools/register', [
//         'school_name' => 'First School',
//         'registration_no' => $regNo1,
//         'category' => 'Primary',
//         'district' => 'Colombo',
//         'province' => 'Western',
//         'contact_person' => 'Principal',
//         'address' => 'Colombo',
//         'contact_email' => $email,
//         'contact_phone' => '0771234567',
//         'password' => '123456',
//         'student_count' => 400,
//         'facilities' => 8,
//         'area_type' => 'Urban',
//         'performance' => 70,
//         'prev_donations' => 0,
//     ])->assertStatus(201);
//     $res = $this->postJson('/api/schools/register', [
//         'school_name' => 'Second School',
//         'registration_no' => $regNo2,
//         'category' => 'Primary',
//         'district' => 'Colombo',
//         'province' => 'Western',
//         'contact_person' => 'Principal',
//         'address' => 'Colombo',
//         'contact_email' => $email, // duplicate email
//         'contact_phone' => '0771234567',
//         'password' => '123456',
//         'student_count' => 450,
//         'facilities' => 9,
//         'area_type' => 'Urban',
//         'performance' => 72,
//         'prev_donations' => 0,
//     ]);

//     $res->assertStatus(422);
//     $res->assertJsonValidationErrors(['contact_email']);
// }


//    /** @test */
//     public function school_show_invalid_id_returns_404(): void
//     {
//         $res = $this->getJson('/api/schools/999999');
//         $res->assertStatus(404);
//         $res->assertJsonStructure(['message']);
//     }


//      /** @test */
//     public function school_me_requires_authentication(): void
//     {
//         $res = $this->getJson('/api/school/me');
//         $res->assertStatus(401);
//     }

}





















