<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index(): JsonResponse
    {
        $grupos = CemnSetting::orderBy('grupo')->orderBy('id')->get()
            ->groupBy('grupo')
            ->map(fn($items) => $items->values());

        return response()->json($grupos);
    }

    public function update(Request $request): JsonResponse
    {
        $updates = $request->validate([
            'settings'          => ['required', 'array'],
            'settings.*.clave'  => ['required', 'string', 'exists:cemn_settings,clave'],
            'settings.*.valor'  => ['nullable', 'string', 'max:1000'],
        ]);

        foreach ($updates['settings'] as $item) {
            CemnSetting::where('clave', $item['clave'])->update(['valor' => $item['valor']]);
        }

        return response()->json(['ok' => true]);
    }
}
