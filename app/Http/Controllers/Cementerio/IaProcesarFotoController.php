<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnPersona;
use App\Models\CemnDocumento;
use App\Models\CemnMovimiento;
use App\Models\CemnSepultura;
use App\Services\Cementerio\IaOcrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Procesamiento de fotos de nichos con IA (OCR + visión).
 *
 * Flujo en dos pasos (preferido sin id en URL por Apache):
 *   1. POST /api/cementerio-ia/scan — multipart: sepultura_id + foto (o POST …/procesar-foto/{id}).
 *   2. POST /api/cementerio-ia/confirm-difunto — JSON con sepultura_id + campos (o …/confirmar/{id}).
 */
class IaProcesarFotoController extends Controller
{
    public function __construct(private readonly IaOcrService $ocrService) {}

    /** POST /api/cementerio-ia/scan — multipart: sepultura_id + foto (misma lógica que procesar). */
    public function procesarDesdeBody(Request $request): JsonResponse
    {
        $request->validate([
            'sepultura_id' => ['required', 'integer', 'exists:cemn_sepulturas,id'],
            'foto'         => $this->fotoLapidaValidationRules(),
        ]);

        return $this->procesar($request, (int) $request->integer('sepultura_id'));
    }

    /** POST /api/cementerio-ia/confirm-difunto — JSON: sepultura_id + mismos campos que confirmar. */
    public function confirmarDesdeBody(Request $request): JsonResponse
    {
        $request->validate([
            'sepultura_id' => ['required', 'integer', 'exists:cemn_sepulturas,id'],
        ]);

        return $this->confirmar($request, (int) $request->integer('sepultura_id'));
    }

    // ─────────────────────────────────────────────────────────────────────
    // PASO 1 – Analizar la foto con IA
    // POST /api/cementerio-ia/procesar-foto/{id} (recomendado) + variantes /cementerio/ia/… y legacy sepulturas/…
    // ─────────────────────────────────────────────────────────────────────

