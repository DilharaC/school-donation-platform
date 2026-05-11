<?php

namespace App\Services\Chat;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiChatService
{
    protected array $allowedTables = [
        'donors',
        'schools',
        'donations',
        'donation_requests',
        'fund_allocations',
    ];

    protected array $hiddenFields = [
        'password',
        'password_hash',
        'stripe_session_id',
        'bank_account',
        'bank_name',
        'account_holder',
    ];

    public function handle(array $actor, string $message, array $history = []): array
    {
        $apiKey = (string) env('GEMINI_API_KEY', '');

        if ($apiKey === '') {
            return $this->fail('AI key is missing.');
        }

        try {
            $message = trim($message);

            if ($message === '') {
                return $this->fail('Please enter a message.');
            }

            $actorSafe = $this->safeActorForPrompt($actor);
            $historyText = $this->historyText($history);

            $plannerPrompt = $this->plannerPrompt($actorSafe, $historyText, $message);

            $rawPlan = $this->askGemini($plannerPrompt, $apiKey, true);
            $plan = $this->decodeAiJson($rawPlan);

            if (!is_array($plan)) {
                return $this->fail('Sorry, I could not understand that clearly.');
            }

            $needsDb = (bool) ($plan['needs_db'] ?? false);
            $sql = isset($plan['sql']) ? trim((string) $plan['sql']) : null;
            $directReply = isset($plan['reply']) ? trim((string) $plan['reply']) : null;

            if (!$needsDb) {
                return [
                    'reply' => $this->cleanReply($directReply ?: 'Sorry, I could not understand that clearly.'),
                    'used_db' => false,
                    'sql' => null,
                ];
            }

            $sql = $this->forceActorPlaceholders($sql, $actor);
            $sql = $this->normalizeSql($sql);

            if (!$this->isSafeSelectQuery($sql, $actor)) {
                return [
                    'reply' => 'Sorry, I cannot access that information.',
                    'used_db' => false,
                    'sql' => config('app.debug') ? $sql : null,
                ];
            }

            [$preparedSql, $bindings] = $this->prepareSqlAndBindings($sql, $actor);

            Log::debug('AiChatService SQL', [
                'sql' => $preparedSql,
                'bindings' => $bindings,
            ]);

            $rows = DB::select($preparedSql, $bindings);

         $answerPrompt = $this->answerPrompt(
    $actorSafe,
    $historyText,
    $message,
    json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
);

            $answer = trim($this->askGemini($answerPrompt, $apiKey, false));

            return [
                'reply' => $this->cleanReply($answer ?: 'I found the data, but could not format the reply properly.'),
                'used_db' => true,
                'sql' => config('app.debug') ? $preparedSql : null,
            ];
        } catch (\Throwable $e) {
            Log::error('AiChatService failed', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'actor' => $this->safeActorForPrompt($actor),
                'message' => $message,
            ]);

            return [
                'reply' => config('app.debug')
                    ? 'DEBUG ERROR: ' . $e->getMessage()
                    : 'Request timed out. Please try again.',
                'used_db' => false,
                'sql' => null,
            ];
        }
    }

    protected function plannerPrompt(array $actor, string $historyText, string $message): string
    {
        $actorJson = json_encode($actor, JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
You are a smart assistant for a Sri Lankan school donation platform.

Return ONLY valid JSON.

Actor:
{$actorJson}

History:
{$historyText}

User message:
{$message}

Database rules:
- Paid donation status is paid, never completed.
- School received money = fund_allocations.allocated_amount.
- Use fa.status = 'active'.
- Use LOWER(d.status) = 'paid'.
- Use COALESCE(d.paid_at,d.created_at) for donation date.
- Approved public campaigns use donation_requests.status = 'Approved'.
- Do not expose password, password_hash, stripe_session_id, bank details.
- Only SELECT.
- No semicolon.
- Use LIMIT 10 for lists.
- School role must use :actor_school_id.
- Donor role must use :actor_donor_id.
- Never hardcode real actor IDs.
- Always understand the user message based on Actor role first.
- School users are usually asking about managing their own campaigns and requests.
- Donor users are usually asking about donations and supported campaigns.
- Ministry/admin users are usually asking about approvals and management.
- Do not give generic multi-role explanations unless necessary.
- Tailor answers directly to the current actor role.
- Always answer from the perspective of the current Actor role first.
- Never explain features for unrelated roles unless explicitly asked.

JSON formats:
{"needs_db":false,"sql":null,"reply":"answer"}
{"needs_db":true,"sql":"SELECT ...","reply":null}

Useful SQL:

School total received:
SELECT COALESCE(SUM(fa.allocated_amount),0) AS total_received FROM fund_allocations fa JOIN donations d ON d.donation_id = fa.donation_id WHERE fa.school_id = :actor_school_id AND fa.status = 'active' AND LOWER(d.status) = 'paid'

School donation count:
SELECT COUNT(DISTINCT d.donation_id) AS donation_count FROM fund_allocations fa JOIN donations d ON d.donation_id = fa.donation_id WHERE fa.school_id = :actor_school_id AND fa.status = 'active' AND LOWER(d.status) = 'paid'

School latest donation:
SELECT CASE WHEN COALESCE(d.anonymous,0)=1 THEN 'Anonymous' ELSE COALESCE(NULLIF(TRIM(d.donor_name),''),'Anonymous') END AS donor_name, fa.allocated_amount AS amount, COALESCE(d.paid_at,d.created_at) AS donated_at, COALESCE(dr.request_title,'School Fund') AS request_title FROM fund_allocations fa JOIN donations d ON d.donation_id = fa.donation_id LEFT JOIN donation_requests dr ON dr.request_id = fa.request_id WHERE fa.school_id = :actor_school_id AND fa.status = 'active' AND LOWER(d.status) = 'paid' ORDER BY COALESCE(d.paid_at,d.created_at) DESC LIMIT 1

School campaigns:
SELECT request_id, request_title, category, estimated_price, amount_raised, GREATEST(estimated_price - amount_raised,0) AS remaining_amount, status FROM donation_requests WHERE school_id = :actor_school_id ORDER BY created_at DESC LIMIT 10

Donor total:
SELECT COALESCE(SUM(amount),0) AS total_donated FROM donations WHERE donor_id = :actor_donor_id AND LOWER(status) = 'paid'

Donor latest:
SELECT d.amount, COALESCE(d.paid_at,d.created_at) AS donated_at, COALESCE(dr.request_title,'School Fund') AS request_title, s.school_name FROM donations d LEFT JOIN donation_requests dr ON dr.request_id = d.request_id LEFT JOIN schools s ON s.school_id = COALESCE(dr.school_id,d.school_id) WHERE d.donor_id = :actor_donor_id AND LOWER(d.status) = 'paid' ORDER BY COALESCE(d.paid_at,d.created_at) DESC LIMIT 1

Public campaigns:
SELECT dr.request_id, dr.request_title, dr.category, dr.estimated_price, dr.amount_raised, GREATEST(dr.estimated_price - dr.amount_raised,0) AS remaining_amount, s.school_name, s.district, s.province, s.need_score FROM donation_requests dr JOIN schools s ON s.school_id = dr.school_id WHERE dr.status = 'Approved' ORDER BY s.need_score DESC, dr.created_at DESC LIMIT 10

School top donor:
SELECT 
  donor_name,
  SUM(amount) AS total_donated_amount
FROM (
  SELECT 
    CASE 
      WHEN COALESCE(d.anonymous,0)=1 THEN CONCAT('Anonymous #', d.donation_id)
      ELSE COALESCE(NULLIF(TRIM(d.donor_name),''),'Anonymous')
    END AS donor_name,
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

Human rules:
- For hi/hello, answer friendly.
- For how to donate, explain steps.
- For opinion about donations, be positive and helpful.
- Sinhala-English casual language is okay.
- Actor role is extremely important for direct replies too.

PROMPT;
    }

  protected function answerPrompt(array $actor, string $historyText, string $message, string $rowsJson): string
{
    $actorJson = json_encode($actor, JSON_UNESCAPED_UNICODE);

    return <<<PROMPT
You are a friendly donation platform assistant.

Actor:
{$actorJson}

History:
{$historyText}

User message:
{$message}

Data:
{$rowsJson}

Write a short natural answer.

Rules:
- Do not mention SQL/database/query/table.
- Format money as LKR with commas.
- If 0, say no donations received for that period.
- If empty, say no matching data found.
- If request_title exists, explain where donation went.
- If School Fund, say it went to school fund.
- Use short bullets for lists.
- Be helpful and positive.
- Understand short follow-up reactions using conversation history.
- If user says things like "seriously", "really", "siriously", "wow", "nice", "ok", "yes", "sure", "thanks",
  do NOT treat it as a new request.
- Reply naturally based on the previous bot message.
- Example:
  User: "seriously?"
  Previous bot said total donated amount.
  Reply: "Yes 😊 Your total donated amount is LKR 140,700.00 so far."
- For misspellings, infer the closest common meaning when obvious.
- If actor role is school, speak as the school dashboard assistant.
- For school users, do NOT say "your contribution", "you can donate", or ask them to donate.
- For school campaigns, say "your active campaigns", "still open for donations", or "still need support".
- If actor role is donor or guest, donation encouragement is okay.
- For lists, use clean bullet dots like "•" instead of long paragraphs.
- Keep each bullet short and easy to scan.
- For campaign lists, use this format:
  • Campaign name — LKR amount remaining
  - Use friendly emojis/icons lightly to improve readability.
- For campaign lists, use icons like 🎓 📍 🎯 💰 ✅.
- For donation totals, use 💰 or ❤️.
- Do not overuse emojis. Maximum 1-2 emojis per short sentence.

PROMPT;
    }

    protected function askGemini(string $prompt, string $apiKey, bool $jsonMode = false): string
{
 $models = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
];

    $payload = [
        'contents' => [[
            'parts' => [['text' => $prompt]],
        ]],
        'generationConfig' => [
            'temperature' => $jsonMode ? 0.05 : 0.25,
            'topP' => 0.8,
            'topK' => 20,
            'maxOutputTokens' => $jsonMode ? 900 : 700,
        ],
    ];

    if ($jsonMode) {
        $payload['generationConfig']['responseMimeType'] = 'application/json';
    }

    $lastError = null;

    foreach ($models as $model) {
        for ($i = 1; $i <= 2; $i++) {
            try {
                $response = Http::timeout(25)
                    ->connectTimeout(8)
                    ->acceptJson()
                    ->contentType('application/json')
                    ->post(
                        "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}",
                        $payload
                    );

                if ($response->successful()) {
                    return (string) data_get(
                        $response->json(),
                        'candidates.0.content.parts.0.text',
                        ''
                    );
                }

                $lastError = "Gemini {$model} error {$response->status()}: {$response->body()}";

                if (!in_array($response->status(), [429, 500, 502, 503, 504], true)) {
                    break;
                }

                usleep(700000);
            } catch (\Throwable $e) {
                $lastError = "Gemini {$model} exception: " . $e->getMessage();
                usleep(700000);
            }
        }
    }

    throw new \RuntimeException($lastError ?: 'Gemini request failed.');
}
    protected function forceActorPlaceholders(?string $sql, array $actor): ?string
    {
        if (!$sql) return null;

        $role = $actor['role'] ?? 'guest';

        if ($role === 'school' && !empty($actor['school_id'])) {
            $id = (int) $actor['school_id'];
            $sql = preg_replace('/\b(fa|d|dr|s|schools|donations|donation_requests|fund_allocations)\.school_id\s*=\s*' . $id . '\b/i', '$1.school_id = :actor_school_id', $sql);
            $sql = preg_replace('/\bschool_id\s*=\s*' . $id . '\b/i', 'school_id = :actor_school_id', $sql);
        }

        if ($role === 'donor' && !empty($actor['donor_id'])) {
            $id = (int) $actor['donor_id'];
            $sql = preg_replace('/\b(d|donations|donors)\.donor_id\s*=\s*' . $id . '\b/i', '$1.donor_id = :actor_donor_id', $sql);
            $sql = preg_replace('/\bdonor_id\s*=\s*' . $id . '\b/i', 'donor_id = :actor_donor_id', $sql);
        }

        return $sql;
    }

    protected function normalizeSql(?string $sql): ?string
    {
        if (!$sql) return null;

        $sql = trim(rtrim($sql, ';'));
        $sql = preg_replace('/\s+/', ' ', $sql);

        $sql = str_ireplace("status = 'completed'", "LOWER(status) = 'paid'", $sql);
        $sql = str_ireplace('status = "completed"', "LOWER(status) = 'paid'", $sql);
        $sql = str_ireplace("d.status = 'completed'", "LOWER(d.status) = 'paid'", $sql);
        $sql = str_ireplace('d.status = "completed"', "LOWER(d.status) = 'paid'", $sql);
        $sql = str_ireplace("donations.status = 'completed'", "LOWER(donations.status) = 'paid'", $sql);
        $sql = str_ireplace('donations.status = "completed"', "LOWER(donations.status) = 'paid'", $sql);

        return $sql;
    }

    protected function isSafeSelectQuery(?string $sql, array $actor): bool
    {
        if (!$sql) return false;

        $normalized = strtolower(trim($sql));
        $normalized = preg_replace('/\s+/', ' ', $normalized);

        if (!str_starts_with($normalized, 'select')) return false;

        if (preg_match('/\b(' . implode('|', array_map('preg_quote', $this->hiddenFields)) . ')\b/i', $sql)) {
            return false;
        }

        if (preg_match('/select\s+\*/i', $sql)) {
            return false;
        }

        $blocked = [
            ' insert ', ' update ', ' delete ', ' drop ', ' alter ', ' truncate ',
            ' create ', ' replace ', ' grant ', ' revoke ', ' call ', ' exec ',
            ' execute ', ' information_schema', ' union ', '--', '/*', '*/', ';',
        ];

        foreach ($blocked as $word) {
            if (str_contains($normalized, $word)) return false;
        }

        if (!$this->usesAllowedTablesOnly($normalized)) return false;

        $role = $actor['role'] ?? 'guest';

        $touchesDonations = str_contains($normalized, 'from donations')
            || str_contains($normalized, 'join donations')
            || str_contains($normalized, 'from fund_allocations')
            || str_contains($normalized, 'join fund_allocations');

        $touchesRequests = str_contains($normalized, 'from donation_requests')
            || str_contains($normalized, 'join donation_requests');

        $touchesDonors = str_contains($normalized, 'from donors')
            || str_contains($normalized, 'join donors');

        if ($role === 'guest' && ($touchesDonations || $touchesDonors)) {
            return false;
        }

        if ($role === 'school' && ($touchesDonations || $touchesRequests)) {
            return str_contains($normalized, ':actor_school_id');
        }

        if ($role === 'donor' && ($touchesDonations || $touchesDonors)) {
            return str_contains($normalized, ':actor_donor_id');
        }

        return true;
    }

    protected function usesAllowedTablesOnly(string $sql): bool
    {
        preg_match_all('/\b(from|join)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/', $sql, $matches);

        foreach (($matches[2] ?? []) as $table) {
            if (!in_array(strtolower($table), $this->allowedTables, true)) {
                return false;
            }
        }

        return true;
    }

    protected function prepareSqlAndBindings(string $sql, array $actor): array
    {
        $bindings = [];

        $map = [
            ':actor_school_id' => $actor['school_id'] ?? 0,
            ':actor_donor_id' => $actor['donor_id'] ?? 0,
            ':actor_ministry_id' => $actor['ministry_id'] ?? 0,
            ':actor_admin_id' => $actor['admin_id'] ?? 0,
        ];

        foreach ($map as $placeholder => $value) {
            while (str_contains($sql, $placeholder)) {
                $sql = preg_replace('/' . preg_quote($placeholder, '/') . '\b/', '?', $sql, 1);
                $bindings[] = $value;
            }
        }

        return [$sql, $bindings];
    }

    protected function decodeAiJson(string $text): ?array
    {
        $clean = trim($text);
        $clean = preg_replace('/^```json\s*/i', '', $clean);
        $clean = preg_replace('/^```\s*/i', '', $clean);
        $clean = preg_replace('/\s*```$/', '', $clean);

        $first = strpos($clean, '{');
        $last = strrpos($clean, '}');

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
        if (empty($history)) return 'No previous conversation.';

        return collect($history)
            ->take(-10)
            ->map(function ($item) {
                $role = strtoupper((string) ($item['role'] ?? 'unknown'));
                $message = mb_substr(trim((string) ($item['message'] ?? '')), 0, 500);
                return "{$role}: {$message}";
            })
            ->implode("\n");
    }

    protected function cleanReply(string $reply): string
    {
        $reply = trim($reply);

        $bad = [
            "I cannot provide an opinion on whether a donation amount is 'good' or not, as it is subjective.",
            'I cannot provide an opinion on whether a donation amount is good or not, as it is subjective.',
            'My purpose is to provide factual information and assist with your queries.',
        ];

        foreach ($bad as $phrase) {
            $reply = str_replace($phrase, '', $reply);
        }

        return trim($reply) ?: 'Sorry, I could not process that clearly.';
    }

    protected function safeActorForPrompt(array $actor): array
    {
        return [
            'role' => $actor['role'] ?? 'guest',
            'school_id' => $actor['school_id'] ?? null,
            'donor_id' => $actor['donor_id'] ?? null,
            'ministry_id' => $actor['ministry_id'] ?? null,
            'admin_id' => $actor['admin_id'] ?? null,
            'name' => $actor['name'] ?? null,
        ];
    }

    protected function fail(string $reply): array
    {
        return [
            'reply' => $reply,
            'used_db' => false,
            'sql' => null,
        ];
    }
}