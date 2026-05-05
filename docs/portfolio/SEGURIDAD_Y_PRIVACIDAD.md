# Seguridad y privacidad (checklist para publicar)

## No publicar

- `.env` reales, tokens, claves, IPs internas, URLs de infraestructura municipal.
- Usuarios/contraseñas reales.
- Dumps de base de datos o datos personales (DNI, nombres, etc.).
- Logs con trazas que incluyan URLs privadas.

## Lo que este repo ya hace

- Usa `.env.example` para configuración.
- Mantiene configuraciones sensibles como placeholders.

## Recomendación antes de abrirlo público

- Sustituir credenciales “de dev” por ejemplos genéricos si no procede mostrarlos.
- Si hay pantallazos, pixelar DNI/nombres.
- Asegurar que `storage/` y ficheros subidos no se commitean.

