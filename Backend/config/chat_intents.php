<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Public intents
    |--------------------------------------------------------------------------
    */
    'greet' => [
        'roles' => ['guest', 'donor', 'school', 'ministry', 'admin'],
        'needs_db' => false,
        'handler' => null,
        'public' => true,
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
        ],
        'keywords' => [
            'hi' => 2, 'hello' => 2, 'hey' => 2,
        ],
    ],

    'thanks' => [
        'roles' => ['guest', 'donor', 'school', 'ministry', 'admin'],
        'needs_db' => false,
        'handler' => null,
        'public' => true,
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'thank you', 'thanks', 'thx', 'ok thanks', 'thanks bro', 'thanks chat',
        ],
        'keywords' => [
            'thanks' => 2, 'thank' => 2, 'thx' => 2,
        ],
    ],

    'help' => [
        'roles' => ['guest', 'donor', 'school', 'ministry', 'admin'],
        'needs_db' => false,
        'handler' => null,
        'public' => true,
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'help', 'what can you do', 'what can i ask', 'commands', 'show help',
        ],
        'keywords' => [
            'help' => 2, 'commands' => 2,
        ],
    ],

    'donate_help' => [
        'roles' => ['guest', 'donor', 'school', 'ministry', 'admin'],
        'needs_db' => false,
        'handler' => null,
        'public' => true,
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'how to donate',
            'how can i donate',
            'how do i donate',
            'how we donate',
            'how can we donate',
            'donate help',
            'how donation works',
            'how do donations work',
        ],
        'keywords' => [
            'donate' => 2, 'donation' => 2, 'contribute' => 2,
        ],
    ],

    'auth_required' => [
        'roles' => ['guest'],
        'needs_db' => true,
        'handler' => null,
        'public' => true,
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [],
        'keywords' => [],
    ],

    /*
    |--------------------------------------------------------------------------
    | Donor
    |--------------------------------------------------------------------------
    */
    'donor_profile' => [
        'roles' => ['donor'],
        'needs_db' => true,
        'handler' => 'donorProfile',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'my profile', 'profile', 'my account', 'show my profile', 'account details',
        ],
        'keywords' => [
            'profile' => 3, 'account' => 2,
        ],
    ],

    'donor_total_donated' => [
        'roles' => ['donor'],
        'needs_db' => true,
        'handler' => 'donorTotalDonated',
        'period_allowed' => true,
        'top_n_allowed' => false,
        'phrases' => [
            'how much have i donated',
            'my total donated',
            'total i donated',
            'how much did i donate',
            'my donation total',
            'total donations',
            'my total donation',
        ],
        'keywords' => [
            'total' => 2, 'donat' => 3, 'donated' => 3, 'amount' => 1,
        ],
    ],

    'donor_recent_donations' => [
        'roles' => ['donor'],
        'needs_db' => true,
        'handler' => 'donorRecentDonations',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'show my donations', 'my donations', 'recent donations', 'donation history', 'list my donations', 'see my donations',
        ],
        'keywords' => [
            'recent' => 2, 'history' => 2, 'donat' => 3, 'my' => 1,
        ],
    ],

    'donor_last_donation' => [
        'roles' => ['donor'],
        'needs_db' => true,
        'handler' => 'donorLastDonation',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'last donation', 'my last donation', 'what is my last donation', 'when did i last donate',
        ],
        'keywords' => [
            'last' => 3, 'latest' => 3, 'recent' => 1, 'donat' => 3,
        ],
    ],

    'donor_last_donated_school' => [
        'roles' => ['donor'],
        'needs_db' => true,
        'handler' => 'donorLastDonatedSchool',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'what school did i donate last',
            'what school i donated last',
            'which school did i donate last',
            'which school i donate last',
            'last donated school',
            'where did i donate last',
            'last school donated',
            'what school was my last donation to',
            'what i donate last school',
        ],
        'keywords' => [
            'school' => 3, 'last' => 2, 'donat' => 3, 'where' => 1,
        ],
    ],

    'donor_allocations' => [
        'roles' => ['donor'],
        'needs_db' => true,
        'handler' => 'donorAllocations',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'allocation', 'allocations', 'where did my donation go', 'where was my donation allocated', 'my allocations', 'show allocations',
        ],
        'keywords' => [
            'allocation' => 3, 'allocated' => 3, 'where' => 1, 'donation' => 1,
        ],
    ],

    'donor_donation_count' => [
        'roles' => ['donor'],
        'needs_db' => true,
        'handler' => 'donorDonationCount',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'my donation count', 'how many donations did i make', 'how many times did i donate',
        ],
        'keywords' => [
            'count' => 3, 'how many' => 2, 'donat' => 3, 'times' => 1,
        ],
    ],

    'donor_average_donation' => [
        'roles' => ['donor'],
        'needs_db' => true,
        'handler' => 'donorAverageDonation',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'what is my average donation', 'average donation', 'average amount i donate', 'how much do i donate on average',
        ],
        'keywords' => [
            'average' => 3, 'avg' => 3, 'donat' => 2,
        ],
    ],

    'donor_recent_supported_schools' => [
        'roles' => ['donor'],
        'needs_db' => true,
        'handler' => 'donorRecentSupportedSchools',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'which schools did i support recently', 'recent schools i donated to', 'supported schools',
        ],
        'keywords' => [
            'schools' => 3, 'support' => 2, 'recent' => 2, 'donat' => 2,
        ],
    ],

    'donor_recent_supported_campaigns' => [
        'roles' => ['donor'],
        'needs_db' => true,
        'handler' => 'donorRecentSupportedCampaigns',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'recent campaigns i supported', 'campaigns i donated recently', 'supported campaigns',
        ],
        'keywords' => [
            'campaign' => 3, 'support' => 2, 'recent' => 2, 'donat' => 2,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | School
    |--------------------------------------------------------------------------
    */
    'school_financial_overview' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolFinancialOverview',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'how much did we raise', 'how much have we raised', 'financial overview',
            'fund summary', 'raised this month', 'school overview', 'donation overview', 'summary',
        ],
        'keywords' => [
            'raise' => 3, 'raised' => 3, 'financial' => 2, 'overview' => 2, 'summary' => 2, 'fund' => 2,
        ],
    ],

    'school_financial_period' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolFinancialPeriod',
        'period_allowed' => true,
        'top_n_allowed' => false,
        'phrases' => [],
        'keywords' => [
            'today' => 2, 'yesterday' => 2, 'week' => 2, 'month' => 2, 'year' => 2,
            'raised' => 2, 'received' => 2, 'donation' => 2, 'summary' => 1,
        ],
    ],

    'school_financial_avg' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolFinancialAvg',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'average donation', 'avg donation', 'average gift',
        ],
        'keywords' => [
            'average' => 3, 'avg' => 3, 'gift' => 2, 'donation' => 2,
        ],
    ],

    'school_largest_donation' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolLargestDonation',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'largest donation', 'biggest donation', 'highest donation', 'largest gift',
        ],
        'keywords' => [
            'largest' => 3, 'biggest' => 3, 'highest' => 3, 'donation' => 2, 'gift' => 2,
        ],
    ],

    'school_top_donors' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolTopDonors',
        'period_allowed' => false,
        'top_n_allowed' => true,
        'phrases' => [
            'top donors', 'who donated the most', 'biggest donors', 'highest donors', 'top 3 donors', 'top 5 donors', 'top 10 donors',
        ],
        'keywords' => [
            'top' => 3, 'most' => 2, 'biggest' => 2, 'highest' => 2, 'donor' => 3,
        ],
    ],

    'school_donors_count' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolDonorsCount',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'donor count', 'how many donors', 'unique donors', 'number of donors',
        ],
        'keywords' => [
            'donor' => 3, 'count' => 3, 'how many' => 2, 'unique' => 2,
        ],
    ],

    'school_new_donors' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolNewDonors',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'new donors', 'first time donors', 'first-time donors',
        ],
        'keywords' => [
            'new' => 2, 'first' => 2, 'donors' => 3,
        ],
    ],

    'school_repeat_donors' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolRepeatDonors',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'repeat donors', 'loyal donors', 'returning donors',
        ],
        'keywords' => [
            'repeat' => 3, 'loyal' => 2, 'returning' => 2, 'donors' => 3,
        ],
    ],

    'school_campaigns_count' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolCampaignsCount',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'campaign count', 'how many campaigns', 'campaign summary', 'total campaigns',
        ],
        'keywords' => [
            'campaign' => 3, 'count' => 2, 'summary' => 1, 'total' => 1,
        ],
    ],

    'school_campaigns_progress' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolCampaignsProgress',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'campaign progress', 'goal progress', 'funding progress', 'campaign goals',
        ],
        'keywords' => [
            'campaign' => 2, 'progress' => 3, 'goal' => 2, 'funding' => 2,
        ],
    ],

    'school_campaigns_recent' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolCampaignsRecent',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'recent campaigns', 'latest campaigns', 'new campaigns',
        ],
        'keywords' => [
            'recent' => 2, 'latest' => 2, 'new' => 1, 'campaigns' => 3,
        ],
    ],

    'school_last_campaign' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolLastCampaign',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'what is my last campaign', 'my last campaign', 'last campaign', 'what was my last campaign',
            'show my last campaign', 'latest campaign', 'most recent campaign', 'newest campaign',
            'recent campaign', 'our last campaign', 'latest school campaign',
        ],
        'keywords' => [
            'last' => 2, 'latest' => 2, 'recent' => 2, 'newest' => 2, 'campaign' => 3,
        ],
    ],

    'school_profile' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolProfile',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'school profile', 'our school', 'school info', 'school details',
        ],
        'keywords' => [
            'school' => 2, 'profile' => 3, 'info' => 1, 'details' => 1,
        ],
    ],

    'school_recent_donations' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolRecentDonations',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'recent donations', 'latest donations', 'last donations',
        ],
        'keywords' => [
            'recent' => 2, 'latest' => 2, 'last' => 1, 'donations' => 3,
        ],
    ],

    'school_last_donation' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolLastDonation',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'last donation',
            'when was the last donation',
            'who donated last',
            'last donor',
            'latest donor',
            'who is the last donor',
            'who donated most recently',
            'most recent donor',
            'who gave us money last',
            'who gave money to our school most recently',
        ],
        'keywords' => [
            'last' => 3, 'latest' => 3, 'recent' => 2, 'recently' => 2,
            'donor' => 3, 'donation' => 2, 'donat' => 2, 'gave' => 2, 'money' => 1,
        ],
    ],

    'school_total_received' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolTotalReceived',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'total received', 'how much money did we receive', 'total funds received', 'total donations received',
        ],
        'keywords' => [
            'total' => 2, 'received' => 3, 'money' => 2, 'funds' => 2, 'donations' => 2,
        ],
    ],

    'school_active_campaigns' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolActiveCampaigns',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'active campaigns', 'running campaigns', 'approved campaigns count',
        ],
        'keywords' => [
            'active' => 2, 'running' => 2, 'approved' => 2, 'campaigns' => 3,
        ],
    ],

    'school_pending_campaigns' => [
        'roles' => ['school'],
        'needs_db' => true,
        'handler' => 'schoolPendingCampaigns',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'pending campaigns', 'waiting campaigns', 'campaigns not approved',
        ],
        'keywords' => [
            'pending' => 3, 'waiting' => 2, 'campaigns' => 3, 'approved' => 1,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Ministry
    |--------------------------------------------------------------------------
    */
    'ministry_overview' => [
        'roles' => ['ministry'],
        'needs_db' => true,
        'handler' => 'ministryOverview',
        'period_allowed' => true,
        'top_n_allowed' => false,
        'phrases' => [
            'ministry overview', 'system overview', 'dashboard', 'overview', 'platform overview',
        ],
        'keywords' => [
            'overview' => 3, 'dashboard' => 2, 'platform' => 2, 'ministry' => 2,
        ],
    ],

    'ministry_recent_donations' => [
        'roles' => ['ministry'],
        'needs_db' => true,
        'handler' => 'ministryRecentDonations',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'recent donations', 'latest donations', 'platform recent donations',
        ],
        'keywords' => [
            'recent' => 2, 'latest' => 2, 'donations' => 3, 'platform' => 1,
        ],
    ],

    'ministry_top_campaigns' => [
        'roles' => ['ministry'],
        'needs_db' => true,
        'handler' => 'ministryTopCampaigns',
        'period_allowed' => true,
        'top_n_allowed' => false,
        'phrases' => [
            'top campaigns', 'best campaigns', 'highest campaigns',
        ],
        'keywords' => [
            'top' => 2, 'best' => 2, 'highest' => 2, 'campaigns' => 3,
        ],
    ],

    'ministry_top_provinces' => [
        'roles' => ['ministry'],
        'needs_db' => true,
        'handler' => 'ministryTopProvinces',
        'period_allowed' => true,
        'top_n_allowed' => false,
        'phrases' => [
            'top provinces', 'best provinces', 'province summary', 'province donations',
        ],
        'keywords' => [
            'province' => 3, 'provinces' => 3, 'top' => 2, 'summary' => 1, 'donations' => 1,
        ],
    ],

    'ministry_donors_summary' => [
        'roles' => ['ministry'],
        'needs_db' => true,
        'handler' => 'ministryDonorsSummary',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'donor summary', 'donors summary', 'donor stats', 'donor overview',
        ],
        'keywords' => [
            'donor' => 3, 'summary' => 2, 'stats' => 2, 'overview' => 1,
        ],
    ],

    'ministry_schools_map' => [
        'roles' => ['ministry'],
        'needs_db' => true,
        'handler' => 'ministrySchoolsMap',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'schools map', 'map summary', 'school map',
        ],
        'keywords' => [
            'school' => 2, 'schools' => 2, 'map' => 3, 'summary' => 1,
        ],
    ],

    'ministry_schools_count' => [
        'roles' => ['ministry'],
        'needs_db' => true,
        'handler' => 'ministrySchoolsCount',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'how many schools', 'schools count', 'total schools', 'number of schools',
        ],
        'keywords' => [
            'schools' => 3, 'count' => 2, 'total' => 1, 'number' => 1,
        ],
    ],

    'ministry_campaigns_count' => [
        'roles' => ['ministry'],
        'needs_db' => true,
        'handler' => 'ministryCampaignsCount',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'how many campaigns', 'campaign count', 'total campaigns', 'number of campaigns',
        ],
        'keywords' => [
            'campaign' => 3, 'count' => 2, 'total' => 1,
        ],
    ],

    'ministry_total_raised' => [
        'roles' => ['ministry'],
        'needs_db' => true,
        'handler' => 'ministryTotalRaised',
        'period_allowed' => true,
        'top_n_allowed' => false,
        'phrases' => [
            'total money raised', 'how much money platform raised', 'total donations in system',
        ],
        'keywords' => [
            'total' => 2, 'raised' => 3, 'money' => 1, 'platform' => 1, 'system' => 1,
        ],
    ],

    'ministry_active_schools' => [
        'roles' => ['ministry'],
        'needs_db' => true,
        'handler' => 'ministryActiveSchools',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'how many active schools', 'active schools count',
        ],
        'keywords' => [
            'active' => 3, 'schools' => 3, 'count' => 2,
        ],
    ],

    'ministry_pending_schools' => [
        'roles' => ['ministry'],
        'needs_db' => true,
        'handler' => 'ministryPendingSchools',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'pending schools', 'schools waiting approval',
        ],
        'keywords' => [
            'pending' => 3, 'schools' => 3, 'approval' => 1, 'waiting' => 1,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Admin
    |--------------------------------------------------------------------------
    */
    'admin_dashboard_kpis' => [
        'roles' => ['admin'],
        'needs_db' => true,
        'handler' => 'adminDashboardKpis',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'today kpis', 'dashboard kpis', 'admin dashboard', 'today dashboard',
        ],
        'keywords' => [
            'dashboard' => 3, 'kpis' => 3, 'today' => 2, 'admin' => 2,
        ],
    ],

    'admin_ledger_recent' => [
        'roles' => ['admin'],
        'needs_db' => true,
        'handler' => 'adminLedgerRecent',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'recent ledger', 'ledger entries', 'ledger', 'latest ledger',
        ],
        'keywords' => [
            'ledger' => 4, 'recent' => 1, 'latest' => 1,
        ],
    ],

    'admin_contact_messages' => [
        'roles' => ['admin'],
        'needs_db' => true,
        'handler' => 'adminContactMessages',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'contact messages', 'messages', 'recent contact messages',
        ],
        'keywords' => [
            'contact' => 2, 'messages' => 3, 'message' => 3,
        ],
    ],

    'admin_schools_count' => [
        'roles' => ['admin'],
        'needs_db' => true,
        'handler' => 'adminSchoolsCount',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'how many schools', 'schools count', 'total schools', 'number of schools',
        ],
        'keywords' => [
            'schools' => 3, 'count' => 2, 'total' => 1,
        ],
    ],

    'admin_campaigns_count' => [
        'roles' => ['admin'],
        'needs_db' => true,
        'handler' => 'adminCampaignsCount',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'how many campaigns', 'campaign count', 'total campaigns',
        ],
        'keywords' => [
            'campaign' => 3, 'count' => 2, 'total' => 1,
        ],
    ],

    'admin_donors_count' => [
        'roles' => ['admin'],
        'needs_db' => true,
        'handler' => 'adminDonorsCount',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'how many donors', 'donors count', 'total donors',
        ],
        'keywords' => [
            'donors' => 3, 'count' => 2, 'total' => 1,
        ],
    ],

    'admin_recent_registrations' => [
        'roles' => ['admin'],
        'needs_db' => true,
        'handler' => 'adminRecentRegistrations',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'new registrations', 'recent users', 'recent registrations',
        ],
        'keywords' => [
            'registrations' => 3, 'recent' => 1, 'new' => 1, 'users' => 1,
        ],
    ],

    'admin_recent_school_requests' => [
        'roles' => ['admin'],
        'needs_db' => true,
        'handler' => 'adminRecentSchoolRequests',
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [
            'recent school requests', 'pending school approvals',
        ],
        'keywords' => [
            'school' => 2, 'requests' => 3, 'pending' => 1, 'approvals' => 1,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Restricted replies
    |--------------------------------------------------------------------------
    */
    'restricted_global_schools_count' => [
        'roles' => ['donor', 'school', 'guest'],
        'needs_db' => false,
        'handler' => null,
        'public' => true,
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [],
        'keywords' => [],
    ],

    'restricted_global_donors_count' => [
        'roles' => ['donor', 'school', 'guest'],
        'needs_db' => false,
        'handler' => null,
        'public' => true,
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [],
        'keywords' => [],
    ],

    'restricted_global_campaigns_count' => [
        'roles' => ['donor', 'school', 'guest'],
        'needs_db' => false,
        'handler' => null,
        'public' => true,
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [],
        'keywords' => [],
    ],

    'restricted_admin_only' => [
        'roles' => ['guest', 'donor', 'school', 'ministry'],
        'needs_db' => false,
        'handler' => null,
        'public' => true,
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [],
        'keywords' => [],
    ],

    'restricted_ministry_only' => [
        'roles' => ['guest', 'donor', 'school', 'admin'],
        'needs_db' => false,
        'handler' => null,
        'public' => true,
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [],
        'keywords' => [],
    ],

    'restricted_other_user_data' => [
        'roles' => ['guest', 'donor', 'school', 'ministry', 'admin'],
        'needs_db' => false,
        'handler' => null,
        'public' => true,
        'period_allowed' => false,
        'top_n_allowed' => false,
        'phrases' => [],
        'keywords' => [],
    ],
];