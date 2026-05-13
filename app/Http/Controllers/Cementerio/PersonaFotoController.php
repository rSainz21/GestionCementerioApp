<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnPersona;
use App\Models\CemnSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PersonaFotoController extends Controller
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
        $persona = CemnPersona::query()->findOrFail($id);

        $fotoKb = CemnSetting::intRange('foto_max_kb', 5120, 1024, 20480);

        $data = $request->validate([
            'foto' => ['required', 'file', 'max:'.$fotoKb],
        ]);

        $file     = $data['foto'];
        $realPath = $file->getRealPath() ?: $file->getPathname();
        $ext      = null;
        $imgInfo  = @getimagesize($realPath);

        if ($imgInfo && !empty($imgInfo[2])) {
            $ext = match ((int) $imgInfo[2]) {
                IMAGETYPE_JPEG => 'jpg',
                IMAGETYPE_PNG  => 'png',
                IMAGETYPE_WEBP => 'webp',
                default        => null,
            };
        }
        if (!$ext) {
            $ext = $this->detectImageExtension($realPath);
        }
        if (!$ext) {
            return response()->json(['message' => 'El archivo subido no es una imagen válida (solo jpg/png/webp).'], 422);
        }

        $filename = Str::uuid()->toString() . '.' . $ext;
        $dir      = 'cementerio/personas/' . $persona->id;
        $path     = $file->storePubliclyAs($dir, $filename, 'public');

        $oldPath         = $persona->foto_path;
        $persona->foto_path = $path;
        $persona->save();

        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json([
            'message' => 'Foto guardada correctamente.',
            'item'    => $persona->fresh(),
        ]);
    }
}
