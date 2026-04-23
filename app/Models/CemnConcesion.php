<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Models\CemnDifunto;

class CemnConcesion extends Model
{
    protected $table = 'cemn_concesiones';

    protected $fillable = [
        'sepultura_id',
        'numero_expediente',
        'tipo',
        'fecha_concesion',
        'fecha_vencimiento',
        'duracion_anos',
        'estado',
        'importe',
        'moneda',
        'texto_concesion',
        'concesion_previa_id',
        'notas',
    ];

    protected $casts = [
        'fecha_concesion'   => 'date',
        'fecha_vencimiento' => 'date',
        'importe'           => 'decimal:2',
        'duracion_anos'     => 'integer',
    ];

    // ── Relaciones ─────────────────────────────────────────────────────────

    public function sepultura(): BelongsTo
    {
        return $this->belongsTo(CemnSepultura::class, 'sepultura_id');
    }

    public function concesionPrevia(): BelongsTo
    {
        return $this->belongsTo(CemnConcesion::class, 'concesion_previa_id');
    }

    public function concesionesDerivadas(): HasMany
    {
        return $this->hasMany(CemnConcesion::class, 'concesion_previa_id');
    }

    public function concesionTerceros(): HasMany
    {
        return $this->hasMany(CemnConcesionTercero::class, 'concesion_id');
    }

    public function terceros(): BelongsToMany
    {
        return $this->belongsToMany(
            CemnTercero::class,
            'cemn_concesion_terceros',
            'concesion_id',
            'tercero_id'
        )->withPivot(['rol', 'fecha_desde', 'fecha_hasta', 'activo', 'notas'])
         ->withTimestamps();
    }

    /** El concesionario activo (rol='concesionario', activo=true). */
    public function concesionario(): HasOne
    {
        return $this->hasOne(CemnConcesionTercero::class, 'concesion_id')
                    ->where('rol', 'concesionario')
                    ->where('activo', true);
    }

    public function difuntos(): HasMany
    {
        return $this->hasMany(CemnDifunto::class, 'concesion_id');
    }

    // ── Scopes ─────────────────────────────────────────────────────────────

    public function scopeVigentes($query)
    {
        return $query->where('estado', 'vigente');
    }
}
