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

            $historyKey = $this->historyKey($actor);
            $history = session()->get($historyKey, []);

            $result = $this->aiChatService->handle($actor, $message, $history);

            $reply = $result['reply'] ?? 'Sorry, I could not process your request.';

            $history[] = [
                'role' => 'user',
                'message' => $message,
            ];

            $history[] = [
                'role' => 'assistant',
                'message' => $reply,
            ];

            $history = array_slice($history, -16);

            session()->put($historyKey, $history);

            return response()->json([
                'reply' => $reply,
                'meta' => [
                    'role' => $actor['role'] ?? 'guest',
                    'used_db' => (bool) ($result['used_db'] ?? false),
                    'sql' => config('app.debug') ? ($result['sql'] ?? null) : null,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('ChatController@chat failed', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'actor' => $actor,
                'user_message' => $message,
            ]);

            return response()->json([
                'reply' => config('app.debug')
                    ? '❌ ERROR: ' . $e->getMessage()
                    : '⚠️ Something went wrong. Please try again.',
                'meta' => [
                    'role' => $actor['role'] ?? 'guest',
                    'used_db' => false,
                    'sql' => null,
                ],
            ], 500);
        }
    }

    public function clearChat(Request $request)
    {
        $actor = $this->actorResolver->resolve($request);

        session()->forget($this->historyKey($actor));

        return response()->json([
            'reply' => 'Chat history cleared.',
        ]);
    }

    protected function historyKey(array $actor): string
    {
        $role = $actor['role'] ?? 'guest';

        $id = $actor['school_id']
            ?? $actor['donor_id']
            ?? $actor['ministry_id']
            ?? $actor['admin_id']
            ?? 'guest';

        return "chat_history_{$role}_{$id}";
    }
}