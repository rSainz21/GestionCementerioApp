<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

class CemnSepultura extends Model
{
    protected $table = 'cemn_sepulturas';

    protected $fillable = [
        'zona_id',
        'bloque_id',
        'tipo',
        'numero',
        'fila',
        'columna',
        'parte',
        'codigo',
        'estado',
        'largo_m',
        'ancho_m',
        'ubicacion_texto',
        'lat',
        'lon',
        'imagen',
        'notas',
    ];

    protected $casts = [
        'fila'     => 'integer',
        'columna'  => 'integer',
        'numero'   => 'integer',
        'largo_m'  => 'decimal:2',
        'ancho_m'  => 'decimal:2',
        'lat'      => 'decimal:7',
        'lon'      => 'decimal:7',
    ];

    protected $appends = [
        'imagen_url',
    ];

    public function getImagenUrlAttribute(): ?string
    {
        if (!$this->imagen) {
            return null;
        }

        // Si ya viene como URL absoluta o relativa pública, no tocarla.
        if (str_starts_with($this->imagen, 'http://') || str_starts_with($this->imagen, 'https://') || str_starts_with($this->imagen, '/')) {
            return $this->imagen;
        }

        // Ruta relativa para LAN (mismo origin), consistente con CemnDifunto::foto_url
        return '/storage/' . ltrim($this->imagen, '/');
    }

    // ── Constantes de estado ───────────────────────────────────────────────
    const ESTADO_LIBRE   = 'libre';
    const ESTADO_OCUPADA = 'ocupada';

    // ── Relaciones ─────────────────────────────────────────────────────────

    public function zona(): BelongsTo
    {
        return $this->belongsTo(CemnZona::class, 'zona_id');
    }

    public function bloque(): BelongsTo
    {
        return $this->belongsTo(CemnBloque::class, 'bloque_id');
    }

    public function concesiones(): HasMany
    {
        return $this->hasMany(CemnConcesion::class, 'sepultura_id');
    }

    /** Concesión activa (vigente o renovada), la más reciente. */
    public function concesionVigente(): HasOne
    {
        return $this->hasOne(CemnConcesion::class, 'sepultura_id')
            ->whereIn('estado', ['vigente', 'renovada'])
            ->orderByDesc('fecha_concesion');
    }

    public function difuntos(): HasMany
    {
        return $this->hasMany(CemnDifunto::class, 'sepultura_id');
    }

    /** Difunto principal (es_titular = true). */
    public function difuntoTitular(): HasOne
    {
        // Evitamos `latestOfMany()` porque en SQLite puede generar subconsultas con
        // columnas ambiguas (`sepultura_id`) cuando se combina con `where`.
        return $this->hasOne(CemnDifunto::class, 'sepultura_id')
            ->where('es_titular', true)
            ->orderByDesc('fecha_inhumacion');
    }

    public function documentos(): HasMany
    {
        return $this->hasMany(CemnDocumento::class, 'sepultura_id');
    }

    public function movimientosOrigen(): HasMany
    {
        return $this->hasMany(CemnMovimiento::class, 'sepultura_origen_id');
    }

    public function movimientosDestino(): HasMany
    {
        return $this->hasMany(CemnMovimiento::class, 'sepultura_destino_id');
    }

    // ── Scopes ─────────────────────────────────────────────────────────────

    public function scopeLibres($query)
    {
        return $query->where('estado', self::ESTADO_LIBRE);
    }

    public function scopeOcupadas($query)
    {
        return $query->where('estado', self::ESTADO_OCUPADA);
    }

    public function scopeEnBloque($query, int $bloqueId)
    {
        return $query->where('bloque_id', $bloqueId);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    public function isLibre(): bool
    {
        return $this->estado === self::ESTADO_LIBRE;
    }

    /**
     * Genera el código canónico de una sepultura en un bloque.
     * Formato: {codigo_bloque}-F{fila}-C{columna}
     */
    public static function generarCodigo(CemnBloque $bloque, int $fila, int $columna): string
    {
        return sprintf('%s-F%d-C%d', $bloque->codigo, $fila, $columna);
    }
}
