<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CemnPersona extends Model
{
    use SoftDeletes;
    protected $table = 'cemn_personas';

    protected $fillable = [
        'tipo',
        // Identidad
        'nombre',
        'apellido1',
        'apellido2',
        'nombre_completo',
        'nombre_original',
        'dni',
        // Titular
        'es_empresa',
        'cif',
        'razon_social',
        'telefono',
        'email',
        'direccion',
        'municipio',
        'provincia',
        'cp',
        // Difunto
        'sepultura_id',
        'concesion_id',
        'fecha_fallecimiento',
        'fecha_inhumacion',
        'fecha_exhumacion',
        'estado_inhumacion',
        'es_principal',
        'parentesco',
        'foto_path',
        'documento_sanidad_path',
        'motivo_exhumacion',
        // Común
        'notas',
    ];

    protected $appends = [
        'foto_url',
        'nombre_display',
    ];

    protected $casts = [
        'fecha_fallecimiento' => 'date',
        'fecha_inhumacion'    => 'date',
        'fecha_exhumacion'    => 'date',
        'es_empresa'          => 'boolean',
        'es_principal'        => 'boolean',
    ];

    // ── Relaciones ──────────────────────────────────────────────────────────

    public function concesionPersonas(): HasMany
    {
        return $this->hasMany(CemnConcesionPersona::class, 'persona_id');
    }

    public function concesiones(): BelongsToMany
    {
        return $this->belongsToMany(
            CemnConcesion::class,
            'cemn_concesion_personas',
            'persona_id',
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

    /** Sepultura donde está enterrado (solo difunto/ambos). */
    public function sepultura(): BelongsTo
    {
        return $this->belongsTo(CemnSepultura::class, 'sepultura_id');
    }

    /** Concesión directamente asociada (solo difunto/ambos). */
    public function concesion(): BelongsTo
    {
        return $this->belongsTo(CemnConcesion::class, 'concesion_id');
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(CemnMovimiento::class, 'persona_id');
    }

    // ── Accessors ────────────────────────────────────────────────────────────

    /** Nombre para mostrar: prioriza razon_social → apellidos compuestos → nombre_completo. */
    public function getNombreDisplayAttribute(): string
    {
        if ($this->es_empresa && $this->razon_social) {
            return $this->razon_social;
        }

        $partes = array_filter([$this->nombre, $this->apellido1, $this->apellido2]);
        if (!empty($partes)) {
            return trim(implode(' ', $partes));
        }

        return $this->nombre_completo ?? $this->nombre_original ?? '(sin nombre)';
    }

    public function getFotoUrlAttribute(): ?string
    {
        if (!$this->foto_path) {
            return null;
        }

        return '/storage/' . ltrim($this->foto_path, '/');
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeTitulares($query)
    {
        return $query->whereIn('tipo', ['titular', 'ambos']);
    }

    public function scopeDifuntos($query)
    {
        return $query->whereIn('tipo', ['difunto', 'ambos']);
    }

    public function scopeSinSepultura($query)
    {
        return $query->difuntos()->whereNull('sepultura_id');
    }

    public function scopeBuscar($query, string $termino)
    {
        return $query->where(function ($q) use ($termino) {
            $q->where('nombre', 'like', "%{$termino}%")
              ->orWhere('apellido1', 'like', "%{$termino}%")
              ->orWhere('apellido2', 'like', "%{$termino}%")
              ->orWhere('nombre_completo', 'like', "%{$termino}%")
              ->orWhere('nombre_original', 'like', "%{$termino}%")
              ->orWhere('dni', 'like', "%{$termino}%")
              ->orWhere('cif', 'like', "%{$termino}%")
              ->orWhere('razon_social', 'like', "%{$termino}%");
        });
    }
}
