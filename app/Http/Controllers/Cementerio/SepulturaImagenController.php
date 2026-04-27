<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SepulturaImagenController extends Controller
{
    public function store(Request $request, int $id): JsonResponse
    {
        /** @var CemnSepultura $sepultura */
        $sepultura = CemnSepultura::query()->findOrFail($id);

        $data = $request->validate([
            'imagen' => ['required', 'file', 'image', 'max:5120'], // 5MB
        ]);

        $file = $data['imagen'];
        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $filename = Str::uuid()->toString() . '.' . $ext;

        $dir = 'cementerio/sepulturas/' . $sepultura->id;
        $path = $file->storePubliclyAs($dir, $filename, 'public');

        $oldImagen = $sepultura->imagen;
        $sepultura->imagen = $path;
        $sepultura->save();

        // Borrar imagen previa DESPUÉS de confirmar que la nueva ruta quedó guardada.
        if ($oldImagen && str_starts_with($oldImagen, 'cementerio/sepulturas/')) {
            Storage::disk('public')->delete($oldImagen);
        }

        return response()->json([
            'message' => 'Imagen guardada correctamente.',
            'item' => $sepultura->fresh(['bloque:id,codigo', 'zona:id,nombre']),
        ]);
    }
}

