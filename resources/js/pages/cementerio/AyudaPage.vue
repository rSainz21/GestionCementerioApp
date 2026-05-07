<template>
  <div class="ayuda">

    <div class="ayuda__header">
      <div class="ayuda__header-icon"><i class="pi pi-book" /></div>
      <div>
        <h1 class="ayuda__title">Manual de usuario</h1>
        <p class="ayuda__sub">Sistema de Gestión del Cementerio Municipal de Somahoz</p>
      </div>
    </div>

    <!-- Índice rápido -->
    <nav class="indice">
      <a class="indice__item" href="#inicio">Inicio</a>
      <a class="indice__item" href="#gestion">Gestión</a>
      <a class="indice__item" href="#nuevo-caso">Nuevo caso</a>
      <a class="indice__item" href="#regularizaciones">Regularizaciones</a>
      <a class="indice__item" href="#mapas">Mapas</a>
      <a class="indice__item" href="#consejos">Consejos</a>
    </nav>

    <!-- ── 1. Inicio ──────────────────────────────────────── -->
    <section class="bloque" id="inicio">
      <h2 class="bloque__titulo"><i class="pi pi-home" /> Pantalla de inicio</h2>
      <p class="bloque__intro">
        La pantalla de inicio ofrece una visión rápida del estado del cementerio y accesos directos a las acciones más habituales.
      </p>

      <div class="cards">
        <div class="card">
          <div class="card__head"><i class="pi pi-chart-bar" /> KPIs de ocupación</div>
          <p>En la parte superior se muestran los contadores globales: total de sepulturas, ocupadas, libres y porcentaje de ocupación. El gráfico de dona ofrece una vista visual del estado.</p>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-th-large" /> Accesos rápidos</div>
          <ul class="lista">
            <li><strong>Nuevo caso</strong> — abre directamente el asistente de alta.</li>
            <li><strong>Buscar concesiones</strong> — búsqueda incremental por nombre o DNI del concesionario. Al seleccionar un resultado, se abre el detalle de la sepultura.</li>
            <li><strong>Buscar difunto</strong> — localiza dónde está enterrado un difunto y permite ver su sepultura en el mapa.</li>
          </ul>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-map" /> Mapa GPS</div>
          <p>Mapa del recinto del cementerio con ubicación aproximada. Usa los botones <em>OpenStreetMap</em> y <em>Google Maps</em> para abrir la ubicación en el servicio externo.</p>
          <p class="tip"><i class="pi pi-info-circle" /> Para hacer zoom en el mapa mantén pulsado <kbd>Ctrl</kbd> mientras usas la rueda del ratón.</p>
        </div>
      </div>
    </section>

    <!-- ── 2. Gestión ─────────────────────────────────────── -->
    <section class="bloque" id="gestion">
      <h2 class="bloque__titulo"><i class="pi pi-database" /> Gestión</h2>
      <p class="bloque__intro">
        El módulo de Gestión contiene todas las tablas del sistema organizadas en pestañas. Cada pestaña permite consultar, filtrar y administrar sus registros.
      </p>

      <h3 class="subtitulo">Filtros por columna</h3>
      <p>Debajo de cada cabecera de columna hay un campo de texto. Escribe para filtrar los resultados en tiempo real. Los filtros son acumulables: puedes filtrar por zona <em>y</em> por tipo a la vez.</p>

      <div class="tab-grid">
        <div class="tab-card">
          <div class="tab-card__head">Cementerios</div>
          <p>Registro de recintos funerarios. Normalmente solo hay uno (Somahoz). Desde aquí se definen el nombre y municipio.</p>
        </div>
        <div class="tab-card">
          <div class="tab-card__head">Zonas</div>
          <p>Cada cementerio se divide en zonas (p. ej. «Parte vieja» y «Zona nueva»). Haz clic en el nombre del cementerio de una zona para navegar a la pestaña Cementerios.</p>
        </div>
        <div class="tab-card">
          <div class="tab-card__head">Bloques</div>
          <p>Agrupaciones de sepulturas dentro de una zona. Al crear un bloque se define su cuadrícula (filas × columnas) y el sentido de numeración.</p>
          <ul class="lista">
            <li>Haz clic en el <strong>nombre del bloque</strong> o en el icono <i class="pi pi-th-large" style="font-size:11px"/> para ver la cuadrícula de sepulturas con colores por estado.</li>
            <li>Haz clic en el nombre de la <strong>zona</strong> para ir directamente a la pestaña Zonas.</li>
          </ul>
        </div>
        <div class="tab-card">
          <div class="tab-card__head">Sepulturas</div>
          <p>Inventario de todas las unidades funerarias (nichos, columbarios, fosas, panteones). Cada sepultura pertenece a un bloque y tiene un código único.</p>
          <ul class="lista">
            <li>Botón <strong>Ver</strong> — abre el expediente completo de la sepultura con foto, difuntos, documentos y movimientos.</li>
            <li>Haz clic en <strong>Zona</strong> o <strong>Bloque</strong> para navegar a esa pestaña.</li>
          </ul>
        </div>
        <div class="tab-card">
          <div class="tab-card__head">Concesiones</div>
          <p>Contratos de uso de sepulturas. Pueden ser perpetuas o temporales. El campo de búsqueda global filtra por expediente, concesionario y sepultura.</p>
          <ul class="lista">
            <li>Icono <i class="pi pi-eye" style="font-size:11px"/> — abre el detalle completo: tipo, fechas, importe, concesionarios y difuntos vinculados.</li>
            <li>Botón <strong>Exportar CSV</strong> — descarga los registros visibles.</li>
          </ul>
        </div>
        <div class="tab-card">
          <div class="tab-card__head">Terceros</div>
          <p>Personas o empresas concesionarias. Haz clic en el nombre o en el icono <i class="pi pi-eye" style="font-size:11px"/> para ver su ficha completa: datos de contacto y todas sus concesiones.</p>
        </div>
        <div class="tab-card">
          <div class="tab-card__head">Difuntos</div>
          <p>Registro de difuntos inhumados. Haz clic en el nombre o en el icono <i class="pi pi-eye" style="font-size:11px"/> para ver la ficha completa: fechas, sepultura asignada, concesión y foto.</p>
          <ul class="lista">
            <li>Desde el detalle del difunto, el botón <strong>«Ver sepultura»</strong> abre el expediente completo de su unidad funeraria.</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ── 3. Nuevo caso ──────────────────────────────────── -->
    <section class="bloque" id="nuevo-caso">
      <h2 class="bloque__titulo"><i class="pi pi-plus-circle" /> Nuevo caso</h2>
      <p class="bloque__intro">
        El asistente guiado permite dar de alta un caso completo (titular + difunto + sepultura) en cuatro pasos.
      </p>

      <div class="pasos">
        <div class="paso">
          <div class="paso__num">1</div>
          <div class="paso__body">
            <div class="paso__titulo">Titular (concesionario)</div>
            <p>Busca una persona existente escribiendo su nombre o DNI. Si no existe, rellena los datos para crearla. El titular será el responsable legal de la concesión.</p>
          </div>
        </div>
        <div class="paso">
          <div class="paso__num">2</div>
          <div class="paso__body">
            <div class="paso__titulo">Difunto</div>
            <p>Introduce el nombre completo del difunto, fecha de fallecimiento y fecha de inhumación. Si el titular y el difunto son la misma persona, puedes marcar la casilla correspondiente.</p>
          </div>
        </div>
        <div class="paso">
          <div class="paso__num">3</div>
          <div class="paso__body">
            <div class="paso__titulo">Selección de sepultura</div>
            <p>Elige la zona y el bloque. La cuadrícula muestra en <span style="color:#0F7A4A;font-weight:700">verde</span> las sepulturas libres y en <span style="color:#A61B1B;font-weight:700">rojo</span> las ocupadas. Haz clic en una celda libre para seleccionarla.</p>
          </div>
        </div>
        <div class="paso">
          <div class="paso__num">4</div>
          <div class="paso__body">
            <div class="paso__titulo">Resumen y confirmación</div>
            <p>Revisa los datos del caso. Al pulsar <strong>Confirmar</strong> se crea de forma atómica el titular, la concesión, el difunto y se ocupa la sepultura seleccionada.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 4. Regularizaciones ────────────────────────────── -->
    <section class="bloque" id="regularizaciones">
      <h2 class="bloque__titulo"><i class="pi pi-arrows-alt" /> Regularizaciones</h2>
      <p class="bloque__intro">
        La pantalla de regularizaciones permite asignar masivamente difuntos y concesiones históricas (que no tienen sepultura asignada) a sus sepulturas reales.
      </p>

      <div class="cards">
        <div class="card">
          <div class="card__head"><i class="pi pi-user" /> Panel derecho: lista de pendientes</div>
          <ul class="lista">
            <li>Alterna entre la pestaña <strong>DIFUNTOS</strong> y <strong>CONCESIONES</strong> para ver los registros sin asignar.</li>
            <li>Usa el buscador para filtrar por nombre.</li>
            <li>Botón <strong>«+»</strong> junto a las pestañas: crea un nuevo difunto o concesión directamente desde aquí sin salir del módulo. El nuevo registro aparece al instante en la lista listo para arrastrar.</li>
          </ul>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-th-large" /> Cuadrícula de nichos</div>
          <p>En el panel izquierdo, elige la zona y el bloque para ver la cuadrícula. Arrastra un registro del panel derecho sobre una sepultura libre (verde) para vincularlo.</p>
          <p class="tip"><i class="pi pi-info-circle" /> Al soltar el elemento sobre un nicho, el sistema asigna automáticamente la sepultura y actualiza el mapa.</p>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-map" /> Mapa interactivo</div>
          <p>La sección inferior muestra el mapa geográfico con puntos de colores por tipo de unidad. Haz clic en cualquier punto para abrir el detalle de esa sepultura.</p>
          <p class="tip"><i class="pi pi-info-circle" /> Para hacer zoom en el mapa mantén <kbd>Ctrl</kbd> + rueda del ratón.</p>
        </div>
      </div>
    </section>

    <!-- ── 5. Mapas ───────────────────────────────────────── -->
    <section class="bloque" id="mapas">
      <h2 class="bloque__titulo"><i class="pi pi-map-marker" /> Mapas</h2>
      <p class="bloque__intro">La aplicación usa dos tipos de mapa:</p>
      <div class="cards">
        <div class="card">
          <div class="card__head">Mapa de cuadrícula (nichos)</div>
          <p>Representación esquemática de los bloques. Cada celda es una sepultura:</p>
          <div class="leyenda">
            <span class="leyenda__item"><span class="dot" style="background:#0F7A4A"/><strong>Verde</strong> — libre</span>
            <span class="leyenda__item"><span class="dot" style="background:#A61B1B"/><strong>Rojo</strong> — ocupada</span>
            <span class="leyenda__item"><span class="dot" style="background:#C9A227"/><strong>Ámbar</strong> — reservada</span>
            <span class="leyenda__item"><span class="dot" style="background:#9a9a9a"/><strong>Gris</strong> — clausurada</span>
          </div>
        </div>
        <div class="card">
          <div class="card__head">Mapa GPS (OpenStreetMap)</div>
          <p>Mapa cartográfico real con la ubicación geográfica del cementerio. Disponible en Inicio y en Regularizaciones.</p>
          <p class="tip"><i class="pi pi-info-circle" /> El scroll normal de la página no mueve el mapa. Para hacer zoom: <kbd>Ctrl</kbd> + rueda del ratón. Al soltar <kbd>Ctrl</kbd>, el mapa vuelve a bloquearse.</p>
        </div>
      </div>
    </section>

    <!-- ── 6. Consejos ────────────────────────────────────── -->
    <section class="bloque" id="consejos">
      <h2 class="bloque__titulo"><i class="pi pi-lightbulb" /> Consejos de uso</h2>
      <div class="consejos-grid">
        <div class="consejo">
          <i class="pi pi-filter consejo__icon" />
          <div>
            <strong>Filtros acumulables</strong>
            <p>En Gestión puedes combinar varios filtros de columna a la vez. Para limpiar un filtro borra el texto del campo correspondiente.</p>
          </div>
        </div>
        <div class="consejo">
          <i class="pi pi-arrows-h consejo__icon" />
          <div>
            <strong>Navegación cruzada</strong>
            <p>En las tablas de Bloques, Sepulturas y Concesiones, los nombres de zona y bloque son enlaces. Al hacer clic navegas directamente a esa pestaña en Gestión.</p>
          </div>
        </div>
        <div class="consejo">
          <i class="pi pi-download consejo__icon" />
          <div>
            <strong>Exportar datos</strong>
            <p>Las pestañas de Sepulturas, Concesiones, Difuntos y Terceros tienen botón <em>Exportar CSV</em>. El fichero descargado solo contiene los registros visibles tras aplicar los filtros activos.</p>
          </div>
        </div>
        <div class="consejo">
          <i class="pi pi-eye consejo__icon" />
          <div>
            <strong>Detalle rápido</strong>
            <p>En todas las tablas, el icono <i class="pi pi-eye" style="font-size:11px"/> o hacer clic en el nombre abre el detalle completo del registro sin abandonar la pantalla.</p>
          </div>
        </div>
        <div class="consejo">
          <i class="pi pi-th-large consejo__icon" />
          <div>
            <strong>Vista de cuadrícula de bloques</strong>
            <p>En la pestaña Bloques, haz clic en el nombre del bloque para ver su cuadrícula con todos los nichos y su estado. Clic en cualquier celda abre el expediente de esa sepultura.</p>
          </div>
        </div>
        <div class="consejo">
          <i class="pi pi-search consejo__icon" />
          <div>
            <strong>Búsqueda global en Inicio</strong>
            <p>Los recuadros de búsqueda del Inicio permiten localizar concesiones y difuntos desde cualquier punto de la aplicación sin ir a Gestión.</p>
          </div>
        </div>
      </div>
    </section>

    <div class="footer-manual">
      Sistema de Gestión del Cementerio Municipal · Ayuntamiento de Los Corrales de Buelna
    </div>
  </div>
