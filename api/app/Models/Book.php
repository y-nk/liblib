<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'isbn', 'title', 'cover_url', 'tags', 'note',
    'favorite', 'collection_id', 'updated_at', 'deleted_at',
])]
class Book extends Model
{
    protected $primaryKey = null;
    public $incrementing = false;

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'favorite' => 'boolean',
            'deleted_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'isbn';
    }

    public function shelf(): BelongsTo
    {
        return $this->belongsTo(Shelf::class);
    }
}
