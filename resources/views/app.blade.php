<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name') }}</title>

    @vite('resources/js/app.js')
</head>
<body style="margin:0; background: var(--c2-bg, #F5F7F4);">
    <div id="app"></div>
</body>
</html>

