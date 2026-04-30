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
    private function detectImageExtension(string $path): ?string
    {
        $fh = @fopen($path, 'rb');
        if (!$fh) return null;
        $head = @fread($fh, 16) ?: '';
        @fclose($fh);

        if (strlen($head) >= 8 && substr($head, 0, 8) === "\x89PNG\r\n\x1A\n") return 'png';
        if (strlen($head) >= 3 && substr($head, 0, 3) === "\xFF\xD8\xFF") return 'jpg';
        if (strlen($head) >= 12 && substr($head, 0, 4) === 'RIFF' && substr($head, 8, 4) === 'WEBP') return 'webp';

        return null;
    }

    public function store(Request $request, int $id): JsonResponse
    {
        /** @var CemnSepultura $sepultura */
        $sepultura = CemnSepultura::query()->findOrFail($id);

        $data = $request->validate([
            // Validación mínima: algunos entornos reportan MIME genérico y rompen rules "image/mimes".
            // La validación real se hace con getimagesize() (contenido) justo debajo.
            'imagen' => ['required', 'file', 'max:5120'], // 5MB
        ]);

        $file = $data['imagen'];

        $realPath = $file->getRealPath() ?: $file->getPathname();
        $ext = null;
        $imgInfo = @getimagesize($realPath);
        if ($imgInfo && !empty($imgInfo[2])) {
            $type = (int) $imgInfo[2];
            $ext = match ($type) {
                IMAGETYPE_JPEG => 'jpg',
                IMAGETYPE_PNG => 'png',
                IMAGETYPE_WEBP => 'webp',
                default => null,
            };
        }
        if (!$ext) {
            $ext = $this->detectImageExtension($realPath);
        }
        if (!$ext) {
            return response()->json(['message' => 'El archivo subido no es una imagen válida (solo jpg/png/webp).'], 422);
        }

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

