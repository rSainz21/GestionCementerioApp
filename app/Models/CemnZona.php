<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CemnZona extends Model
{
    protected $table = 'cemn_zonas';

    protected $fillable = [
        'cementerio_id',
        'nombre',
        'codigo',
        'descripcion',
    ];

    public function cementerio(): BelongsTo
    {
        return $this->belongsTo(CemnCementerio::class, 'cementerio_id');
    }

    public function bloques(): HasMany
    {
        return $this->hasMany(CemnBloque::class, 'zona_id');
    }

    public function sepulturas(): HasMany
    {
        return $this->hasMany(CemnSepultura::class, 'zona_id');
    }
}
