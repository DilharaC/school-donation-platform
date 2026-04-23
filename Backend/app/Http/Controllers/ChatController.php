<?php

namespace App\Http\Controllers;

use App\Services\Chat\ChatActorResolver;
use App\Services\Chat\AiChatService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    public function __construct(
        protected ChatActorResolver $actorResolver,
        protected AiChatService $aiChatService
    ) {}

    public function chat(Request $request)
    {
        $message = trim((string) $request->input('message', ''));

        Log::debug('Chat Request Received', [
            'message' => $message,
            'ip' => $request->ip(),
        ]);

        if ($message === '') {
            return response()->json([
                'reply' => 'Please enter a message.',
                'meta' => [
                    'role' => 'guest',
                    'used_db' => false,
                    'sql' => null,
                ],
            ], 422);
        }

        $actor = [
            'role' => 'guest',
            'user' => null,
            'school_id' => null,
            'donor_id' => null,
            'ministry_id' => null,
            'admin_id' => null,
            'name' => null,
            'email' => null,
        ];

        try {
            $actor = $this->actorResolver->resolve($request);

            Log::debug('Actor Resolved', [
                'actor' => $actor,
            ]);

            $result = $this->aiChatService->handle($actor, $message);

            Log::debug('AI Service Result', [
                'result' => $result,
            ]);

            return response()->json([
                'reply' => $result['reply'] ?? 'Sorry, I could not process your request.',
                'meta' => [
                    'role' => $actor['role'] ?? 'guest',
                    'used_db' => (bool) ($result['used_db'] ?? false),
                    'sql' => config('app.debug') ? ($result['sql'] ?? null) : null,
                ],
            ]);
        } catch (\Throwable $e) {
            $errorMessage = $e->getMessage();

            Log::error('ChatController@chat failed', [
                'message' => $errorMessage,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'actor' => $actor,
                'user_message' => $message,
            ]);

            $userReply = '⚠️ Something went wrong. Please try again.';

            if (
                str_contains($errorMessage, '503') ||
                str_contains($errorMessage, 'UNAVAILABLE') ||
                str_contains($errorMessage, 'high demand')
            ) {
                $userReply = 'AI service is busy right now. Please try again in a moment.';
            } elseif (
                str_contains($errorMessage, '429') ||
                str_contains($errorMessage, 'RESOURCE_EXHAUSTED') ||
                str_contains($errorMessage, 'quota')
            ) {
                $userReply = 'AI request limit reached right now. Please try again later.';
            } elseif (
                str_contains($errorMessage, 'cURL error 60') ||
                str_contains($errorMessage, 'SSL certificate problem')
            ) {
                $userReply = 'SSL configuration issue detected while connecting to AI service.';
            } elseif (config('app.debug')) {
                $userReply = '❌ ERROR: ' . $errorMessage;
            }

            return response()->json([
                'reply' => $userReply,
                'meta' => [
                    'role' => $actor['role'] ?? 'guest',
                    'used_db' => false,
                    'sql' => null,
                ],
            ], 500);
        }
    }
}