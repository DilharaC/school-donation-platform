<?php

namespace App\Services\Chat;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiChatService
{
    // ─── Constants ────────────────────────────────────────────────────────────

    protected const MAX_HISTORY_ITEMS    = 10;
    protected const MAX_HISTORY_MSG_LEN  = 500;
    protected const GEMINI_JSON_TOKENS   = 900;
    protected const GEMINI_ANSWER_TOKENS = 700;
    protected const GEMINI_TIMEOUT       = 25;
    protected const GEMINI_CONNECT_TO    = 8;
    protected const RETRY_SLEEP_US       = 700_000;
    protected const SQL_LIST_LIMIT       = 10;

    protected array $geminiModels = [
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.5-pro',
    ];

    // ─── Allowed Schema ───────────────────────────────────────────────────────

    protected array $allowedTables = [
        'donors',
        'schools',
        'donations',
        'donation_requests',
        'fund_allocations',
    ];

    /**
     * Fields that must NEVER appear in any AI-generated SQL, regardless of context.
     */
    protected array $hiddenFields = [
        'password',
        'password_hash',
        'stripe_session_id',
        'stripe_customer_id',
        'stripe_payment_intent',
        'bank_account',
        'bank_name',
        'account_holder',
        'account_number',
        'routing_number',
        'secret',
        'token',
        'api_key',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * DML / DDL / dangerous keywords that must never appear in SELECT queries.
     */
    protected array $blockedSqlKeywords = [
        ' insert ', ' update ', ' delete ', ' drop ', ' alter ', ' truncate ',
        ' create ', ' replace ', ' grant ', ' revoke ', ' call ', ' exec ',
        ' execute ', ' information_schema', ' pg_', ' sys.', ' union ',
        ' into ', ' load ', ' outfile ', ' dumpfile ',
        '--', '/*', '*/', ';', 'xp_', 'sp_',
    ];

    // ─── Reaction / small-talk detection ─────────────────────────────────────

    /**
     * Short words / phrases that indicate a follow-up reaction rather than a
     * new query. When matched, we skip the planner and jump straight to the
     * answer-prompt with the previous bot turn as context.
     */
    protected array $reactionPhrases = [
        'seriously', 'siriously', 'really', 'really?', 'wow', 'nice', 'ok',
        'okay', 'yes', 'sure', 'thanks', 'thank you', 'cool', 'great',
        'awesome', 'ohh', 'oh', 'hmm', 'hm', 'lol', 'omg', 'whoa',
        'impressive', 'amazing', 'noted', 'got it', 'understood', 'k',
    ];

    /**
     * Greetings that need no DB call and should get a friendly direct reply.
     */
    protected array $greetingPhrases = [
        'hi', 'hello', 'hey', 'howdy', 'good morning', 'good afternoon',
        'good evening', 'hola', 'ayubowan', 'kohomada', 'hello there',
    ];

    // ─── Entry Point ──────────────────────────────────────────────────────────

    public function handle(array $actor, string $message, array $history = []): array
    {
        $apiKey = (string) env('GEMINI_API_KEY', '');

        if ($apiKey === '') {
            return $this->fail('AI service is currently unavailable. Please try again later.');
        }

        $message = trim($message);

        if ($message === '') {
            return $this->fail('Please enter a message.');
        }

        // Hard length guard – avoids prompt injection via huge messages
        if (mb_strlen($message) > 1500) {
            return $this->fail('Your message is too long. Please keep it under 1,500 characters.');
        }

        // Prompt-injection detection
        if ($this->looksLikePromptInjection($message)) {
            return $this->fail('I\'m sorry, I can only help with donation platform queries.');
        }

        try {
            $actorSafe   = $this->safeActorForPrompt($actor);
            $historyText = $this->historyText($history);

            // ── Fast-path: greeting ────────────────────────────────────────
            if ($this->isGreeting($message)) {
                return [
                    'reply'    => $this->greetingReply($actorSafe),
                    'used_db'  => false,
                    'sql'      => null,
                    'intent'   => 'greeting',
                ];
            }

            // ── Fast-path: reaction / follow-up ───────────────────────────
            if ($this->isReaction($message)) {
                $lastBotMsg = $this->lastBotMessage($history);
                $reply      = $this->handleReaction($actorSafe, $historyText, $message, $lastBotMsg, $apiKey);

                return [
                    'reply'   => $reply,
                    'used_db' => false,
                    'sql'     => null,
                    'intent'  => 'reaction',
                ];
            }

            // ── Planner phase ─────────────────────────────────────────────
            $plannerPrompt = $this->plannerPrompt($actorSafe, $historyText, $message);
            $rawPlan       = $this->askGemini($plannerPrompt, $apiKey, jsonMode: true);
            $plan          = $this->decodeAiJson($rawPlan);

            if (! is_array($plan)) {
                Log::warning('AiChatService: planner returned invalid JSON', ['raw' => $rawPlan]);
                return $this->fail('Sorry, I could not understand that clearly. Please rephrase your question.');
            }

            $needsDb     = (bool) ($plan['needs_db']  ?? false);
            $sql         = isset($plan['sql'])   ? trim((string) $plan['sql'])   : null;
            $directReply = isset($plan['reply']) ? trim((string) $plan['reply']) : null;
            $intent      = isset($plan['intent']) ? trim((string) $plan['intent']) : 'unknown';
            $confidence  = isset($plan['confidence']) ? (float) $plan['confidence'] : 1.0;

            // Low confidence – ask for clarification instead of guessing
            if ($confidence < 0.4) {
                return [
                    'reply'   => $directReply ?: 'I\'m not sure what you\'re asking. Could you rephrase that?',
                    'used_db' => false,
                    'sql'     => null,
                    'intent'  => 'clarification_needed',
                ];
            }

            // ── No DB needed ──────────────────────────────────────────────
            if (! $needsDb) {
                return [
                    'reply'   => $this->cleanReply($directReply ?: 'Sorry, I could not understand that clearly.'),
                    'used_db' => false,
                    'sql'     => null,
                    'intent'  => $intent,
                ];
            }

            // ── DB path ───────────────────────────────────────────────────
            $sql = $this->forceActorPlaceholders($sql, $actor);
            $sql = $this->normalizeSql($sql);

            if (! $this->isSafeSelectQuery($sql, $actor)) {
                Log::warning('AiChatService: unsafe SQL blocked', [
                    'sql'   => $sql,
                    'actor' => $actorSafe,
                ]);

                return [
                    'reply'   => 'Sorry, I cannot access that information.',
                    'used_db' => false,
                    'sql'     => config('app.debug') ? $sql : null,
                    'intent'  => $intent,
                ];
            }

            [$preparedSql, $bindings] = $this->prepareSqlAndBindings($sql, $actor);

            Log::debug('AiChatService SQL', [
                'sql'      => $preparedSql,
                'bindings' => $bindings,
                'intent'   => $intent,
            ]);

            $rows = DB::select($preparedSql, $bindings);

            // Guard: unexpectedly large result sets (shouldn't happen with LIMIT 10,
            // but double-check in case the AI omitted it)
            if (count($rows) > 50) {
                $rows = array_slice($rows, 0, 50);
            }

            $rowsJson = json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            $answerPrompt = $this->answerPrompt($actorSafe, $historyText, $message, $rowsJson, $intent);
            $answer       = trim($this->askGemini($answerPrompt, $apiKey, jsonMode: false));

            return [
                'reply'   => $this->cleanReply($answer ?: 'I found the data but could not format a reply properly.'),
                'used_db' => true,
                'sql'     => config('app.debug') ? $preparedSql : null,
                'intent'  => $intent,
            ];
        } catch (\Throwable $e) {
            Log::error('AiChatService failed', [
                'error'   => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
                'actor'   => $this->safeActorForPrompt($actor),
                'message' => $message,
            ]);

            return [
                'reply'   => config('app.debug')
                    ? 'DEBUG ERROR: ' . $e->getMessage()
                    : 'Something went wrong. Please try again in a moment.',
                'used_db' => false,
                'sql'     => null,
                'intent'  => 'error',
            ];
        }
    }

    // ─── Fast-path helpers ────────────────────────────────────────────────────

    protected function isGreeting(string $message): bool
    {
        $lower = strtolower(trim($message));
        foreach ($this->greetingPhrases as $phrase) {
            if ($lower === $phrase || str_starts_with($lower, $phrase . ' ') || str_starts_with($lower, $phrase . '!')) {
                return true;
            }
        }
        return false;
    }

 protected function isReaction(string $message): bool
{
    $lower = strtolower(trim(rtrim($message, '?!.')));

    // Exact reaction phrases only
    if (in_array($lower, $this->reactionPhrases, true)) {
        return true;
    }

    // Very short emotional reactions only
    if (
        mb_strlen($lower) <= 12 &&
        preg_match('/^(wow+|oh+|ah+|hmm+|hm+|lol+|ok+|okay+|nice+|cool+|seriously|really)$/i', $lower)
    ) {
        return true;
    }

    return false;
}
    protected function greetingReply(array $actor): string
    {
        $name = $actor['name'] ? ', ' . $actor['name'] : '';
        $role = $actor['role'] ?? 'guest';

        return match ($role) {
            'school'   => "Hello{$name}! 👋 I'm your school dashboard assistant. I can help you check donations, campaigns, and fund details. What would you like to know?",
            'donor'    => "Hi{$name}! 😊 Great to see you. I can help you check your donation history, find campaigns to support, or answer any questions. What's on your mind?",
            'ministry',
            'admin'    => "Hello{$name}! 👋 I'm here to help you with platform insights, approvals, and management queries. How can I assist you today?",
            default    => "Hello{$name}! 👋 Welcome to the donation platform. I can help you explore active campaigns and learn how to make a difference. How can I help?",
        };
    }

    protected function lastBotMessage(array $history): string
    {
        $reversed = array_reverse($history);
        foreach ($reversed as $item) {
            if (strtolower($item['role'] ?? '') === 'assistant' || strtolower($item['role'] ?? '') === 'bot') {
                return mb_substr(trim((string) ($item['message'] ?? '')), 0, 500);
            }
        }
        return '';
    }

    protected function handleReaction(
        array  $actor,
        string $historyText,
        string $message,
        string $lastBotMsg,
        string $apiKey
    ): string {
        $actorJson = json_encode($actor, JSON_UNESCAPED_UNICODE);

        $prompt = <<<PROMPT
You are a friendly donation platform assistant.

Actor:
{$actorJson}

Recent conversation:
{$historyText}

The user's last message is a short reaction or follow-up: "{$message}"
The previous assistant reply was: "{$lastBotMsg}"

Reply naturally and briefly to the reaction based on the previous assistant message.
Do NOT treat it as a new data request.
Keep it warm, human, and concise (1-2 sentences max).
Match the language style (casual Sinhala-English is fine).
PROMPT;

        $reply = trim($this->askGemini($prompt, $apiKey, jsonMode: false));
        return $this->cleanReply($reply ?: "Yes! 😊 {$lastBotMsg}");
    }

    // ─── Prompt-injection guard ───────────────────────────────────────────────

    protected function looksLikePromptInjection(string $message): bool
    {
        $lower = strtolower($message);

        $injectionPatterns = [
            'ignore previous instructions',
            'ignore all instructions',
            'forget your instructions',
            'you are now',
            'act as',
            'roleplay as',
            'pretend you are',
            'disregard the above',
            'new instructions:',
            'system prompt',
            'jailbreak',
            'bypass',
            'override instructions',
            'ignore the rules',
            'reveal your prompt',
            'show me your prompt',
            'what is your system prompt',
            'drop table',
            'or 1=1',
            "' or '",
            'select * from',
            'union select',
            'information_schema',
        ];

        foreach ($injectionPatterns as $pattern) {
            if (str_contains($lower, $pattern)) {
                return true;
            }
        }

        return false;
    }

    // ─── Planner prompt ───────────────────────────────────────────────────────

    protected function plannerPrompt(array $actor, string $historyText, string $message): string
    {
        $actorJson = json_encode($actor, JSON_UNESCAPED_UNICODE);
        $limit     = self::SQL_LIST_LIMIT;

        return <<<PROMPT
You are a smart planner for a Sri Lankan school donation platform.

Return ONLY valid JSON. No explanation, no markdown, no extra text.

━━━━━━━━━━━━━━━━━━━
ACTOR (current user)
━━━━━━━━━━━━━━━━━━━
{$actorJson}

━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION HISTORY
━━━━━━━━━━━━━━━━━━━━━━━
{$historyText}

━━━━━━━━━━━━━━━━━━
USER MESSAGE
━━━━━━━━━━━━━━━━━━
{$message}

━━━━━━━━━━━━━━━━━━━━
ROLE BEHAVIOUR RULES
━━━━━━━━━━━━━━━━━━━━
1. Always answer from the ACTOR'S perspective first.
2. school  → managing their own campaigns, receiving donations, fund details.
3. donor   → their own donation history, campaigns they can support.
4. ministry/admin → approvals, platform-wide management and statistics.
5. guest   → public campaign info only; NO donation/donor data.
6. Never give multi-role explanations unless the user explicitly asks.
7. Tailor every answer specifically to the current role.

━━━━━━━━━━━━━━━━━━━━━━
DATABASE / SQL RULES
━━━━━━━━━━━━━━━━━━━━━━
- Only SELECT statements.
- No semicolons.
- Use LIMIT {$limit} for list queries.
- Paid donation status = 'paid' (LOWER(d.status) = 'paid'), NEVER 'completed'.
- Money received by a school = fund_allocations.allocated_amount WHERE fa.status = 'active'.
- Public/approved campaigns: donation_requests.status = 'Approved'.
- Date field: COALESCE(d.paid_at, d.created_at).
- school role  → must use :actor_school_id (never hardcode the ID).
- donor role   → must use :actor_donor_id (never hardcode the ID).
- ministry/admin → may query across all records; still use :actor_ministry_id/:actor_admin_id if filtering.
- guest role → may only query donation_requests and schools (public data).
- NEVER expose: password, password_hash, stripe_session_id, stripe_customer_id,
  bank_account, bank_name, account_holder, account_number, secret, token, api_key,
  remember_token, two_factor_secret, two_factor_recovery_codes.
- NEVER use SELECT *.
- NEVER use UNION, INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, EXEC, CALL.
- NEVER query tables outside: donors, schools, donations, donation_requests, fund_allocations.
- Anonymous donors: CASE WHEN COALESCE(d.anonymous,0)=1 THEN 'Anonymous' ELSE COALESCE(NULLIF(TRIM(d.donor_name),''),'Anonymous') END.

━━━━━━━━━━━━━━━━━━━━━━━━
INTENT CLASSIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━
Classify the user's intent as one of:
  total_received | donation_count | latest_donation | campaign_list |
  campaign_detail | top_donor | donor_history | donor_total |
  public_campaigns | school_info | how_to_donate | greeting |
  reaction | off_topic | unknown

━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONFIDENCE SCORE (0.0 – 1.0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Set "confidence" based on how clearly you understood the message:
  1.0 = crystal clear | 0.7 = mostly clear | 0.4 = ambiguous | 0.2 = very unclear

━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT JSON FORMATS
━━━━━━━━━━━━━━━━━━━━━━━
No-DB reply:
{"needs_db":false,"sql":null,"reply":"your answer here","intent":"greeting","confidence":1.0}

DB query:
{"needs_db":true,"sql":"SELECT ...","reply":null,"intent":"total_received","confidence":0.9}

Low confidence (ask to clarify):
{"needs_db":false,"sql":null,"reply":"Could you clarify what you mean by ...?","intent":"unknown","confidence":0.3}

━━━━━━━━━━━━━━━━━━━
REFERENCE SQL SNIPPETS
━━━━━━━━━━━━━━━━━━━

-- School total received
SELECT COALESCE(SUM(fa.allocated_amount),0) AS total_received
FROM fund_allocations fa
JOIN donations d ON d.donation_id = fa.donation_id
WHERE fa.school_id = :actor_school_id
  AND fa.status = 'active'
  AND LOWER(d.status) = 'paid'

-- School donation count
SELECT COUNT(DISTINCT d.donation_id) AS donation_count
FROM fund_allocations fa
JOIN donations d ON d.donation_id = fa.donation_id
WHERE fa.school_id = :actor_school_id
  AND fa.status = 'active'
  AND LOWER(d.status) = 'paid'

-- School latest donation
SELECT
  CASE WHEN COALESCE(d.anonymous,0)=1 THEN 'Anonymous'
       ELSE COALESCE(NULLIF(TRIM(d.donor_name),''),'Anonymous') END AS donor_name,
  fa.allocated_amount AS amount,
  COALESCE(d.paid_at, d.created_at) AS donated_at,
  COALESCE(dr.request_title,'School Fund') AS request_title
FROM fund_allocations fa
JOIN donations d ON d.donation_id = fa.donation_id
LEFT JOIN donation_requests dr ON dr.request_id = fa.request_id
WHERE fa.school_id = :actor_school_id
  AND fa.status = 'active'
  AND LOWER(d.status) = 'paid'
ORDER BY COALESCE(d.paid_at, d.created_at) DESC
LIMIT 1

-- School campaigns (with progress %)
SELECT
  request_id, request_title, category,
  estimated_price, amount_raised,
  GREATEST(estimated_price - amount_raised, 0) AS remaining_amount,
  ROUND((amount_raised / NULLIF(estimated_price,0)) * 100, 1) AS progress_pct,
  status
FROM donation_requests
WHERE school_id = :actor_school_id
ORDER BY created_at DESC
LIMIT {$limit}

-- School top donor
SELECT
  donor_name,
  SUM(amount) AS total_donated_amount
FROM (
  SELECT
    CASE WHEN COALESCE(d.anonymous,0)=1 THEN CONCAT('Anonymous #', d.donation_id)
         ELSE COALESCE(NULLIF(TRIM(d.donor_name),''),'Anonymous') END AS donor_name,
    fa.allocated_amount AS amount
  FROM fund_allocations fa
  JOIN donations d ON d.donation_id = fa.donation_id
  WHERE fa.school_id = :actor_school_id
    AND fa.status = 'active'
    AND LOWER(d.status) = 'paid'
) x
GROUP BY donor_name
ORDER BY total_donated_amount DESC
LIMIT 1

-- School donations this month
SELECT COALESCE(SUM(fa.allocated_amount),0) AS monthly_received,
       COUNT(DISTINCT d.donation_id) AS donation_count
FROM fund_allocations fa
JOIN donations d ON d.donation_id = fa.donation_id
WHERE fa.school_id = :actor_school_id
  AND fa.status = 'active'
  AND LOWER(d.status) = 'paid'
  AND COALESCE(d.paid_at, d.created_at) >= DATE_FORMAT(NOW(),'%Y-%m-01')

-- School pending campaigns (still need funds)
SELECT request_id, request_title, category,
       estimated_price, amount_raised,
       GREATEST(estimated_price - amount_raised, 0) AS remaining_amount,
       ROUND((amount_raised / NULLIF(estimated_price,0)) * 100, 1) AS progress_pct
FROM donation_requests
WHERE school_id = :actor_school_id
  AND status = 'Approved'
  AND amount_raised < estimated_price
ORDER BY remaining_amount DESC
LIMIT {$limit}

-- Donor total donated
SELECT COALESCE(SUM(amount),0) AS total_donated
FROM donations
WHERE donor_id = :actor_donor_id
  AND LOWER(status) = 'paid'

-- Donor donation count
SELECT COUNT(*) AS donation_count
FROM donations
WHERE donor_id = :actor_donor_id
  AND LOWER(status) = 'paid'

-- Donor latest donation
SELECT
  d.amount,
  COALESCE(d.paid_at, d.created_at) AS donated_at,
  COALESCE(dr.request_title,'School Fund') AS request_title,
  s.school_name
FROM donations d
LEFT JOIN donation_requests dr ON dr.request_id = d.request_id
LEFT JOIN schools s ON s.school_id = COALESCE(dr.school_id, d.school_id)
WHERE d.donor_id = :actor_donor_id
  AND LOWER(d.status) = 'paid'
ORDER BY COALESCE(d.paid_at, d.created_at) DESC
LIMIT 1

-- Donor full donation history (last 10)
SELECT
  d.amount,
  COALESCE(d.paid_at, d.created_at) AS donated_at,
  COALESCE(dr.request_title,'School Fund') AS request_title,
  s.school_name
FROM donations d
LEFT JOIN donation_requests dr ON dr.request_id = d.request_id
LEFT JOIN schools s ON s.school_id = COALESCE(dr.school_id, d.school_id)
WHERE d.donor_id = :actor_donor_id
  AND LOWER(d.status) = 'paid'
ORDER BY COALESCE(d.paid_at, d.created_at) DESC
LIMIT {$limit}

-- Donor schools supported (unique)
SELECT DISTINCT s.school_name, s.district, s.province
FROM donations d
LEFT JOIN donation_requests dr ON dr.request_id = d.request_id
LEFT JOIN schools s ON s.school_id = COALESCE(dr.school_id, d.school_id)
WHERE d.donor_id = :actor_donor_id
  AND LOWER(d.status) = 'paid'
  AND s.school_name IS NOT NULL
LIMIT {$limit}

-- Public campaigns (by need score, guest/donor safe)
SELECT
  dr.request_id, dr.request_title, dr.category,
  dr.estimated_price, dr.amount_raised,
  GREATEST(dr.estimated_price - dr.amount_raised, 0) AS remaining_amount,
  ROUND((dr.amount_raised / NULLIF(dr.estimated_price,0)) * 100, 1) AS progress_pct,
  s.school_name, s.district, s.province, s.need_score
FROM donation_requests dr
JOIN schools s ON s.school_id = dr.school_id
WHERE dr.status = 'Approved'
  AND dr.amount_raised < dr.estimated_price
ORDER BY s.need_score DESC, dr.created_at DESC
LIMIT {$limit}

━━━━━━━━━━━━━━━━━━━━
SMALL TALK / HUMAN RULES
━━━━━━━━━━━━━━━━━━━━
- For greetings (hi/hello/ayubowan etc.): answer warmly, no DB needed.
- For "how to donate": explain the steps clearly, no DB needed.
- For "what is this platform": describe it briefly, no DB needed.
- For off-topic questions (weather, sports, politics etc.): politely decline and redirect.
- Sinhala-English mixed language is perfectly fine.
- Short reactions ("wow", "really?", "seriously") are follow-ups, not new queries.
- For misspellings, infer the most obvious meaning (e.g. "siriously" = "seriously").

PROMPT;
    }

    // ─── Answer prompt ────────────────────────────────────────────────────────

    protected function answerPrompt(
        array  $actor,
        string $historyText,
        string $message,
        string $rowsJson,
        string $intent = 'unknown'
    ): string {
        $actorJson = json_encode($actor, JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
You are a friendly, concise assistant for a Sri Lankan school donation platform.

━━━━━━━━
ACTOR
━━━━━━━━
{$actorJson}

━━━━━━━━━━━━━━━━
CONVERSATION
━━━━━━━━━━━━━━━━
{$historyText}

━━━━━━━━━━━━━━━━
USER MESSAGE
━━━━━━━━━━━━━━━━
{$message}

━━━━━━━━━━━━━━━━
QUERY INTENT
━━━━━━━━━━━━━━━━
{$intent}

━━━━━━
DATA
━━━━━━
{$rowsJson}

━━━━━━━━━━
RULES
━━━━━━━━━━
1. NEVER mention SQL, database, query, table, or column names.
2. Format all money as "LKR X,XXX.XX" (Sri Lankan Rupees with commas).
3. Dates: format as "12 Jan 2025" or "January 2025" — never raw timestamps.
4. If total is 0 → "No donations received yet."
5. If rows are empty → "No matching records found."
6. If request_title exists → mention where the donation went (e.g. "for the Library Renovation campaign").
7. If request_title is null or "School Fund" → say "to the school's general fund".
8. For lists use bullet "•" format — one item per line, short and scannable.
9. For campaign lists use:
   🎓 Campaign Name — LKR X,XXX remaining (XX% funded)
10. Use icons lightly: 💰 for totals, ❤️ for donations, 📍 for location, 🎯 for goals, ✅ for completed.
    Maximum 1–2 emojis per short sentence. Do NOT overuse them.
11. Progress percentage: always show it for campaigns (e.g. "45% funded").

ROLE-SPECIFIC TONE:
- school  → speak as the school's own dashboard ("your campaigns", "your donors").
             NEVER say "you can donate" or encourage the school to donate.
- donor   → warm and encouraging ("you've contributed", "great impact").
- ministry/admin → factual and professional.
- guest   → informative and welcoming.

REACTION HANDLING:
- If the message is a short reaction ("seriously?", "wow", "really?"),
  respond naturally based on the previous assistant message — do NOT re-query.
- Example: User says "seriously?" after being told total = LKR 140,700.
  Reply: "Yes! 😊 You've donated LKR 140,700.00 so far — that's a real difference."

LANGUAGE:
- Casual Sinhala-English mixing is fine.
- Friendly but not over-the-top. Avoid corporate-speak.
- Keep answers short unless the data genuinely warrants length.
- Infer misspellings naturally (e.g. "siriously" = "seriously").

PROMPT;
    }

    // ─── Gemini API ───────────────────────────────────────────────────────────

    protected function askGemini(string $prompt, string $apiKey, bool $jsonMode = false): string
    {
        $payload = [
            'contents' => [[
                'parts' => [['text' => $prompt]],
            ]],
            'generationConfig' => [
                'temperature'     => $jsonMode ? 0.05 : 0.25,
                'topP'            => 0.8,
                'topK'            => 20,
                'maxOutputTokens' => $jsonMode ? self::GEMINI_JSON_TOKENS : self::GEMINI_ANSWER_TOKENS,
            ],
        ];

        if ($jsonMode) {
            $payload['generationConfig']['responseMimeType'] = 'application/json';
        }

        $lastError = null;

        foreach ($this->geminiModels as $model) {
            for ($attempt = 1; $attempt <= 2; $attempt++) {
                try {
                    $response = Http::timeout(self::GEMINI_TIMEOUT)
                        ->connectTimeout(self::GEMINI_CONNECT_TO)
                        ->acceptJson()
                        ->contentType('application/json')
                        ->post(
                            "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}",
                            $payload
                        );

                    if ($response->successful()) {
                        $text = (string) data_get(
                            $response->json(),
                            'candidates.0.content.parts.0.text',
                            ''
                        );

                        // Check for safety blocks
                        $finishReason = data_get($response->json(), 'candidates.0.finishReason', '');
                        if ($finishReason === 'SAFETY') {
                            Log::warning('AiChatService: Gemini safety block', ['model' => $model]);
                            return $jsonMode
                                ? '{"needs_db":false,"sql":null,"reply":"I cannot help with that request.","intent":"blocked","confidence":1.0}'
                                : 'I cannot help with that request.';
                        }

                        return $text;
                    }

                    $status    = $response->status();
                    $lastError = "Gemini {$model} HTTP {$status}: {$response->body()}";

                    Log::warning('AiChatService: Gemini error', [
                        'model'  => $model,
                        'status' => $status,
                        'attempt' => $attempt,
                    ]);

                    // Only retry on transient errors
                    if (! in_array($status, [429, 500, 502, 503, 504], true)) {
                        break; // Move to next model immediately
                    }

                    usleep(self::RETRY_SLEEP_US);
                } catch (\Throwable $e) {
                    $lastError = "Gemini {$model} exception: " . $e->getMessage();
                    Log::warning('AiChatService: Gemini exception', [
                        'model'   => $model,
                        'error'   => $e->getMessage(),
                        'attempt' => $attempt,
                    ]);
                    usleep(self::RETRY_SLEEP_US);
                }
            }
        }

        throw new \RuntimeException($lastError ?: 'All Gemini models failed.');
    }

    // ─── SQL safety pipeline ──────────────────────────────────────────────────

    protected function forceActorPlaceholders(?string $sql, array $actor): ?string
    {
        if (! $sql) {
            return null;
        }

        $role = $actor['role'] ?? 'guest';

        if ($role === 'school' && ! empty($actor['school_id'])) {
            $id = (int) $actor['school_id'];

            // Replace aliased references: fa.school_id = 42
            $sql = preg_replace(
                '/\b(fa|d|dr|s|schools|donations|donation_requests|fund_allocations)\.school_id\s*=\s*' . $id . '\b/i',
                '$1.school_id = :actor_school_id',
                $sql
            );
            // Replace bare references: school_id = 42
            $sql = preg_replace(
                '/\bschool_id\s*=\s*' . $id . '\b/i',
                'school_id = :actor_school_id',
                $sql
            );
        }

        if ($role === 'donor' && ! empty($actor['donor_id'])) {
            $id = (int) $actor['donor_id'];

            $sql = preg_replace(
                '/\b(d|donations|donors)\.donor_id\s*=\s*' . $id . '\b/i',
                '$1.donor_id = :actor_donor_id',
                $sql
            );
            $sql = preg_replace(
                '/\bdonor_id\s*=\s*' . $id . '\b/i',
                'donor_id = :actor_donor_id',
                $sql
            );
        }

        return $sql;
    }

    protected function normalizeSql(?string $sql): ?string
    {
        if (! $sql) {
            return null;
        }

        // Strip trailing semicolons and collapse whitespace
        $sql = trim(rtrim($sql, ';'));
        $sql = preg_replace('/\s+/', ' ', $sql);

        // Normalise "completed" → "paid" across common patterns
        $completedVariants = [
            ["status = 'completed'",           "LOWER(status) = 'paid'"],
            ['status = "completed"',            "LOWER(status) = 'paid'"],
            ["d.status = 'completed'",          "LOWER(d.status) = 'paid'"],
            ['d.status = "completed"',          "LOWER(d.status) = 'paid'"],
            ["donations.status = 'completed'",  "LOWER(donations.status) = 'paid'"],
            ['donations.status = "completed"',  "LOWER(donations.status) = 'paid'"],
        ];

        foreach ($completedVariants as [$find, $replace]) {
            $sql = str_ireplace($find, $replace, $sql);
        }

        // Ensure LIMIT is present for queries with FROM (but not sub-queries with LIMIT already)
        // We only add a safety cap if a LIMIT is missing at the top-level
        if (stripos($sql, 'limit') === false && stripos($sql, 'from') !== false) {
            $sql .= ' LIMIT ' . self::SQL_LIST_LIMIT;
        }

        return $sql;
    }

    protected function isSafeSelectQuery(?string $sql, array $actor): bool
    {
        if (! $sql) {
            return false;
        }

        $normalized = strtolower(trim($sql));
        $normalized = preg_replace('/\s+/', ' ', $normalized);

        // Must start with SELECT
        if (! str_starts_with($normalized, 'select')) {
            return false;
        }

        // Must not contain hidden field names
        if (preg_match(
            '/\b(' . implode('|', array_map('preg_quote', $this->hiddenFields)) . ')\b/i',
            $sql
        )) {
            return false;
        }

        // Must not use SELECT *
        if (preg_match('/select\s+\*/i', $sql)) {
            return false;
        }

        // Must not contain blocked DML / dangerous keywords
        foreach ($this->blockedSqlKeywords as $keyword) {
            if (str_contains($normalized, $keyword)) {
                return false;
            }
        }

        // Must only reference allowed tables
        if (! $this->usesAllowedTablesOnly($normalized)) {
            return false;
        }

        // ── Role-based access control ──────────────────────────────────────
        $role = $actor['role'] ?? 'guest';

        $touchesDonations    = str_contains($normalized, 'from donations')
            || str_contains($normalized, 'join donations')
            || str_contains($normalized, 'from fund_allocations')
            || str_contains($normalized, 'join fund_allocations');

        $touchesRequests     = str_contains($normalized, 'from donation_requests')
            || str_contains($normalized, 'join donation_requests');

        $touchesDonors       = str_contains($normalized, 'from donors')
            || str_contains($normalized, 'join donors');

        // Guest: only public tables
        if ($role === 'guest' && ($touchesDonations || $touchesDonors)) {
            return false;
        }

        // School: donation/request queries must be scoped to their school
        if ($role === 'school' && ($touchesDonations || $touchesRequests)) {
            return str_contains($normalized, ':actor_school_id');
        }

        // Donor: donation/donor queries must be scoped to their account
        if ($role === 'donor' && ($touchesDonations || $touchesDonors)) {
            return str_contains($normalized, ':actor_donor_id');
        }

        // Ministry / admin: full access to allowed tables (no extra scoping required)
        // but still passes all checks above

        return true;
    }

    protected function usesAllowedTablesOnly(string $sql): bool
    {
        // Extract table names from FROM and JOIN clauses
        preg_match_all('/\b(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/i', $sql, $matches);

        foreach (($matches[1] ?? []) as $table) {
            if (! in_array(strtolower($table), $this->allowedTables, true)) {
                return false;
            }
        }

        return true;
    }

    protected function prepareSqlAndBindings(string $sql, array $actor): array
    {
        $bindings = [];

        $map = [
            ':actor_school_id'   => (int) ($actor['school_id']   ?? 0),
            ':actor_donor_id'    => (int) ($actor['donor_id']     ?? 0),
            ':actor_ministry_id' => (int) ($actor['ministry_id']  ?? 0),
            ':actor_admin_id'    => (int) ($actor['admin_id']     ?? 0),
        ];

        foreach ($map as $placeholder => $value) {
            // Replace one occurrence at a time to build the bindings array in order
            while (str_contains($sql, $placeholder)) {
                $sql        = preg_replace('/' . preg_quote($placeholder, '/') . '\b/', '?', $sql, 1);
                $bindings[] = $value;
            }
        }

        return [$sql, $bindings];
    }

    // ─── Utilities ────────────────────────────────────────────────────────────

    protected function decodeAiJson(string $text): ?array
    {
        $clean = trim($text);

        // Strip markdown fences
        $clean = preg_replace('/^```json\s*/i', '', $clean);
        $clean = preg_replace('/^```\s*/i', '', $clean);
        $clean = preg_replace('/\s*```$/', '', $clean);

        // Extract the outermost JSON object
        $first = strpos($clean, '{');
        $last  = strrpos($clean, '}');

        if ($first !== false && $last !== false && $last > $first) {
            $clean = substr($clean, $first, $last - $first + 1);
        }

        $decoded = json_decode($clean, true);

        return json_last_error() === JSON_ERROR_NONE && is_array($decoded)
            ? $decoded
            : null;
    }

    protected function historyText(array $history): string
    {
        if (empty($history)) {
            return 'No previous conversation.';
        }

        return collect($history)
            ->take(-self::MAX_HISTORY_ITEMS)
            ->map(function ($item) {
                $role    = strtoupper((string) ($item['role']    ?? 'unknown'));
                $message = mb_substr(trim((string) ($item['message'] ?? '')), 0, self::MAX_HISTORY_MSG_LEN);
                return "{$role}: {$message}";
            })
            ->implode("\n");
    }

    protected function cleanReply(string $reply): string
    {
        $reply = trim($reply);

        // Strip boilerplate AI phrases that add no value
        $strippedPhrases = [
            "I cannot provide an opinion on whether a donation amount is 'good' or not, as it is subjective.",
            "I cannot provide an opinion on whether a donation amount is good or not, as it is subjective.",
            "My purpose is to provide factual information and assist with your queries.",
            "As an AI, I don't have personal opinions.",
            "I'm just an AI assistant.",
            "I don't have access to real-time data.",
            "I cannot browse the internet.",
        ];

        foreach ($strippedPhrases as $phrase) {
            $reply = str_replace($phrase, '', $reply);
        }

        // Collapse multiple blank lines
        $reply = preg_replace('/\n{3,}/', "\n\n", $reply);

        return trim($reply) ?: 'Sorry, I could not process that clearly.';
    }

    protected function safeActorForPrompt(array $actor): array
    {
        return [
            'role'        => $actor['role']        ?? 'guest',
            'school_id'   => $actor['school_id']   ?? null,
            'donor_id'    => $actor['donor_id']     ?? null,
            'ministry_id' => $actor['ministry_id']  ?? null,
            'admin_id'    => $actor['admin_id']     ?? null,
            'name'        => $actor['name']         ?? null,
        ];
    }

    protected function fail(string $reply): array
    {
        return [
            'reply'   => $reply,
            'used_db' => false,
            'sql'     => null,
            'intent'  => 'error',
        ];
    }
}