<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CemnMovimiento extends Model
{
    protected $table = 'cemn_movimientos';

    protected $fillable = [
        'difunto_id',
        'tipo',
        'fecha',
        'sepultura_origen_id',
        'sepultura_destino_id',
        'numero_expediente',
        'notas',
    ];

    protected $casts = [
        'fecha' => 'date',
    ];

    public function difunto(): BelongsTo
    {
        return $this->belongsTo(CemnDifunto::class, 'difunto_id');
    }

    public function sepulturaOrigen(): BelongsTo
    {
        return $this->belongsTo(CemnSepultura::class, 'sepultura_origen_id');
    }

    public function sepulturaDestino(): BelongsTo
    {
        return $this->belongsTo(CemnSepultura::class, 'sepultura_destino_id');
    }
}
