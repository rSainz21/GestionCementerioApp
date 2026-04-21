<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class CemnDifunto extends Model
{
    protected $table = 'cemn_difuntos';

    protected $fillable = [
        'tercero_id',
        'nombre_completo',
        'fecha_fallecimiento',
        'fecha_inhumacion',
        'sepultura_id',
        'es_titular',
        'parentesco',
        'notas',
        'foto_path',
    ];

    protected $appends = [
        'foto_url',
    ];

    protected $casts = [
        'fecha_fallecimiento' => 'date',
        'fecha_inhumacion'    => 'date',
        'es_titular'          => 'boolean',
    ];

    public function getFotoUrlAttribute(): ?string
    {
        if (!$this->foto_path) {
            return null;
        }

        // Devolver ruta relativa para que funcione en cualquier dispositivo (misma origin).
        // Si devolvemos URL absoluta basada en APP_URL, en LAN suele quedar como http://localhost/...
        return '/storage/' . ltrim($this->foto_path, '/');
    }

    public function tercero(): BelongsTo
    {
        return $this->belongsTo(CemnTercero::class, 'tercero_id');
    }

    public function sepultura(): BelongsTo
    {
        return $this->belongsTo(CemnSepultura::class, 'sepultura_id');
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(CemnMovimiento::class, 'difunto_id');
    }
}
