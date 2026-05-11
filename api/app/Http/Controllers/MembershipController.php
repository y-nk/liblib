<?php

namespace App\Http\Controllers;

use App\Models\Membership;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MembershipController
{
    public function index(Request $request, int $shelfId): JsonResponse
    {
        $membership = $this->requireOwner($request, $shelfId);

        if (!$membership) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $members = Membership::where('shelf_id', $shelfId)
            ->with('user:id,name,email')
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'user' => $m->user,
                'role' => $m->role,
            ]);

        return response()->json(['members' => $members]);
    }

    public function store(Request $request, int $shelfId): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'role' => 'required|in:contributor,viewer',
        ]);

        $membership = $this->requireOwner($request, $shelfId);

        if (!$membership) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $invitee = User::where('email', $request->input('email'))->first();

        if (!$invitee) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $existing = Membership::where('user_id', $invitee->id)
            ->where('shelf_id', $shelfId)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Already a member'], 409);
        }

        $member = Membership::create([
            'user_id' => $invitee->id,
            'shelf_id' => $shelfId,
            'role' => $request->input('role'),
        ]);

        return response()->json(['member' => $member->load('user:id,name,email')], 201);
    }

    public function destroy(Request $request, int $shelfId, int $membershipId): JsonResponse
    {
        $membership = $this->requireOwner($request, $shelfId);

        if (!$membership) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $target = Membership::where('id', $membershipId)
            ->where('shelf_id', $shelfId)
            ->first();

        if (!$target) {
            return response()->json(['error' => 'Not found'], 404);
        }

        if ($target->isOwner()) {
            return response()->json(['error' => 'Cannot remove owner'], 400);
        }

        $target->delete();

        return response()->json(null, 204);
    }

    private function requireOwner(Request $request, int $shelfId): ?Membership
    {
        $membership = Membership::where('user_id', $request->user()->id)
            ->where('shelf_id', $shelfId)
            ->first();

        if (!$membership || !$membership->isOwner()) {
            return null;
        }

        return $membership;
    }
}
