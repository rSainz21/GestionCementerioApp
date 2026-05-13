<?php

namespace App\Services\Cementerio;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * OCR / visión IA para lápidas y placas de nichos.
 *
 * Proveedores:
 * - **Gemini** (Google AI Studio, capa gratuita con límites): GEMINI_API_KEY + modelo por defecto gemini-2.0-flash.
 * - **OpenAI**: OPENAI_API_KEY + OPENAI_VISION_MODEL.
 *
 * Elección: IA_VISION_PROVIDER=auto|gemini|openai. En **auto**, si hay clave Gemini se usa Gemini; si no, OpenAI.
 */
class IaOcrService
{
    /**
     * @return array{
     *   nombre_completo: string|null,
     *   fecha_nacimiento: string|null,
     *   fecha_fallecimiento: string|null,
     *   fecha_inhumacion: string|null,
     *   numero_expediente: string|null,
     *   otros_textos: string|null,
     *   confianza: float,
     *   raw_text: string,
     *   proveedor: string
     * }
     *
     * @throws \RuntimeException
     */
    public function extraerDatosNicho(string $imageBase64, string $mimeType = 'image/jpeg'): array
    {
        $provider = $this->resolveProvider();
        if ($provider === 'none') {
            throw new \RuntimeException(
                'No hay proveedor de visión configurado. Opciones: ' .
                '1) Clave gratuita Gemini: https://aistudio.google.com/apikey → GEMINI_API_KEY en .env. ' .
                '2) OpenAI: OPENAI_API_KEY en .env. ' .
                'Opcional: IA_VISION_PROVIDER=auto|gemini|openai (por defecto auto).'
            );
        }

        $prompt = $this->promptLapida();
        $content = $provider === 'gemini'
            ? $this->fetchJsonFromGemini($prompt, $imageBase64, $mimeType)
            : $this->fetchJsonFromOpenAi($prompt, $imageBase64, $mimeType);

        $content = $this->stripMarkdownJsonFence($content);

        try {
            $extracted = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            Log::warning('[IaOcrService] JSON inválido en la respuesta', ['content' => $content]);
            $extracted = [];
        }

        if (!is_array($extracted)) {
            $extracted = [];
        }

        $model = $provider === 'gemini'
            ? (string) config('services.gemini.model', 'gemini-2.0-flash')
            : (string) config('services.openai.vision_model', 'gpt-4o');

        $row = [
            'nombre_completo'     => $this->cleanNombre($extracted['nombre_completo'] ?? null),
            'fecha_nacimiento'    => $this->parseDate($extracted['fecha_nacimiento'] ?? null),
            'fecha_fallecimiento' => $this->parseDate($extracted['fecha_fallecimiento'] ?? null),
            'fecha_inhumacion'    => $this->parseDate($extracted['fecha_inhumacion'] ?? null),
            'numero_expediente'   => $this->cleanString($extracted['numero_expediente'] ?? null),
            'otros_textos'        => $this->cleanString($extracted['otros_textos'] ?? null),
            'confianza'           => round(min(1.0, max(0.0, (float) ($extracted['confianza'] ?? 0.5))), 2),
            'raw_text'            => $content,
            'proveedor'           => $provider . '/' . $model,
        ];

        return $this->aplicarHeuristicas($row);
    }

    private function resolveProvider(): string
    {
        $p = strtolower(trim((string) config('services.ia_vision.provider', 'auto')));
        if ($p === 'gemini') {
            return $this->geminiKey() !== '' ? 'gemini' : 'none';
        }
        if ($p === 'openai') {
            return $this->openaiKey() !== '' ? 'openai' : 'none';
        }
        if ($this->geminiKey() !== '') {
            return 'gemini';
        }
        if ($this->openaiKey() !== '') {
            return 'openai';
        }

        return 'none';
    }

    private function geminiKey(): string
    {
        return trim((string) config('services.gemini.key', ''));
    }

    private function openaiKey(): string
    {
        return trim((string) config('services.openai.key', ''));
    }

    private function promptLapida(): string
    {
        return <<<'PROMPT'
Eres un experto en leer placas, lápidas y nichos funerarios en España y Latinoamérica.
Analiza la imagen y extrae la información visible (no inventes nada).

Devuelve un JSON con EXACTAMENTE estas claves (null si no aplica):
{
  "nombre_completo": "Nombre y apellidos del difunto, sin prefijos religiosos abreviados (D.E.P., R.I.P.)",
  "fecha_nacimiento": "YYYY-MM-DD preferiblemente; si solo año YYYY-01-01; si mes+año YYYY-MM-01",
  "fecha_fallecimiento": "igual formato; suele etiquetarse como fallecimiento, +, †, o segunda fecha bajo el nombre",
  "fecha_inhumacion": "solo si aparece explícita (inhumación, sepultura, depósito); null si no consta",
  "numero_expediente": "expediente, registro, referencia municipal o código alfanumérico visible",
  "otros_textos": "epitafio, dedicatorias, nombres de familiares, textos que no encajen en otros campos",
  "confianza": 0.0
}

Fechas en imagen (muy frecuente):
- Formato europeo DD/MM/AAAA o DD-MM-AAAA → convierte a YYYY-MM-DD.
- Texto "14 de marzo de 1985" → 1985-03-14 (meses en español).
- Dos fechas bajo el nombre: la anterior suele ser nacimiento y la posterior defunción.
- Si solo hay una fecha y parece defunción (símbolos † +), úsala como fecha_fallecimiento.

Confianza:
- 0.85–1.0 si nombre y al menos una fecha son claros.
- 0.5–0.84 si solo nombre o solo fechas legibles.
- menor que 0.5 si la lectura es muy dudosa.

Si la imagen no es una lápida/placa/nicho funerario, devuelve todo null y confianza 0.
Responde SOLO con el JSON, sin markdown ni texto fuera del objeto.
PROMPT;
    }

