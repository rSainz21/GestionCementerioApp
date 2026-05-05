<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CemnCambio extends Model
{
    protected $table = 'cemn_cambios';

    protected $fillable = [
        'sepultura_id',
        'user_id',
        'accion',
        'diff',
    ];

    protected $casts = [
        'diff' => 'array',
    ];

    public function sepultura(): BelongsTo
    {
        return $this->belongsTo(CemnSepultura::class, 'sepultura_id');
    }
}

