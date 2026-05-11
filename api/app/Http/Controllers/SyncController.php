<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Membership;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SyncController
{
    public function pull(Request $request): JsonResponse
    {
        $request->validate([
            'shelf_id' => 'required|integer',
            'since' => 'nullable|integer',
        ]);

        $membership = $this->requireAccess($request, $request->input('shelf_id'));

        if (!$membership) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $since = $request->input('since', 0);

        $books = Book::where('shelf_id', $request->input('shelf_id'))
            ->where('updated_at', '>', now()->subSeconds(time() - $since / 1000))
            ->get();

        return response()->json([
            'books' => $books,
            'timestamp' => now()->getTimestampMs(),
        ]);
    }

    public function push(Request $request): JsonResponse
    {
        $request->validate([
            'shelf_id' => 'required|integer',
            'books' => 'required|array',
            'books.*.isbn' => 'required|string',
            'books.*.title' => 'required|string',
            'books.*.updated_at' => 'required|integer',
        ]);

        $membership = $this->requireAccess($request, $request->input('shelf_id'), write: true);

        if (!$membership) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $shelfId = $request->input('shelf_id');
        $accepted = 0;

        foreach ($request->input('books') as $data) {
            $existing = Book::where('shelf_id', $shelfId)
                ->where('isbn', $data['isbn'])
                ->first();

            $remoteUpdatedAt = $data['updated_at'];

            if ($existing && $existing->updated_at->getTimestampMs() >= $remoteUpdatedAt) {
                continue;
            }

            Book::updateOrCreate(
                ['shelf_id' => $shelfId, 'isbn' => $data['isbn']],
                [
                    'title' => $data['title'],
                    'cover_url' => $data['cover_url'] ?? null,
                    'tags' => $data['tags'] ?? [],
                    'note' => $data['note'] ?? '',
                    'favorite' => $data['favorite'] ?? false,
                    'collection_id' => $data['collection_id'] ?? null,
                    'deleted_at' => isset($data['deleted_at']) ? now() : null,
                ],
            );

            $accepted++;
        }

        return response()->json([
            'accepted' => $accepted,
            'timestamp' => now()->getTimestampMs(),
        ]);
    }

    public function uploadCover(Request $request, int $shelfId, string $isbn): JsonResponse
    {
        $request->validate(['cover' => 'required|image|max:512']);

        $membership = $this->requireAccess($request, $shelfId, write: true);

        if (!$membership) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $path = $request->file('cover')->storeAs("covers/{$shelfId}", "{$isbn}.jpg", 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }

    public function downloadCover(int $shelfId, string $isbn): mixed
    {
        $path = "covers/{$shelfId}/{$isbn}.jpg";

        if (!Storage::disk('public')->exists($path)) {
            return response()->json(['error' => 'Not found'], 404);
        }

        return Storage::disk('public')->response($path);
    }

    private function requireAccess(Request $request, int $shelfId, bool $write = false): ?Membership
    {
        $membership = Membership::where('user_id', $request->user()->id)
            ->where('shelf_id', $shelfId)
            ->first();

        if (!$membership) {
            return null;
        }

        if ($write && !$membership->canWrite()) {
            return null;
        }

        return $membership;
    }
}
