<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CemnDocumento extends Model
{
    protected $table = 'cemn_documentos';

    protected $fillable = [
        'sepultura_id',
        'tipo',
        'nombre_original',
        'ruta_archivo',
        'mime_type',
        'tamano_bytes',
        'descripcion',
    ];

    protected $casts = [
        'tamano_bytes' => 'integer',
    ];

    public function sepultura(): BelongsTo
    {
        return $this->belongsTo(CemnSepultura::class, 'sepultura_id');
    }
}
