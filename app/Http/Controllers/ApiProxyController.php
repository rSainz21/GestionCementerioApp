<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

class ApiProxyController extends Controller
{
    public function __invoke(Request $request, string $path = '')
    {
        $enabled = filter_var(env('USE_REMOTE_API_PROXY', false), FILTER_VALIDATE_BOOL);
        if (!$enabled) {
            return response()->json([
                'message' => 'Remote API proxy disabled.',
            ], 404);
        }

        $base = rtrim((string) env('REMOTE_API_BASE', ''), '/');
        if ($base === '') {
            return response()->json([
                'message' => 'REMOTE_API_BASE is not configured.',
            ], 500);
        }

        $url = $base . '/api/' . ltrim($path, '/');

        $method = strtoupper($request->method());
        $query = $request->query();

        $headers = [];
        foreach (['authorization', 'accept', 'content-type'] as $h) {
            $v = $request->header($h);
            if ($v !== null) {
                $headers[$h] = $v;
            }
        }

        $client = Http::withoutVerifying()
            ->withOptions(['http_errors' => false])
            ->withHeaders($headers);

        // Use multipart forwarding when there are files; otherwise send JSON/body.
        if ($request->files->count() > 0) {
            $multipart = [];
            foreach ($request->all() as $key => $value) {
                if (is_array($value)) {
                    foreach ($value as $v) {
                        $multipart[] = ['name' => $key . '[]', 'contents' => (string) $v];
                    }
                } else {
                    $multipart[] = ['name' => $key, 'contents' => (string) $value];
                }
            }
            foreach ($request->files->all() as $key => $file) {
                if (is_array($file)) {
                    foreach ($file as $f) {
                        $multipart[] = [
                            'name' => $key . '[]',
                            'contents' => fopen($f->getRealPath(), 'r'),
                            'filename' => $f->getClientOriginalName(),
                        ];
                    }
                } else {
                    $multipart[] = [
                        'name' => $key,
                        'contents' => fopen($file->getRealPath(), 'r'),
                        'filename' => $file->getClientOriginalName(),
                    ];
                }
            }

            $resp = $client->send($method, $url, [
                'query' => $query,
                'multipart' => $multipart,
            ]);
        } else {
            $body = $request->getContent();
            $resp = $client->send($method, $url, [
                'query' => $query,
                // Forward raw body to support JSON and urlencoded.
                'body' => $body,
            ]);
        }

        $status = $resp->status();
        $out = response($resp->body(), $status);

        // Copy relevant headers back (avoid hop-by-hop).
        foreach ($resp->headers() as $name => $values) {
            $lname = strtolower($name);
            if (in_array($lname, ['transfer-encoding', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'upgrade'], true)) {
                continue;
            }
            if ($lname === 'set-cookie') {
                continue; // We use bearer tokens, no cookies.
            }
            foreach ($values as $v) {
                $out->headers->set($name, $v, false);
            }
        }

        if (!$out->headers->has('content-type') && $resp->header('content-type')) {
            $out->headers->set('content-type', $resp->header('content-type'));
        }

        return $out;
    }
}

