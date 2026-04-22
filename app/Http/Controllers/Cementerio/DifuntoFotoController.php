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
    public function store(Request $request, int $id): JsonResponse
    {
        /** @var CemnDifunto $difunto */
        $difunto = CemnDifunto::query()->findOrFail($id);

        $data = $request->validate([
            'foto' => ['required', 'file', 'image', 'max:5120'], // 5MB
        ]);

        $file = $data['foto'];
        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $filename = Str::uuid()->toString().'.'.$ext;

        $dir = 'cementerio/difuntos/'.$difunto->id;
        $path = $file->storePubliclyAs($dir, $filename, 'public');

        if ($difunto->foto_path) {
            Storage::disk('public')->delete($difunto->foto_path);
        }

        $difunto->foto_path = $path;
        $difunto->save();

        return response()->json([
            'message' => 'Foto guardada correctamente.',
            'item' => $difunto->fresh(),
        ]);
    }
}