    private function fetchJsonFromOpenAi(string $prompt, string $imageBase64, string $mimeType): string
    {
        $key = $this->openaiKey();
        $model = (string) config('services.openai.vision_model', 'gpt-4o');

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$key}",
            'Content-Type'    => 'application/json',
        ])
            ->timeout(60)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model'           => $model,
                'max_tokens'      => 900,
                'response_format' => ['type' => 'json_object'],
                'messages'        => [
                    [
                        'role'    => 'user',
                        'content' => [
                            [
                                'type' => 'text',
                                'text' => $prompt,
                            ],
                            [
                                'type'      => 'image_url',
                                'image_url' => [
                                    'url'    => "data:{$mimeType};base64,{$imageBase64}",
                                    'detail' => 'high',
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        if (!$response->successful()) {
            Log::error('[IaOcrService] Error respuesta OpenAI', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new \RuntimeException(
                'La API de OpenAI devolvió un error ' . $response->status() .
                '. Comprueba OPENAI_API_KEY y cuota.'
            );
        }

        $data   = $response->json();
        $rawMsg = $data['choices'][0]['message']['content'] ?? '';

        return $this->assistantContentToString($rawMsg);
    }

    private function fetchJsonFromGemini(string $prompt, string $imageBase64, string $mimeType): string
    {
        $key = $this->geminiKey();
        $model = (string) config('services.gemini.model', 'gemini-2.0-flash');
        $url = sprintf(
            'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent',
            rawurlencode($model)
        );

        $response = Http::withHeaders([
            'x-goog-api-key' => $key,
            'Content-Type'   => 'application/json',
        ])
            ->timeout(90)
            ->post($url, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt],
                            [
                                'inline_data' => [
                                    'mime_type' => $mimeType,
                                    'data'      => $imageBase64,
                                ],
                            ],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json',
                    'temperature'      => 0.2,
                    'maxOutputTokens'    => 1024,
                ],
            ]);

        if (!$response->successful()) {
            $body = $response->json();
            $msg  = is_array($body) ? ($body['error']['message'] ?? $response->body()) : $response->body();
            Log::error('[IaOcrService] Error respuesta Gemini', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new \RuntimeException(
                'Gemini devolvió un error ' . $response->status() . ': ' .
                (is_string($msg) ? $msg : 'revisa GEMINI_API_KEY y el modelo GEMINI_MODEL.')
            );
        }

        $data = $response->json();
        if (!is_array($data)) {
            throw new \RuntimeException('Respuesta Gemini no es JSON.');
        }

        $candidates = $data['candidates'] ?? null;
        if (!is_array($candidates) || $candidates === []) {
            $reason = $data['promptFeedback']['blockReason'] ?? ($data['error']['message'] ?? json_encode($data));
            Log::warning('[IaOcrService] Gemini sin candidatos', ['data' => $data]);
            throw new \RuntimeException('Gemini no devolvió resultado (¿bloqueo de seguridad?). ' . (is_string($reason) ? $reason : ''));
        }

        $parts = $candidates[0]['content']['parts'] ?? [];
        if (!is_array($parts)) {
            throw new \RuntimeException('Formato de respuesta Gemini inesperado.');
        }

        $texts = [];
        foreach ($parts as $part) {
            if (is_array($part) && isset($part['text'])) {
                $texts[] = (string) $part['text'];
            }
        }

        return trim(implode('', $texts));
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private function cleanString(mixed $val): ?string
    {
        if ($val === null || $val === '' || $val === 'null') {
            return null;
        }

        return trim((string) $val) ?: null;
    }

    /** Quita cruces, abreviaturas funerarias y espacios duplicados del nombre. */
    private function cleanNombre(mixed $val): ?string
    {
        $s = $this->cleanString($val);
        if ($s === null) {
            return null;
        }
        $s = preg_replace('/\s+/u', ' ', $s) ?? $s;
        $s = preg_replace('/^\s*[+\x{2020}\x{2021}\x{271D}\x{271E}]+\s*/u', '', $s) ?? $s;
        $s = preg_replace('/\b(D\.?\s*E\.?\s*P\.?|R\.?\s*I\.?\s*P\.?)\b\.?/iu', '', $s) ?? $s;
        $s = trim($s, " \t\n\r\0\x0B,'\"");

        return $s !== '' ? $s : null;
    }

    /**
     * @param  mixed  $content  string | list<array{type?:string,text?:string,...}>
     */
    private function assistantContentToString(mixed $content): string
    {
        if (is_string($content)) {
            return $content;
        }
        if (!is_array($content)) {
            return '';
        }
        $parts = [];
        foreach ($content as $part) {
            if (is_array($part) && isset($part['text'])) {
                $parts[] = (string) $part['text'];
            }
        }

        return trim(implode('', $parts));
    }

    private function stripMarkdownJsonFence(string $text): string
    {
        $t = trim($text);
        if (preg_match('/^```(?:json)?\s*([\s\S]*?)\s*```$/u', $t, $m)) {
            return trim($m[1]);
        }

        return $t;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function aplicarHeuristicas(array $row): array
    {
        if (empty($row['fecha_inhumacion']) && !empty($row['fecha_fallecimiento'])
            && $this->isIsoDate($row['fecha_fallecimiento'])
        ) {
            $row['fecha_inhumacion'] = $row['fecha_fallecimiento'];
        }

        if (empty($row['numero_expediente']) && !empty($row['otros_textos'])) {
            $exp = $this->extraerExpedienteDesdeTexto($row['otros_textos']);
            if ($exp !== null) {
                $row['numero_expediente'] = $exp;
            }
        }

        $c = (float) ($row['confianza'] ?? 0);
        if ($c <= 0 && (!empty($row['nombre_completo']) || !empty($row['fecha_fallecimiento']))) {
            $row['confianza'] = 0.55;
        }

        return $row;
    }

    private function isIsoDate(mixed $s): bool
    {
        return is_string($s) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) === 1;
    }

    private function extraerExpedienteDesdeTexto(string $texto): ?string
    {
        if (preg_match('/\b(?:exp|expediente|ref\.?|n[º°o]\.?)\s*[:\s]?\s*([A-Z0-9][A-Z0-9\-\/]{4,40})\b/iu', $texto, $m)) {
            return trim($m[1]);
        }

        return null;
    }

    private function parseDate(mixed $val): ?string
    {
        $str = $this->cleanString($val);
        if ($str === null) {
            return null;
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $str)) {
            [$y, $m, $d] = array_map('intval', explode('-', $str));
            if (checkdate($m, $d, $y)) {
                return $str;
            }

            return null;
        }

        $iso = $this->parseSpanishLongDate($str);
        if ($iso !== null) {
            return $iso;
        }

        $iso = $this->parseEuropeanNumericDate($str);
        if ($iso !== null) {
            return $iso;
        }

        if (preg_match('/^\d{4}$/', $str)) {
            $y = (int) $str;
            if ($y >= 1700 && $y <= 2100) {
                return sprintf('%04d-01-01', $y);
            }
        }

        try {
            $ts = strtotime($str);
            if ($ts !== false && $ts > 0) {
                $out = date('Y-m-d', $ts);
                $y   = (int) date('Y', $ts);
                if ($y >= 1700 && $y <= 2100) {
                    return $out;
                }
            }
        } catch (\Throwable) {
            // ignore
        }

        return $str;
    }

    private function parseSpanishLongDate(string $str): ?string
    {
        $months = [
            'enero'       => 1,
            'febrero'     => 2,
            'marzo'       => 3,
            'abril'       => 4,
            'mayo'        => 5,
            'junio'       => 6,
            'julio'       => 7,
            'agosto'      => 8,
            'septiembre'  => 9,
            'setiembre'   => 9,
            'octubre'     => 10,
            'noviembre'   => 11,
            'diciembre'   => 12,
        ];

        if (!preg_match('/(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})/iu', $str, $m)) {
            return null;
        }
        $day     = (int) $m[1];
        $monName = mb_strtolower($m[2], 'UTF-8');
        $year    = (int) $m[3];

        foreach ($months as $name => $num) {
            if ($monName === $name || str_starts_with($name, $monName) || str_starts_with($monName, mb_substr($name, 0, 4))) {
                if (checkdate($num, $day, $year)) {
                    return sprintf('%04d-%02d-%02d', $year, $num, $day);
                }

                return null;
            }
        }

        return null;
    }

    /** Interpreta DD/MM/AAAA (España) ante fechas ambiguas. */
    private function parseEuropeanNumericDate(string $str): ?string
    {
        if (!preg_match('/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/', $str, $m)) {
            return null;
        }
        $p1 = (int) $m[1];
        $p2 = (int) $m[2];
        $y  = (int) $m[3];
        if ($y < 100) {
            $y += $y >= 70 ? 1900 : 2000;
        }

        if ($p1 > 12) {
            $day = $p1;
            $month = $p2;
        } elseif ($p2 > 12) {
            $month = $p1;
            $day   = $p2;
        } else {
            $day   = $p1;
            $month = $p2;
        }

        if ($month < 1 || $month > 12 || $day < 1 || $day > 31 || $y < 1700 || $y > 2100) {
            return null;
        }
        if (!checkdate($month, $day, $y)) {
            return null;
        }

        return sprintf('%04d-%02d-%02d', $y, $month, $day);
    }
}
