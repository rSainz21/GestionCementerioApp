import type { Concesion, Difunto, Sepultura } from './types';
import { etiquetaEstadoVisible } from './estado-sepultura';

interface ExpedienteData {
  sepultura: Sepultura & { cemn_bloques?: { codigo: string }; cemn_zonas?: { nombre: string } };
  difuntos: (Difunto & { cemn_terceros?: { dni: string | null; nombre: string; apellido1: string | null; apellido2: string | null } })[];
  concesiones: Concesion[];
  documentos?: { tipo: string; ruta_archivo?: string; url?: string; descripcion: string | null; created_at?: string; creado_en?: string }[];
}

export function generarHTMLExpediente(data: ExpedienteData): string {
  const { sepultura, difuntos, concesiones, documentos } = data;
  const estadoNorm = etiquetaEstadoVisible(String(sepultura.estado ?? ''));
  const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const fotos = (documentos ?? []).filter((d) => (d.tipo ?? '').toLowerCase() === 'fotografia');

  const difuntosHTML = difuntos.length > 0
    ? difuntos.map((d) => `
      <tr>
        <td>${d.nombre_completo}</td>
        <td>${d.fecha_fallecimiento ?? '—'}</td>
        <td>${d.es_titular ? 'Sí' : 'No'}</td>
        <td>${d.cemn_terceros?.dni ?? '—'}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;color:#999">Sin difuntos registrados</td></tr>';

  const concesionesHTML = concesiones.length > 0
    ? concesiones.map((c) => `
      <tr>
        <td>${c.numero_expediente ?? '—'}</td>
        <td style="text-transform:capitalize">${c.tipo}</td>
        <td><span class="badge badge-${c.estado}">${c.estado}</span></td>
      </tr>`).join('')
    : '<tr><td colspan="3" style="text-align:center;color:#999">Sin concesiones</td></tr>';

  const fotosHTML = fotos.length > 0
    ? `<div class="fotos-grid">
        ${fotos.slice(0, 12).map((f) => `
          <div class="foto">
            <img src="${(f as any).ruta_archivo ?? (f as any).url ?? ''}" alt="Evidencia" />
            <div class="foto-cap">${f.descripcion ?? ''}</div>
            <div class="foto-date">${new Date((f as any).created_at ?? (f as any).creado_en ?? '').toLocaleDateString('es-ES')}</div>
          </div>`).join('')}
      </div>`
    : '<div style="color:#999">Sin evidencias fotográficas</div>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1F2937; padding: 32px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #15803D; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 22px; color: #15803D; }
    .header .subtitle { font-size: 13px; color: #6B7280; margin-top: 4px; }
    .header .fecha { font-size: 11px; color: #9CA3AF; text-align: right; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 15px; color: #15803D; border-bottom: 1px solid #E5E7EB; padding-bottom: 6px; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .info-item { background: #F8FAFC; border-radius: 8px; padding: 10px; }
    .info-item .label { font-size: 10px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-item .value { font-size: 16px; font-weight: 700; color: #15803D; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #F1F5F9; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6B7280; letter-spacing: 0.3px; }
    td { padding: 8px 10px; border-bottom: 1px solid #F1F5F9; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block; }
    .badge-vigente { background: #DCFCE7; color: #16A34A; }
    .badge-caducada { background: #FEF3C7; color: #D97706; }
    .badge-renovada { background: #DCFCE7; color: #15803D; }
    .badge-transferida { background: #F3E8FF; color: #7C3AED; }
    .badge-anulada { background: #FEE2E2; color: #DC2626; }
    .estado { display: inline-block; padding: 4px 14px; border-radius: 6px; font-weight: 700; font-size: 13px; color: white; text-transform: uppercase; }
    .estado-libre { background: #22C55E; }
    .estado-ocupada { background: #EF4444; }
    .notas { background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 0 8px 8px 0; font-style: italic; color: #6B7280; }
    .fotos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .foto { border: 1px solid #E5E7EB; border-radius: 10px; overflow: hidden; background: #FFF; }
    .foto img { width: 100%; height: 140px; object-fit: cover; display: block; }
    .foto-cap { padding: 8px 10px 0; font-size: 11px; color: #374151; font-weight: 600; min-height: 18px; }
    .foto-date { padding: 0 10px 10px; font-size: 10px; color: #9CA3AF; }
    .footer { margin-top: 40px; border-top: 1px solid #E5E7EB; padding-top: 12px; font-size: 10px; color: #9CA3AF; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Expediente de Sepultura N.º ${sepultura.numero ?? sepultura.id}</h1>
      <div class="subtitle">Cementerio Municipal de Somahoz — Ayto. Los Corrales de Buelna</div>
    </div>
    <div class="fecha">${fecha}<br>Código: ${sepultura.codigo ?? '—'}</div>
  </div>

  <div class="section">
    <h2>Ubicación Física</h2>
    <div class="info-grid">
      <div class="info-item"><div class="label">Zona</div><div class="value">${sepultura.cemn_zonas?.nombre ?? '—'}</div></div>
      <div class="info-item"><div class="label">Bloque</div><div class="value">${sepultura.cemn_bloques?.codigo ?? '—'}</div></div>
      <div class="info-item"><div class="label">Fila (altura)</div><div class="value">F${sepultura.fila ?? '—'}</div></div>
      <div class="info-item"><div class="label">Columna</div><div class="value">C${sepultura.columna ?? '—'}</div></div>
    </div>
    <p>Estado actual: <span class="estado estado-${estadoNorm}">${estadoNorm}</span></p>
  </div>

  <div class="section">
    <h2>Difuntos (${difuntos.length})</h2>
    <table>
      <thead><tr><th>Nombre completo</th><th>Fecha fallecimiento</th><th>Titular</th><th>DNI</th></tr></thead>
      <tbody>${difuntosHTML}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Concesiones (${concesiones.length})</h2>
    <table>
      <thead><tr><th>N.º Expediente</th><th>Tipo</th><th>Estado</th></tr></thead>
      <tbody>${concesionesHTML}</tbody>
    </table>
  </div>

  ${sepultura.notas ? `<div class="section"><h2>Observaciones de campo</h2><div class="notas">${sepultura.notas}</div></div>` : ''}

  <div class="section">
    <h2>Evidencias fotográficas (${fotos.length})</h2>
    ${fotosHTML}
  </div>

  <div class="footer">
    Documento generado automáticamente por el Sistema de Gestión del Cementerio Municipal · ${fecha}
  </div>
</body>
</html>`;
}
