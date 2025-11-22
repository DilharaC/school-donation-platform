<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Donation;
use App\Models\DonationRequest;
use Illuminate\Support\Facades\Auth;
use Stripe\Stripe;
use Stripe\Checkout\Session as StripeSession;

class DonationController extends Controller
{
    /**
     * Create a donation and redirect to Stripe checkout
     */
    public function createDonation(Request $request)
    {
        $request->validate([
            'request_id' => 'required|integer',
            'amount' => 'required|numeric|min:1',
            'message' => 'nullable|string',
            'recurring' => 'nullable|string',
            'anonymous' => 'boolean',
        ]);

        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Determine donor ID and name
        $donorId = $user->donor_id ?? $user->id ?? null;
        $donorName = $user->full_name ?? $user->school_name ?? 'Anonymous';

        // Create donation in DB
        $donation = Donation::create([
            'request_id' => $request->request_id,
            'donor_id' => $donorId,
            'amount' => $request->amount,
            'message' => $request->message ?? null,
            'recurring' => $request->recurring ?? 'none',
            'anonymous' => $request->anonymous ?? 0,
            'donor_name' => $donorName,
            'donor_email' => $user->email,
            'status' => 'pending', // default pending until Stripe confirms
        ]);

        // Stripe checkout
        Stripe::setApiKey(env('STRIPE_SECRET'));
        $session = StripeSession::create([
            'payment_method_types' => ['card'],
            'customer_email' => $user->email,
            'line_items' => [[
                'price_data' => [
                    'currency' => 'usd',
                    'product_data' => ['name' => 'Donation to Request #' . $donation->request_id],
                    'unit_amount' => $donation->amount * 100,
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => env('FRONTEND_URL') . '/donation/success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => env('FRONTEND_URL') . '/donation/failed',
            'metadata' => ['donation_id' => $donation->donation_id],
        ]);

        // Save Stripe session ID
        $donation->update(['stripe_session_id' => $session->id]);

        return response()->json(['checkout_url' => $session->url]);
    }

    /**
     * Verify Stripe session and update donation & donation request
     */
    public function verifySession(Request $request)
    {
        $sessionId = $request->query('session_id');

        if (!$sessionId) {
            return response()->json(['status' => 'no_session'], 400);
        }

        try {
            Stripe::setApiKey(env('STRIPE_SECRET'));
            $session = StripeSession::retrieve($sessionId);

            // Find donation
            $donation = Donation::where('stripe_session_id', $sessionId)->first();
            if (!$donation) {
                return response()->json(['status' => 'donation_not_found'], 404);
            }

            // Only update if not already marked paid
            if ($session->payment_status === 'paid' && $donation->status !== 'paid') {
                $donation->update(['status' => 'paid']);

                // Update amount_raised in donation_requests
                $donationRequest = DonationRequest::find($donation->request_id);
                if ($donationRequest) {
                    $donationRequest->amount_raised = (float)$donationRequest->amount_raised + (float)$donation->amount;
                    $donationRequest->save();
                }

                return response()->json(['status' => 'success']);
            } elseif ($donation->status === 'paid') {
                return response()->json(['status' => 'already_paid']);
            } else {
                return response()->json(['status' => 'pending']);
            }

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
        }
    }
}
