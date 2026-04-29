<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnNfcTag;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NfcTagsController extends Controller
{
    public function show(string $tagId): JsonResponse
    {
        $tagId = trim($tagId);
        if ($tagId === '') {
            return response()->json(['error' => 'tag_id vacío.'], 422);
        }

        $item = CemnNfcTag::query()
            ->where('tag_id', $tagId)
            ->first();

        if (!$item) {
            return response()->json(['found' => false], 404);
        }

        return response()->json([
            'found' => true,
            'item' => [
                'id' => $item->id,
                'tag_id' => $item->tag_id,
                'sepultura_id' => $item->sepultura_id,
            ],
        ]);
    }

    public function upsert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tag_id' => 'required|string|max:80',
            'sepultura_id' => 'required|integer|exists:cemn_sepulturas,id',
        ]);

        // Validación extra: si ya existe una vinculación a otra sepultura, la sobrescribimos (caso real: etiquetas reutilizadas).
        $item = CemnNfcTag::query()->where('tag_id', $data['tag_id'])->first();
        $created = false;

        if (!$item) {
            $item = new CemnNfcTag();
            $item->tag_id = $data['tag_id'];
            $item->created_by = $request->user()?->id;
            $created = true;
        }

        // Aseguramos que la sepultura existe (por si cambia el "exists" en tests)
        CemnSepultura::query()->findOrFail((int) $data['sepultura_id']);
        $item->sepultura_id = (int) $data['sepultura_id'];
        $item->save();

        return response()->json([
            'item' => [
                'id' => $item->id,
                'tag_id' => $item->tag_id,
                'sepultura_id' => $item->sepultura_id,
            ],
            'created' => $created,
        ], $created ? 201 : 200);
    }

    public function destroy(string $tagId): JsonResponse
    {
        $tagId = trim($tagId);
        if ($tagId === '') {
            return response()->json(['error' => 'tag_id vacío.'], 422);
        }

        CemnNfcTag::query()->where('tag_id', $tagId)->delete();

        return response()->json(['ok' => true]);
    }
}

