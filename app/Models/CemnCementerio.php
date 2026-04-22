<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CemnCementerio extends Model
{
    protected $table = 'cemn_cementerios';

    protected $fillable = [
        'nombre',
        'municipio',
        'direccion',
        'lat',
        'lon',
        'notas',
    ];

    protected $casts = [
        'lat' => 'decimal:7',
        'lon' => 'decimal:7',
    ];

    public function zonas(): HasMany
    {
        return $this->hasMany(CemnZona::class, 'cementerio_id');
    }
}
