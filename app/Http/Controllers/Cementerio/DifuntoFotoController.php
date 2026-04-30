<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnDifunto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DifuntoFotoController extends Controller
{
    private function detectImageExtension(string $path): ?string
    {
        $fh = @fopen($path, 'rb');
        if (!$fh) return null;
        $head = @fread($fh, 16) ?: '';
        @fclose($fh);

        // PNG signature: 89 50 4E 47 0D 0A 1A 0A
        if (strlen($head) >= 8 && substr($head, 0, 8) === "\x89PNG\r\n\x1A\n") return 'png';
        // JPEG signature: FF D8 FF
        if (strlen($head) >= 3 && substr($head, 0, 3) === "\xFF\xD8\xFF") return 'jpg';
        // WEBP signature: RIFF....WEBP
        if (strlen($head) >= 12 && substr($head, 0, 4) === 'RIFF' && substr($head, 8, 4) === 'WEBP') return 'webp';

        return null;
    }

    public function store(Request $request, int $id): JsonResponse
    {
        /** @var CemnDifunto $difunto */
        $difunto = CemnDifunto::query()->findOrFail($id);

        $data = $request->validate([
            // Validación mínima: algunos entornos reportan MIME genérico y rompen rules "image/mimes".
            // La validación real se hace con getimagesize() (contenido) justo debajo.
            'foto' => ['required', 'file', 'max:5120'], // 5MB
        ]);

        $file = $data['foto'];

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

        $dir = 'cementerio/difuntos/'.$difunto->id;
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

