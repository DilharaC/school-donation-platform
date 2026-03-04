

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('fund_allocations', function (Blueprint $table) {
            $table->bigIncrements('allocation_id');

            $table->unsignedBigInteger('donation_id');
            $table->unsignedBigInteger('school_id');

            // allocate to request (campaign) OR to school fund (request_id null)
            $table->unsignedBigInteger('request_id')->nullable();

            $table->decimal('allocated_amount', 12, 2);

            $table->string('allocation_type')->default('request'); // request | school_fund
            $table->string('status')->default('active'); // active | reversed

            $table->timestamps();

            $table->index(['donation_id']);
            $table->index(['school_id']);
            $table->index(['request_id']);

            // Optional FKs if your tables are standard:
            // $table->foreign('donation_id')->references('donation_id')->on('donations');
            // $table->foreign('school_id')->references('school_id')->on('schools');
            // $table->foreign('request_id')->references('request_id')->on('donation_requests');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fund_allocations');
    }
};