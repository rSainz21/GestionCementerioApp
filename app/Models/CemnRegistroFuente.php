<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CemnRegistroFuente extends Model
{
    protected $table = 'cemn_registro_fuentes';

    public $timestamps = false;

    protected $fillable = [
        'fuente_id',
        'entidad_tipo',
        'entidad_id',
        'pagina',
        'confianza',
        'notas',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function fuente(): BelongsTo
    {
        return $this->belongsTo(CemnFuente::class, 'fuente_id');
    }
}
