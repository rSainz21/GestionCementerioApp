<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CemnConcesionTercero extends Model
{
    protected $table = 'cemn_concesion_terceros';

    protected $fillable = [
        'concesion_id',
        'tercero_id',
        'rol',
        'fecha_desde',
        'fecha_hasta',
        'activo',
        'notas',
    ];

    protected $casts = [
        'fecha_desde' => 'date',
        'fecha_hasta' => 'date',
        'activo'      => 'boolean',
    ];

    public function concesion(): BelongsTo
    {
        return $this->belongsTo(CemnConcesion::class, 'concesion_id');
    }

    public function tercero(): BelongsTo
    {
        return $this->belongsTo(CemnTercero::class, 'tercero_id');
    }
}
