<?php
namespace Tests\Feature;
use Tests\TestCase;
class DonationRequestApiTest extends TestCase
{
   
   /** @test */
    public function show_campaign_invalid_id_returns_404(): void
    {
        $res = $this->getJson('/api/donation_requests/999999');
        $res->assertStatus(404);
        $res->assertJsonStructure(['message']);
    }

      /** @test */
    public function list_campaigns_returns_200(): void
    {
        $res = $this->getJson('/api/donation_requests');
        $res->assertStatus(200);
        $res->assertJsonStructure([
            'projects',
            'total',
            'summary' => ['total_requests','approved_count','pending_count','total_raised','total_target']
        ]);
    }

    
 /** @test */
    public function upload_evidence_requires_files(): void
    {
        $res = $this->postJson('/api/donation_requests/1/evidences', [
            'note' => 'test note'
        ]);
        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['files']);
    }

    
      /** @test */
    public function create_request_requires_school_authentication(): void
    {
        $res = $this->postJson('/api/request/create', [
            'request_title' => 'Test',
            'category' => 'Books',
            'quantity' => 1,
            'estimated_price' => 1000,
            'description' => 'Test desc'
        ]);

        $res->assertStatus(401);
    }
   /** @test */
    public function my_requests_requires_school_authentication(): void
    {
        $res = $this->getJson('/api/my-requests');
        $res->assertStatus(401);
    }


   
}



 




 

    
  

  


