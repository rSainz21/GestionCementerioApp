<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
class CemnConcesion extends Model
{
    use SoftDeletes;
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

    public function concesionPersonas(): HasMany
    {
        return $this->hasMany(CemnConcesionPersona::class, 'concesion_id');
    }

    public function personas(): BelongsToMany
    {
        return $this->belongsToMany(
            CemnPersona::class,
            'cemn_concesion_personas',
            'concesion_id',
            'persona_id'
        )->withPivot(['rol', 'fecha_desde', 'fecha_hasta', 'activo', 'notas'])
         ->withTimestamps();
    }

    /** Titulares de la concesión (tipo titular/ambos en pivot). */
    public function titulares(): BelongsToMany
    {
        return $this->personas()->whereIn('cemn_personas.tipo', ['titular', 'ambos']);
    }

    /** El concesionario activo (rol='concesionario', activo=true). */
    public function concesionario(): HasOne
    {
        return $this->hasOne(CemnConcesionPersona::class, 'concesion_id')
                    ->where('rol', 'concesionario')
                    ->where('activo', true);
    }

    public function difuntos(): HasMany
    {
        return $this->hasMany(CemnPersona::class, 'concesion_id')
                    ->whereIn('tipo', ['difunto', 'ambos']);
    }

    // ── Scopes ─────────────────────────────────────────────────────────────

    public function scopeVigentes($query)
    {
        return $query->where('estado', 'vigente');
    }
}
