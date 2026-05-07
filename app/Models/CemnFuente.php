<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CemnFuente extends Model
{
    protected $table = 'cemn_fuentes';

    protected $fillable = [
        'nombre',
        'tipo',
        'descripcion',
        'periodo_desde',
        'periodo_hasta',
    ];

    protected $casts = [
        'periodo_desde' => 'integer',
        'periodo_hasta' => 'integer',
    ];

    public function registros(): HasMany
    {
        return $this->hasMany(CemnRegistroFuente::class, 'fuente_id');
    }
}
