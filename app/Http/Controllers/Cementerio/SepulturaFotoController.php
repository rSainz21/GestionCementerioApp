<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnPersona;
use App\Models\CemnSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SepulturaFotoController extends Controller
{
    public function store(Request $request, int $id): JsonResponse
    {
        $difunto = CemnPersona::query()
            ->difuntos()
            ->where('sepultura_id', $id)
            ->where('es_principal', true)
            ->orderByDesc('id')
            ->first();

        if (!$difunto) {
            return response()->json([
                'message' => 'No hay persona principal asociada a esta sepultura.',
            ], 422);
        }

        $fotoKb = CemnSetting::intRange('foto_max_kb', 5120, 1024, 20480);

        $data = $request->validate([
            'foto' => ['required', 'file', 'image', 'max:'.$fotoKb],
        ]);

        $file = $data['foto'];
        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $filename = Str::uuid()->toString() . '.' . $ext;

        $dir = 'cementerio/personas/' . $difunto->id;
        $path = $file->storePubliclyAs($dir, $filename, 'public');

        $oldPath = $difunto->foto_path;
        $difunto->foto_path = $path;
        $difunto->save();

        // Borrar el archivo viejo DESPUÉS de confirmar que la nueva ruta quedó guardada.
        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json([
            'message' => 'Foto guardada correctamente.',
            'item' => $difunto->fresh(),
        ]);
    }
}

