<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CemnTercero extends Model
{
    protected $table = 'cemn_terceros';

    protected $fillable = [
        'dni',
        'nombre',
        'apellido1',
        'apellido2',
        'nombre_original',
        'telefono',
        'email',
        'direccion',
        'municipio',
        'provincia',
        'cp',
        'es_empresa',
        'cif',
        'razon_social',
        'notas',
    ];

    protected $casts = [
        'es_empresa' => 'boolean',
    ];

    // ── Relaciones ─────────────────────────────────────────────────────────

    public function concesionTerceros(): HasMany
    {
        return $this->hasMany(CemnConcesionTercero::class, 'tercero_id');
    }

    public function concesiones(): BelongsToMany
    {
        return $this->belongsToMany(
            CemnConcesion::class,
            'cemn_concesion_terceros',
            'tercero_id',
            'concesion_id'
        )->withPivot(['rol', 'fecha_desde', 'fecha_hasta', 'activo', 'notas'])
         ->withTimestamps();
    }

    public function concesionesVigentes(): BelongsToMany
    {
        return $this->concesiones()
                    ->wherePivot('activo', true)
                    ->where('cemn_concesiones.estado', 'vigente');
    }

    public function difuntos(): HasMany
    {
        return $this->hasMany(CemnDifunto::class, 'tercero_id');
    }

    // ── Accessors ──────────────────────────────────────────────────────────

    public function getNombreCompletoAttribute(): string
    {
        if ($this->es_empresa) {
            return $this->razon_social ?? $this->nombre;
        }

        return trim(implode(' ', array_filter([
            $this->nombre,
            $this->apellido1,
            $this->apellido2,
        ])));
    }

    // ── Scopes ─────────────────────────────────────────────────────────────

    public function scopeBuscar($query, string $termino)
    {
        return $query->where(function ($q) use ($termino) {
            $q->where('nombre', 'like', "%{$termino}%")
              ->orWhere('apellido1', 'like', "%{$termino}%")
              ->orWhere('apellido2', 'like', "%{$termino}%")
              ->orWhere('dni', 'like', "%{$termino}%")
              ->orWhere('cif', 'like', "%{$termino}%")
              ->orWhere('razon_social', 'like', "%{$termino}%");
        });
    }
}