</template>

<script setup>
// Sin lógica — página estática de documentación
</script>

<style scoped>
.ayuda {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  gap: 28px;
}

/* ── Header ───────────────────────────────────────────────── */
.ayuda__header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px 24px;
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(23,35,31,.09);
  box-shadow: 0 4px 14px rgba(23,35,31,.06);
}
.ayuda__header-icon {
  width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(17,134,82,.15), rgba(17,134,82,.06));
  border: 1px solid rgba(17,134,82,.25);
  display: grid; place-items: center;
  color: var(--c2-primary,#118652); font-size: 22px;
}
.ayuda__title { font-size: 20px; font-weight: 900; margin: 0 0 3px; color: rgba(23,35,31,.92); }
.ayuda__sub   { font-size: 13px; color: rgba(23,35,31,.60); margin: 0; }

/* ── Índice ───────────────────────────────────────────────── */
.indice {
  display: flex; gap: 6px; flex-wrap: wrap;
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(23,35,31,.09);
}
.indice__item {
  padding: 5px 12px; border-radius: 8px; font-size: 13px; font-weight: 600;
  color: var(--c2-tertiary,#1266A3); text-decoration: none;
  background: rgba(18,102,163,.06); border: 1px solid rgba(18,102,163,.12);
  transition: background .12s;
}
.indice__item:hover { background: rgba(18,102,163,.12); }

/* ── Bloque ───────────────────────────────────────────────── */
.bloque {
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(23,35,31,.09);
  box-shadow: 0 4px 14px rgba(23,35,31,.04);
  padding: 22px 24px;
  display: grid;
  gap: 16px;
  scroll-margin-top: 20px;
}
.bloque__titulo {
  font-size: 16px; font-weight: 900; margin: 0;
  color: rgba(23,35,31,.92); display: flex; align-items: center; gap: 8px;
}
.bloque__titulo .pi { color: var(--c2-primary,#118652); }
.bloque__intro { font-size: 14px; color: rgba(23,35,31,.72); margin: 0; line-height: 1.6; }

.subtitulo { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--c2-primary,#118652); margin: 0; }

/* ── Cards ────────────────────────────────────────────────── */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.card {
  padding: 14px 16px; border-radius: 12px;
  border: 1px solid rgba(23,35,31,.09);
  background: rgba(245,247,244,.6);
  display: grid; gap: 8px;
}
.card__head { font-size: 13px; font-weight: 800; color: rgba(23,35,31,.88); display: flex; align-items: center; gap: 6px; }
.card p { font-size: 13px; color: rgba(23,35,31,.72); margin: 0; line-height: 1.55; }

/* ── Tip ──────────────────────────────────────────────────── */
.tip {
  background: rgba(18,102,163,.06); border: 1px solid rgba(18,102,163,.15);
  border-radius: 8px; padding: 8px 10px !important;
  color: rgba(23,35,31,.78) !important; font-size: 12px !important;
  display: flex; align-items: flex-start; gap: 6px;
}
.tip .pi { color: var(--c2-tertiary,#1266A3); flex-shrink: 0; margin-top: 1px; }
kbd {
  background: rgba(23,35,31,.1); border-radius: 4px;
  padding: 1px 5px; font-family: inherit; font-size: 11px;
  border: 1px solid rgba(23,35,31,.2);
}

/* ── Lista ────────────────────────────────────────────────── */
.lista { margin: 0; padding-left: 16px; display: grid; gap: 4px; }
.lista li { font-size: 13px; color: rgba(23,35,31,.72); line-height: 1.5; }

/* ── Tab grid ─────────────────────────────────────────────── */
.tab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.tab-card {
  padding: 12px 14px; border-radius: 12px;
  border: 1px solid rgba(23,35,31,.09);
  background: rgba(245,247,244,.5);
  display: grid; gap: 6px;
}
.tab-card__head { font-size: 13px; font-weight: 800; color: var(--c2-primary,#118652); padding-bottom: 4px; border-bottom: 1px solid rgba(17,134,82,.15); }
.tab-card p  { font-size: 12px; color: rgba(23,35,31,.70); margin: 0; line-height: 1.5; }
.tab-card ul { margin: 2px 0 0; padding-left: 14px; display: grid; gap: 3px; }
.tab-card li { font-size: 12px; color: rgba(23,35,31,.70); line-height: 1.5; }

/* ── Pasos ────────────────────────────────────────────────── */
.pasos { display: grid; gap: 10px; }
.paso {
  display: grid; grid-template-columns: 36px 1fr; gap: 12px; align-items: start;
  padding: 12px 14px; border-radius: 12px;
  border: 1px solid rgba(23,35,31,.09); background: rgba(245,247,244,.5);
}
.paso__num {
  width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(17,134,82,.18), rgba(17,134,82,.08));
  border: 1px solid rgba(17,134,82,.3);
  color: var(--c2-primary,#118652); font-weight: 900; font-size: 14px;
  display: grid; place-items: center;
}
.paso__titulo { font-size: 13px; font-weight: 800; margin-bottom: 4px; color: rgba(23,35,31,.88); }
.paso__body p { font-size: 13px; color: rgba(23,35,31,.70); margin: 0; line-height: 1.55; }

/* ── Leyenda mapa ─────────────────────────────────────────── */
.leyenda { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 6px; }
.leyenda__item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(23,35,31,.75); }
.dot { width: 12px; height: 12px; border-radius: 999px; flex-shrink: 0; }

/* ── Consejos ─────────────────────────────────────────────── */
.consejos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
.consejo {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 12px 14px; border-radius: 12px;
  border: 1px solid rgba(23,35,31,.09); background: rgba(245,247,244,.5);
}
.consejo__icon { color: var(--c2-primary,#118652); font-size: 16px; flex-shrink: 0; margin-top: 2px; }
.consejo strong { font-size: 13px; font-weight: 800; color: rgba(23,35,31,.88); display: block; margin-bottom: 4px; }
.consejo p { font-size: 12px; color: rgba(23,35,31,.68); margin: 0; line-height: 1.5; }

/* ── Footer ───────────────────────────────────────────────── */
.footer-manual {
  text-align: center; font-size: 12px; color: rgba(23,35,31,.45);
  padding: 10px 0 4px;
}
</style>
