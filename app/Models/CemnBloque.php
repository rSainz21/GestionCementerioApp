<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CemnBloque extends Model
{
    protected $table = 'cemn_bloques';

    protected $fillable = [
        'zona_id',
        'nombre',
        'codigo',
        'tipo',
        'filas',
        'columnas',
        'sentido_numeracion',
        'numero_inicio',
        'descripcion',
        'lat',
        'lon',
    ];

    protected $casts = [
        'filas'    => 'integer',
        'columnas' => 'integer',
        'numero_inicio' => 'integer',
        'lat'      => 'decimal:7',
        'lon'      => 'decimal:7',
    ];

    public function zona(): BelongsTo
    {
        return $this->belongsTo(CemnZona::class, 'zona_id');
    }

    public function sepulturas(): HasMany
    {
        return $this->hasMany(CemnSepultura::class, 'bloque_id');
    }

    /**
     * Devuelve el total de celdas de la cuadrícula (filas × columnas).
     */
    public function getTotalCeldasAttribute(): int
    {
        return $this->filas * $this->columnas;
    }

    /**
     * Número de sepulturas libres en este bloque.
     */
    public function getSepulturasLibresCountAttribute(): int
    {
        return $this->sepulturas()->where('estado', 'libre')->count();
    }
}
