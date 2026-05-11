<?php

namespace App\Http\Controllers;

use App\Models\Membership;
use App\Models\Shelf;
use App\Models\User;
use Google\Client as GoogleClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController
{
    public function google(Request $request): JsonResponse
    {
        $request->validate(['idToken' => 'required|string']);

        $client = new GoogleClient(['client_id' => config('services.google.client_id')]);
        $payload = $client->verifyIdToken($request->input('idToken'));

        if (!$payload) {
            return response()->json(['error' => 'Invalid token'], 401);
        }

        return $this->loginOrRegister(
            'google_id',
            $payload['sub'],
            $payload['name'] ?? '',
            $payload['email'] ?? '',
        );
    }

    public function apple(Request $request): JsonResponse
    {
        $request->validate(['idToken' => 'required|string']);

        $claims = json_decode(
            base64_decode(explode('.', $request->input('idToken'))[1]),
            true,
        );

        if (!$claims || ($claims['iss'] ?? '') !== 'https://appleid.apple.com') {
            return response()->json(['error' => 'Invalid token'], 401);
        }

        return $this->loginOrRegister(
            'apple_id',
            $claims['sub'],
            $request->input('name', ''),
            $claims['email'] ?? '',
        );
    }

    private function loginOrRegister(string $field, string $providerId, string $name, string $email): JsonResponse
    {
        $user = User::where($field, $providerId)->first();

        if (!$user) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                $field => $providerId,
            ]);

            $shelf = Shelf::create(['name' => 'default']);

            Membership::create([
                'user_id' => $user->id,
                'shelf_id' => $shelf->id,
                'role' => Membership::OWNER,
            ]);
        }

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }
}
