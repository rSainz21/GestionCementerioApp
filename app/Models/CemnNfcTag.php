<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CemnNfcTag extends Model
{
    protected $table = 'cemn_nfc_tags';

    protected $fillable = [
        'tag_id',
        'sepultura_id',
        'created_by',
    ];

    protected $casts = [
        'sepultura_id' => 'integer',
        'created_by' => 'integer',
    ];

    public function sepultura(): BelongsTo
    {
        return $this->belongsTo(CemnSepultura::class, 'sepultura_id');
    }
}

