<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'shelf_id', 'role'])]
class Membership extends Model
{
    public const OWNER = 'owner';
    public const CONTRIBUTOR = 'contributor';
    public const VIEWER = 'viewer';

    public const WRITE_ROLES = [self::OWNER, self::CONTRIBUTOR];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shelf(): BelongsTo
    {
        return $this->belongsTo(Shelf::class);
    }

    public function canWrite(): bool
    {
        return in_array($this->role, self::WRITE_ROLES);
    }

    public function isOwner(): bool
    {
        return $this->role === self::OWNER;
    }
}
