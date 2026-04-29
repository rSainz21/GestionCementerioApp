<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnDocumento;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SepulturaDocumentoController extends Controller
{
    public function store(Request $request, int $id): JsonResponse
    {
        /** @var CemnSepultura $sepultura */
        $sepultura = CemnSepultura::query()->findOrFail($id);

        $data = $request->validate([
            'archivo' => ['required', 'file', 'max:10240'], // 10MB
            'tipo' => ['nullable', 'string', 'max:30'],
            'descripcion' => ['nullable', 'string', 'max:2000'],
        ]);

        $file = $data['archivo'];
        $ext = strtolower($file->getClientOriginalExtension() ?: 'bin');
        $filename = Str::uuid()->toString().'.'.$ext;

        $dir = 'cementerio/sepulturas/'.$sepultura->id.'/documentos';
        $path = $file->storePubliclyAs($dir, $filename, 'public');

        $doc = CemnDocumento::query()->create([
            'sepultura_id' => $sepultura->id,
            'tipo' => $data['tipo'] ?? 'otro',
            'nombre_original' => $file->getClientOriginalName(),
            'ruta_archivo' => $path,
            'mime_type' => $file->getClientMimeType(),
            'tamano_bytes' => $file->getSize(),
            'descripcion' => $data['descripcion'] ?? null,
        ]);

        $fresh = $doc->fresh();

        return response()->json([
            'message' => 'Documento adjuntado correctamente.',
            'item' => array_merge($fresh->toArray(), [
                'url' => $fresh->ruta_archivo ? ('/storage/'.ltrim($fresh->ruta_archivo, '/')) : null,
            ]),
        ]);
    }
}