    public function procesar(Request $request, int $id): JsonResponse
    {
        /** @var CemnSepultura $sepultura */
        $sepultura = CemnSepultura::query()->findOrFail($id);

        $request->validate([
            'foto' => $this->fotoLapidaValidationRules(),
        ]);

        $file     = $request->file('foto');
        $mimeType = $file->getMimeType() ?? 'image/jpeg';

        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $dir = 'cementerio/sepulturas/' . $sepultura->id . '/documentos';
        $filename = Str::uuid()->toString() . '.' . $ext;

        $docPath   = null;
        $documento = null;
        try {
            $docPath = $file->storePubliclyAs($dir, $filename, 'public');
            $documento = CemnDocumento::query()->create([
                'sepultura_id'    => $sepultura->id,
                'tipo'            => 'fotografia',
                'nombre_original' => $file->getClientOriginalName() ?: ('lapida-ia.' . $ext),
                'ruta_archivo'    => $docPath,
                'mime_type'       => $mimeType,
                'tamano_bytes'    => $file->getSize() ?: null,
                'descripcion'     => 'Lápida / nicho — captura para lectura IA (revisión pendiente)',
            ]);

            $bytes = Storage::disk('public')->get($docPath);
            $extraido = $this->ocrService->extraerDatosNicho(base64_encode($bytes), $mimeType);
        } catch (\Throwable $e) {
            if ($documento) {
                $documento->delete();
            }
            if ($docPath && Storage::disk('public')->exists($docPath)) {
                Storage::disk('public')->delete($docPath);
            }
            Log::error('[IaProcesar] Fallo al guardar documento o en IA', [
                'sepultura_id' => $id,
                'error'        => $e->getMessage(),
            ]);

            return response()->json([
                'ok'    => false,
                'error' => $e instanceof \RuntimeException ? $e->getMessage() : 'No se pudo guardar la foto ni analizarla.',
            ], 422);
        }

        Log::info('[IaProcesar] Foto en documentos + IA', [
            'sepultura_id'  => $id,
            'documento_id'  => $documento->id,
            'confianza'     => $extraido['confianza'],
            'proveedor'     => $extraido['proveedor'],
        ]);

        return response()->json([
            'ok'             => true,
            'sepultura_id'   => $sepultura->id,
            'documento_id'   => $documento->id,
            'ruta_archivo'   => $docPath,
            'url'            => '/storage/' . ltrim($docPath, '/'),
            'foto_temp_path' => null,
            'extraido'       => $extraido,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PASO 2 – Confirmar y guardar en BD
    // POST /api/cementerio-ia/confirmar/{id} + variantes
    // ─────────────────────────────────────────────────────────────────────

    public function confirmar(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'nombre_completo'     => ['required', 'string', 'max:200'],
            'fecha_fallecimiento' => ['nullable', 'string', 'max:30'],   // se parsea más abajo
            'fecha_inhumacion'    => ['nullable', 'string', 'max:30'],
            'fecha_nacimiento'    => ['nullable', 'string', 'max:30'],
            'numero_expediente'   => ['nullable', 'string', 'max:100'],
            'notas'               => ['nullable', 'string', 'max:2000'],
            'es_principal'        => ['nullable', 'boolean'],
            'documento_id'        => [
                'nullable',
                'integer',
                Rule::exists('cemn_documentos', 'id')->where(fn ($q) => $q->where('sepultura_id', $id)),
            ],
            'foto_temp_path'      => ['nullable', 'string', 'max:500'],
            'actualizar_estado'   => ['nullable', 'boolean'],
        ]);

        $result = DB::transaction(function () use ($data, $id) {
            /** @var CemnSepultura $sepultura */
            $sepultura = CemnSepultura::query()->lockForUpdate()->findOrFail($id);

            $esPrincipal = (bool) ($data['es_principal'] ?? true);

            // Foto del difunto: copia desde cemn_documentos (galería) o mueve desde ia-temp (legacy).
            $fotoPermanente = null;
            if (!empty($data['documento_id'])) {
                $doc = CemnDocumento::query()
                    ->where('sepultura_id', $sepultura->id)
                    ->whereKey((int) $data['documento_id'])
                    ->first();
                if ($doc && $doc->ruta_archivo && Storage::disk('public')->exists($doc->ruta_archivo)) {
                    $ext         = pathinfo($doc->ruta_archivo, PATHINFO_EXTENSION) ?: 'jpg';
                    $stagingPath = 'cementerio/personas/staging/' . Str::uuid() . '.' . $ext;
                    Storage::disk('public')->copy($doc->ruta_archivo, $stagingPath);
                    $fotoPermanente = $stagingPath;
                }
            } elseif (!empty($data['foto_temp_path'])) {
                $tempPath = ltrim($data['foto_temp_path'], '/');
                if (Storage::disk('public')->exists($tempPath)) {
                    $ext         = pathinfo($tempPath, PATHINFO_EXTENSION) ?: 'jpg';
                    $stagingDir  = 'cementerio/personas/staging';
                    $stagingPath = $stagingDir . '/' . Str::uuid() . '.' . $ext;
                    Storage::disk('public')->move($tempPath, $stagingPath);
                    $fotoPermanente = $stagingPath;
                }
            }

            $difunto = CemnPersona::query()->create([
                'tipo'                => 'difunto',
                'nombre_completo'     => $data['nombre_completo'],
                'fecha_fallecimiento' => $this->safeDate($data['fecha_fallecimiento'] ?? null),
                'fecha_inhumacion'    => $this->safeDate($data['fecha_inhumacion'] ?? null),
                'sepultura_id'        => $sepultura->id,
                'es_principal'        => $esPrincipal,
                'notas'               => $data['notas'] ?? null,
                'foto_path'           => $fotoPermanente,
            ]);

            // Reubicar la foto al directorio definitivo del difunto ya creado
            if ($fotoPermanente && Storage::disk('public')->exists($fotoPermanente)) {
                $ext      = pathinfo($fotoPermanente, PATHINFO_EXTENSION) ?: 'jpg';
                $finalDir = 'cementerio/personas/' . $difunto->id;
                $finalPath = $finalDir . '/' . Str::uuid() . '.' . $ext;
                Storage::disk('public')->move($fotoPermanente, $finalPath);
                $difunto->foto_path = $finalPath;
                $difunto->save();
            }

            if (!empty($data['documento_id'])) {
                $pie = Str::limit(trim($data['nombre_completo']), 400, '…');
                CemnDocumento::query()
                    ->where('sepultura_id', $sepultura->id)
                    ->whereKey((int) $data['documento_id'])
                    ->update([
                        'descripcion' => 'Lápida / lectura IA — ' . $pie . ' (difunto #' . $difunto->id . ')',
                    ]);
            }

            // Registrar movimiento de inhumación
            CemnMovimiento::query()->create([
                'persona_id'           => $difunto->id,
                'tipo'                 => 'inhumacion',
                'fecha'                => $this->safeDate($data['fecha_inhumacion'] ?? $data['fecha_fallecimiento'] ?? null),
                'sepultura_origen_id'  => $sepultura->id,
                'sepultura_destino_id' => null,
                'numero_expediente'    => $data['numero_expediente'] ?? null,
                'notas'                => 'Creado automáticamente por lectura IA de foto',
            ]);

            // Actualizar estado de la sepultura si corresponde
            if ((bool) ($data['actualizar_estado'] ?? true)
                && $sepultura->estado !== CemnSepultura::ESTADO_OCUPADA
            ) {
                $sepultura->estado = CemnSepultura::ESTADO_OCUPADA;
                $sepultura->save();
            }

            return [
                'difunto'   => $difunto->fresh(),
                'sepultura' => $sepultura->fresh(),
            ];
        });

        Log::info('[IaProcesar] Datos IA confirmados y guardados', [
            'sepultura_id' => $id,
            'persona_id'   => $result['difunto']->id,
        ]);

        return response()->json([
            'ok'         => true,
            'difunto_id' => $result['difunto']->id,
            'difunto'    => $result['difunto'],
            'sepultura'  => $result['sepultura'],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────

    /**
     * @return array<int, mixed>
     */
    private function fotoLapidaValidationRules(): array
    {
        return [
            'required',
            'file',
            'max:12288',
            function (string $attribute, mixed $value, \Closure $fail): void {
                if (!$value instanceof UploadedFile) {
                    $fail('No se recibió un archivo de imagen válido.');

                    return;
                }
                $mime = strtolower((string) ($value->getMimeType() ?: $value->getClientMimeType() ?: ''));
                $allowed = [
                    'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif',
                    'image/bmp', 'image/heic', 'image/heif', 'image/heif-sequence', 'image/heic-sequence',
                    // iOS a veces etiqueta HEIC/JPEG como video/quicktime u octet-stream.
                    'video/quicktime',
                ];
                if ($mime === '' || $mime === 'application/octet-stream') {
                    $ext = strtolower((string) ($value->getClientOriginalExtension() ?: ''));
                    if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'heif'], true)) {
                        return;
                    }
                }
                if (!in_array($mime, $allowed, true)) {
                    $fail('La foto debe ser imagen (JPEG, PNG, WebP, HEIC…). Tipo recibido: ' . ($mime !== '' ? $mime : 'desconocido') . '.');
                }
            },
        ];
    }

    private function safeDate(?string $val): ?string
    {
        if (!$val || trim($val) === '') {
            return null;
        }
        $val = trim($val);
        // Formato esperado por MySQL: YYYY-MM-DD
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $val)) {
            return $val;
        }
        // Intentar parsear texto libre
        try {
            $ts = strtotime($val);
            if ($ts !== false && $ts > 0) {
                return date('Y-m-d', $ts);
            }
        } catch (\Throwable) {
            // ignore
        }
        return null;
    }
}
