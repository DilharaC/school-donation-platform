<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function kpisTodayWithWeeklyChange()
    {
        // TODAY window
        $todayStart = Carbon::today();
        $todayEnd   = Carbon::tomorrow();

        // LAST 7 DAYS (including today)
        $w1Start = Carbon::today()->subDays(6);   // 6 days ago 00:00
        $w1End   = Carbon::tomorrow();            // tomorrow 00:00

        // PREVIOUS 7 DAYS (the 7 days before last 7)
        $w0Start = Carbon::today()->subDays(13);  // 13 days ago 00:00
        $w0End   = Carbon::today()->subDays(6);   // 6 days ago 00:00

        // ---------- TODAY VALUES (card values) ----------
        $todayCampaigns = DB::table('donation_requests')
            ->where('status', 'Approved')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        $todayDonors = DB::table('donors')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        $todayDonationsCount = DB::table('donations')
            ->where('status', 'paid')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        $todayRaised = (float) DB::table('donations')
            ->where('status', 'paid')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->sum('amount');

        $todayAvg = $todayDonationsCount > 0 ? ($todayRaised / $todayDonationsCount) : 0;

        // ---------- WEEK 1 (last 7 days) ----------
        $w1Campaigns = DB::table('donation_requests')
            ->where('status', 'Approved')
            ->whereBetween('created_at', [$w1Start, $w1End])
            ->count();

        $w1Donors = DB::table('donors')
            ->whereBetween('created_at', [$w1Start, $w1End])
            ->count();

        $w1DonationsCount = DB::table('donations')
            ->where('status', 'paid')
            ->whereBetween('created_at', [$w1Start, $w1End])
            ->count();

        $w1Raised = (float) DB::table('donations')
            ->where('status', 'paid')
            ->whereBetween('created_at', [$w1Start, $w1End])
            ->sum('amount');

        $w1Avg = $w1DonationsCount > 0 ? ($w1Raised / $w1DonationsCount) : 0;

        // ---------- WEEK 0 (previous 7 days) ----------
        $w0Campaigns = DB::table('donation_requests')
            ->where('status', 'Approved')
            ->whereBetween('created_at', [$w0Start, $w0End])
            ->count();

        $w0Donors = DB::table('donors')
            ->whereBetween('created_at', [$w0Start, $w0End])
            ->count();

        $w0DonationsCount = DB::table('donations')
            ->where('status', 'paid')
            ->whereBetween('created_at', [$w0Start, $w0End])
            ->count();

        $w0Raised = (float) DB::table('donations')
            ->where('status', 'paid')
            ->whereBetween('created_at', [$w0Start, $w0End])
            ->sum('amount');

        $w0Avg = $w0DonationsCount > 0 ? ($w0Raised / $w0DonationsCount) : 0;

        // ---------- % helper (with NEW handling) ----------
        $pct = function ($current, $prev) {
            $current = (float) $current;
            $prev    = (float) $prev;

            if ($prev == 0) {
                if ($current == 0) return ["pct" => 0.0, "state" => "zero"];
                return ["pct" => null, "state" => "new"]; // ✅ best: show "NEW"
            }

            return ["pct" => (($current - $prev) / $prev) * 100, "state" => "ok"];
        };

        return response()->json([
            "today" => [
                "donors"     => $todayDonors,
                "raised"     => $todayRaised,
                "campaigns"  => $todayCampaigns,
                "avg"        => $todayAvg,
                "donations"  => $todayDonationsCount,
            ],
            "week" => [
                "current7" => [
                    "donors"     => $w1Donors,
                    "raised"     => $w1Raised,
                    "campaigns"  => $w1Campaigns,
                    "avg"        => $w1Avg,
                    "donations"  => $w1DonationsCount,
                ],
                "previous7" => [
                    "donors"     => $w0Donors,
                    "raised"     => $w0Raised,
                    "campaigns"  => $w0Campaigns,
                    "avg"        => $w0Avg,
                    "donations"  => $w0DonationsCount,
                ],
            ],
            "change7d" => [
                "donors"    => $pct($w1Donors, $w0Donors),
                "raised"    => $pct($w1Raised, $w0Raised),
                "campaigns" => $pct($w1Campaigns, $w0Campaigns),
                "avg"       => $pct($w1Avg, $w0Avg),
            ],
        ]);
    }
}