<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\MembershipController;
use App\Http\Controllers\SyncController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/google', [AuthController::class, 'google']);
Route::post('/auth/apple', [AuthController::class, 'apple']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/sync/push', [SyncController::class, 'push']);
    Route::post('/sync/pull', [SyncController::class, 'pull']);
    Route::post('/sync/covers/{shelfId}/{isbn}', [SyncController::class, 'uploadCover']);
    Route::get('/sync/covers/{shelfId}/{isbn}', [SyncController::class, 'downloadCover']);

    Route::get('/shelves/{shelfId}/members', [MembershipController::class, 'index']);
    Route::post('/shelves/{shelfId}/members', [MembershipController::class, 'store']);
    Route::delete('/shelves/{shelfId}/members/{membershipId}', [MembershipController::class, 'destroy']);
});
