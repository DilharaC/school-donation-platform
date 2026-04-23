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

    public function handle(array $actor, string $message): array
    {
        Log::debug('AiChatService@handle started', [
            'actor' => $this->safeActorForPrompt($actor),
            'message' => $message,
        ]);

        $apiKey = (string) env('GEMINI_API_KEY', '');

        if ($apiKey === '') {
            Log::warning('AiChatService: GEMINI_API_KEY missing');

            return [
                'reply' => 'AI key is missing.',
                'used_db' => false,
                'sql' => null,
            ];
        }

        $role = $actor['role'] ?? 'guest';
        $schema = $this->schemaText();
        $actorJson = json_encode(
            $this->safeActorForPrompt($actor),
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
        );

        $plannerPrompt = <<<PROMPT
You are an AI assistant for a school donation platform.

User role:
{$role}

Actor data:
{$actorJson}

Database schema:
{$schema}

User message:
{$message}

Return ONLY valid JSON. No markdown. No explanation.

Format 1:
{
  "needs_db": true,
  "sql": "SELECT ...",
  "reply": null
}

Format 2:
{
  "needs_db": false,
  "sql": null,
  "reply": "direct answer"
}

Important SQL rules:
- Only READ-ONLY SELECT queries.
- Never use INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, REPLACE, GRANT, REVOKE.
- No semicolon.
- No comments.
- Use only these tables: donors, schools, donations, donation_requests, fund_allocations.
- Prefer LIMIT 10 for list queries.
- For counts, sums, averages, latest donation, summaries: use aggregated SQL.
- If role is school, only query that school's data using :actor_school_id.
- If role is donor, only query that donor's data using :actor_donor_id.
- If role is ministry or admin, broader reads are allowed.
- If role is guest, do not expose private data. Only answer generally unless user asks something clearly public.
- Use placeholders exactly like:
  :actor_school_id
  :actor_donor_id
  :actor_ministry_id
  :actor_admin_id

Examples:
- "How much have we raised this month?" for school:
  SELECT COALESCE(SUM(amount),0) AS total_raised
  FROM donations
  WHERE school_id = :actor_school_id
    AND status = 'completed'
    AND YEAR(created_at) = YEAR(CURRENT_DATE)
    AND MONTH(created_at) = MONTH(CURRENT_DATE)

- "How many donations received?" for school:
  SELECT COUNT(*) AS donation_count
  FROM donations
  WHERE school_id = :actor_school_id
    AND status = 'completed'
PROMPT;

        try {
            Log::debug('AiChatService: sending planner prompt', [
                'role' => $role,
                'message' => $message,
            ]);

            $rawPlan = $this->askGemini($plannerPrompt, $apiKey);

            Log::debug('AiChatService: Gemini RAW PLAN', [
                'raw_plan' => $rawPlan,
            ]);

            $data = $this->decodeAiJson($rawPlan);

            Log::debug('AiChatService: Gemini DECODED PLAN', [
                'decoded' => $data,
            ]);

            if (!is_array($data)) {
                Log::warning('AiChatService: planner did not return valid JSON', [
                    'raw' => $rawPlan,
                ]);

                return [
                    'reply' => 'Sorry, I could not understand that clearly.',
                    'used_db' => false,
                    'sql' => null,
                ];
            }

            $needsDb = (bool) ($data['needs_db'] ?? false);
            $sql = isset($data['sql']) && is_string($data['sql'])
                ? trim($data['sql'])
                : null;
            $directReply = isset($data['reply']) && is_string($data['reply'])
                ? trim($data['reply'])
                : null;

            Log::debug('AiChatService: planner decision', [
                'needs_db' => $needsDb,
                'sql' => $sql,
                'direct_reply' => $directReply,
            ]);

            if (!$needsDb) {
                Log::debug('AiChatService: returning direct reply', [
                    'reply' => $directReply,
                ]);

                return [
                    'reply' => $directReply !== '' ? $directReply : 'Sorry, I could not understand that clearly.',
                    'used_db' => false,
                    'sql' => null,
                ];
            }

            if (!$this->isSafeSelectQuery($sql, $actor)) {
                Log::warning('AiChatService: unsafe or invalid SQL blocked', [
                    'role' => $role,
                    'sql' => $sql,
                    'actor' => $this->safeActorForPrompt($actor),
                ]);

                return [
                    'reply' => 'Sorry, that request was blocked for safety reasons.',
                    'used_db' => false,
                    'sql' => $sql,
                ];
            }

            [$preparedSql, $bindings] = $this->prepareSqlAndBindings($sql, $actor);

            Log::debug('AiChatService: executing SQL', [
                'original_sql' => $sql,
                'prepared_sql' => $preparedSql,
                'bindings' => $bindings,
            ]);

            $rows = DB::select($preparedSql, $bindings);

            Log::debug('AiChatService: DB RESULT', [
                'row_count' => count($rows),
                'rows' => $rows,
            ]);

            $rowsJson = json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            $answerPrompt = <<<PROMPT
You are an AI assistant for a school donation platform.

User message:
{$message}

SQL result:
{$rowsJson}

Write a clean, short, user-friendly answer.

Rules:
- Do not mention SQL, database, query, table, or internal system.
- If result is empty, politely say no matching data was found.
- Keep numbers readable.
- If it is a money value, format as LKR with commas.
- If there is one numeric summary, answer directly in one or two sentences.
- If total is 0, say no donations/raising found for that period.
PROMPT;

            Log::debug('AiChatService: sending answer prompt', [
                'message' => $message,
                'rows_json' => $rowsJson,
            ]);

            $finalReply = trim($this->askGemini($answerPrompt, $apiKey));

            Log::debug('AiChatService: Gemini FINAL REPLY', [
                'final_reply' => $finalReply,
            ]);

            return [
                'reply' => $finalReply !== '' ? $finalReply : 'I found the data, but could not format the reply properly.',
                'used_db' => true,
                'sql' => $preparedSql,
            ];
        } catch (\Throwable $e) {
            Log::error('AiChatService handle failed', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'actor' => $this->safeActorForPrompt($actor),
                'user_message' => $message,
            ]);

            $reply = 'Sorry, something went wrong while processing your request.';

            if (config('app.debug')) {
                if (
                    str_contains($e->getMessage(), '503') ||
                    str_contains($e->getMessage(), 'UNAVAILABLE') ||
                    str_contains($e->getMessage(), 'high demand')
                ) {
                    $reply = 'AI service is busy right now. Please try again in a moment.';
                } else {
                    $reply = 'DEBUG ERROR: ' . $e->getMessage();
                }
            }

            return [
                'reply' => $reply,
                'used_db' => false,
                'sql' => null,
            ];
        }
    }

    protected function askGemini(string $prompt, string $apiKey): string
    {
        Log::debug('AiChatService: askGemini called', [
            'prompt_preview' => mb_substr($prompt, 0, 1000),
            'prompt_length' => mb_strlen($prompt),
        ]);

        $maxAttempts = 3;
        $lastError = null;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $response = Http::timeout(45)
                    ->acceptJson()
                    ->contentType('application/json')
                    ->post(
                        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}",
                        [
                            'contents' => [
                                [
                                    'parts' => [
                                        ['text' => $prompt],
                                    ],
                                ],
                            ],
                            'generationConfig' => [
                                'temperature' => 0.2,
                                'responseMimeType' => 'application/json',
                            ],
                        ]
                    );

                Log::debug('AiChatService: Gemini HTTP response received', [
                    'attempt' => $attempt,
                    'status' => $response->status(),
                    'ok' => $response->ok(),
                    'body_preview' => mb_substr($response->body(), 0, 2000),
                ]);

                if ($response->successful()) {
                    $text = (string) data_get($response->json(), 'candidates.0.content.parts.0.text', '');

                    Log::debug('AiChatService: Gemini parsed text', [
                        'attempt' => $attempt,
                        'text' => $text,
                    ]);

                    return $text;
                }

                $status = $response->status();
                $body = $response->body();

                if (in_array($status, [429, 500, 502, 503, 504], true)) {
                    $lastError = "Gemini temporary error ({$status}): {$body}";

                    Log::warning('AiChatService: temporary Gemini error, retrying', [
                        'attempt' => $attempt,
                        'status' => $status,
                        'body' => $body,
                    ]);

                    if ($attempt < $maxAttempts) {
                        sleep($attempt * 2);
                        continue;
                    }
                }

                throw new \RuntimeException('Gemini request failed: ' . $body);
            } catch (\Throwable $e) {
                $lastError = $e->getMessage();

                Log::warning('AiChatService: Gemini attempt failed', [
                    'attempt' => $attempt,
                    'error' => $lastError,
                ]);

                if ($attempt < $maxAttempts) {
                    sleep($attempt * 2);
                    continue;
                }
            }
        }

        throw new \RuntimeException($lastError ?: 'Gemini request failed after retries.');
    }

    protected function decodeAiJson(string $text): ?array
    {
        $clean = trim($text);

        Log::debug('AiChatService: decodeAiJson input', [
            'raw_text' => $text,
        ]);

        if ($clean === '') {
            Log::warning('AiChatService: decodeAiJson got empty text');
            return null;
        }

        $clean = preg_replace('/^```json\s*/i', '', $clean);
        $clean = preg_replace('/^```\s*/i', '', $clean);
        $clean = preg_replace('/\s*```$/', '', $clean);

        $firstBrace = strpos($clean, '{');
        $lastBrace = strrpos($clean, '}');

        if ($firstBrace !== false && $lastBrace !== false && $lastBrace > $firstBrace) {
            $clean = substr($clean, $firstBrace, $lastBrace - $firstBrace + 1);
        }

        Log::debug('AiChatService: decodeAiJson cleaned text', [
            'cleaned_text' => $clean,
        ]);

        $decoded = json_decode($clean, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::warning('decodeAiJson failed', [
                'json_error' => json_last_error_msg(),
                'raw_text' => $text,
                'cleaned_text' => $clean,
            ]);
            return null;
        }

        Log::debug('AiChatService: decodeAiJson success', [
            'decoded' => $decoded,
        ]);

        return is_array($decoded) ? $decoded : null;
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
            'email' => $actor['email'] ?? null,
        ];
    }

    protected function prepareSqlAndBindings(string $sql, array $actor): array
    {
        $bindings = [];

        $placeholderMap = [
            ':actor_school_id' => $actor['school_id'] ?? 0,
            ':actor_donor_id' => $actor['donor_id'] ?? 0,
            ':actor_ministry_id' => $actor['ministry_id'] ?? 0,
            ':actor_admin_id' => $actor['admin_id'] ?? 0,
        ];

        foreach ($placeholderMap as $placeholder => $value) {
            while (str_contains($sql, $placeholder)) {
                $sql = preg_replace('/' . preg_quote($placeholder, '/') . '\b/', '?', $sql, 1);
                $bindings[] = $value;
            }
        }

        Log::debug('AiChatService: prepareSqlAndBindings', [
            'prepared_sql' => $sql,
            'bindings' => $bindings,
        ]);

        return [$sql, $bindings];
    }

    protected function isSafeSelectQuery(?string $sql, array $actor): bool
    {
        if (!$sql || !is_string($sql)) {
            Log::warning('AiChatService: SQL rejected because empty or invalid', [
                'sql' => $sql,
            ]);
            return false;
        }

        $normalized = strtolower(trim($sql));
        $normalized = preg_replace('/\s+/', ' ', $normalized);

        Log::debug('AiChatService: validating SQL', [
            'original_sql' => $sql,
            'normalized_sql' => $normalized,
            'role' => $actor['role'] ?? 'guest',
        ]);

        if (!str_starts_with($normalized, 'select')) {
            Log::warning('AiChatService: SQL rejected because not SELECT', [
                'sql' => $normalized,
            ]);
            return false;
        }

        $blockedWords = [
            'insert ',
            'update ',
            'delete ',
            'drop ',
            'alter ',
            'truncate ',
            'create ',
            'replace ',
            'grant ',
            'revoke ',
            'commit',
            'rollback',
            'call ',
            'exec ',
            'execute ',
            'information_schema',
            'pg_',
            'sqlite_',
            '--',
            '/*',
            '*/',
            ';',
            ' union ',
        ];

        foreach ($blockedWords as $word) {
            if (str_contains($normalized, $word)) {
                Log::warning('AiChatService: SQL rejected because blocked word found', [
                    'word' => $word,
                    'sql' => $normalized,
                ]);
                return false;
            }
        }

        if (!$this->usesAllowedTablesOnly($normalized)) {
            Log::warning('AiChatService: SQL rejected because non-allowed table detected', [
                'sql' => $normalized,
            ]);
            return false;
        }

        $role = $actor['role'] ?? 'guest';

        $touchesSchoolSensitiveTables =
            str_contains($normalized, 'from donations') ||
            str_contains($normalized, 'from donation_requests') ||
            str_contains($normalized, 'from fund_allocations') ||
            str_contains($normalized, 'join donations') ||
            str_contains($normalized, 'join donation_requests') ||
            str_contains($normalized, 'join fund_allocations');

        $touchesDonorSensitiveTables =
            str_contains($normalized, 'from donations') ||
            str_contains($normalized, 'join donations') ||
            str_contains($normalized, 'from fund_allocations') ||
            str_contains($normalized, 'join fund_allocations');

        if ($role === 'school') {
            if ($touchesSchoolSensitiveTables && !str_contains($normalized, ':actor_school_id')) {
                Log::warning('AiChatService: school SQL rejected because actor_school_id placeholder missing', [
                    'sql' => $normalized,
                ]);
                return false;
            }
        }

        if ($role === 'donor') {
            if ($touchesDonorSensitiveTables && !str_contains($normalized, ':actor_donor_id')) {
                Log::warning('AiChatService: donor SQL rejected because actor_donor_id placeholder missing', [
                    'sql' => $normalized,
                ]);
                return false;
            }
        }

        if ($role === 'guest') {
            if (
                str_contains($normalized, 'from donations') ||
                str_contains($normalized, 'join donations') ||
                str_contains($normalized, 'from fund_allocations') ||
                str_contains($normalized, 'join fund_allocations') ||
                str_contains($normalized, 'from donors') ||
                str_contains($normalized, 'join donors')
            ) {
                Log::warning('AiChatService: guest SQL rejected because private tables were accessed', [
                    'sql' => $normalized,
                ]);
                return false;
            }
        }

        Log::debug('AiChatService: SQL passed safety validation', [
            'sql' => $normalized,
        ]);

        return true;
    }

    protected function usesAllowedTablesOnly(string $sql): bool
    {
        preg_match_all('/\b(from|join)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/', $sql, $matches);

        $tables = $matches[2] ?? [];

        Log::debug('AiChatService: detected SQL tables', [
            'tables' => $tables,
        ]);

        foreach ($tables as $table) {
            if (!in_array(strtolower($table), $this->allowedTables, true)) {
                Log::warning('AiChatService: table not allowed', [
                    'table' => $table,
                    'allowed_tables' => $this->allowedTables,
                ]);
                return false;
            }
        }

        return true;
    }

    protected function schemaText(): string
    {
        return <<<SCHEMA
Table donors:
- donor_id
- full_name
- email
- phone
- created_at

Table schools:
- school_id
- school_name
- registration_no
- contact_email
- contact_phone
- district
- province
- created_at

Table donations:
- donation_id
- donor_id
- donor_name
- school_id
- request_id
- amount
- status
- created_at

Table donation_requests:
- request_id
- school_id
- request_title
- status
- estimated_price
- amount_raised
- created_at

Table fund_allocations:
- allocation_id
- donation_id
- request_id
- school_id
- allocation_type
- allocated_amount
- status
- created_at
SCHEMA;
    }
}