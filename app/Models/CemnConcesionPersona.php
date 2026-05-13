<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CemnConcesionPersona extends Model
{
    protected $table = 'cemn_concesion_personas';

    protected $fillable = [
        'concesion_id',
        'persona_id',
        'rol',
        'fecha_desde',
        'fecha_hasta',
        'activo',
        'notas',
    ];

    protected $casts = [
        'activo'      => 'boolean',
        'fecha_desde' => 'date',
        'fecha_hasta' => 'date',
    ];

    public function concesion(): BelongsTo
    {
        return $this->belongsTo(CemnConcesion::class, 'concesion_id');
    }

    public function persona(): BelongsTo
    {
        return $this->belongsTo(CemnPersona::class, 'persona_id');
    }
}
