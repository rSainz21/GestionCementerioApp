<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CemnSetting extends Model
{
    protected $table = 'cemn_settings';

    protected $fillable = [
        'grupo', 'clave', 'valor', 'tipo', 'etiqueta', 'descripcion', 'opciones',
    ];

    protected $casts = [
        'opciones' => 'array',
    ];

    public static function get(string $clave, mixed $default = null): mixed
    {
        return static::where('clave', $clave)->value('valor') ?? $default;
    }

    public static function int(string $clave, int $default = 0): int
    {
        $v = static::get($clave);
        if ($v === null || $v === '') {
            return $default;
        }

        return (int) $v;
    }

    public static function intRange(string $clave, int $default, int $min, int $max): int
    {
        return max($min, min($max, static::int($clave, $default)));
    }

    public static function set(string $clave, mixed $valor): void
    {
        static::where('clave', $clave)->update(['valor' => $valor]);
    }
}
