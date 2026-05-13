<template>
  <div class="ayuda">

    <div class="ayuda__header">
      <div class="ayuda__header-icon"><i class="pi pi-book" /></div>
      <div>
        <h1 class="ayuda__title">Manual de usuario</h1>
        <p class="ayuda__sub">Sistema de Gestión de Cementerios Municipales · Ayuntamiento de Los Corrales de Buelna</p>
      </div>
    </div>

    <!-- Índice rápido -->
    <nav class="indice">
      <a class="indice__item" href="#inicio">Inicio</a>
      <a class="indice__item" href="#buscador">Buscador</a>
      <a class="indice__item" href="#gestion">Gestión</a>
      <a class="indice__item" href="#sepultura">Expediente</a>
      <a class="indice__item" href="#exhumacion">Exhumación</a>
      <a class="indice__item" href="#nuevo-caso">Nuevo caso</a>
      <a class="indice__item" href="#regularizaciones">Regularizaciones</a>
      <a class="indice__item" href="#alertas">Alertas</a>
      <a class="indice__item" href="#mapas">Mapas</a>
      <a class="indice__item" href="#configuracion">Configuración</a>
      <a class="indice__item" href="#papelera">Papelera</a>
      <a class="indice__item" href="#usuarios">Usuarios</a>
      <a class="indice__item" href="#consejos">Consejos</a>
    </nav>

    <!-- ── 1. Inicio ──────────────────────────────────────────── -->
    <section class="bloque" id="inicio">
      <h2 class="bloque__titulo"><i class="pi pi-home" /> Pantalla de inicio</h2>
      <p class="bloque__intro">
        La pantalla de inicio ofrece una visión rápida del estado del cementerio activo y acceso directo a las acciones más habituales.
      </p>

      <div class="cards">
        <div class="card">
          <div class="card__head"><i class="pi pi-building" /> Selector de cementerio</div>
          <p>Si el sistema gestiona más de un cementerio, aparece un desplegable en la barra superior con el nombre del recinto activo. Cámbialo en cualquier momento y todos los datos (KPIs, mapa, tablas) se actualizarán automáticamente mostrando solo los datos de ese cementerio.</p>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-chart-bar" /> KPIs de ocupación</div>
          <p>Indicadores en tiempo real: total de sepulturas, ocupadas, libres y porcentaje de ocupación. El gráfico de dona ofrece una vista visual del reparto. Los datos corresponden siempre al cementerio seleccionado en la barra superior.</p>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-th-large" /> Accesos rápidos</div>
          <ul class="lista">
            <li><strong>Nuevo caso</strong> — abre el asistente de alta en cuatro pasos.</li>
            <li><strong>Buscar concesiones</strong> — búsqueda incremental por nombre o DNI del titular. Al seleccionar un resultado se abre el expediente de la sepultura.</li>
            <li><strong>Buscar difunto</strong> — localiza dónde está enterrado un difunto.</li>
          </ul>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-map" /> Mapa GPS</div>
          <p>Mapa cartográfico real (OpenStreetMap) con las zonas, bloques y sepulturas del cementerio representadas como polígonos y puntos. Haz clic en cualquier elemento para abrir su detalle.</p>
          <p class="tip"><i class="pi pi-info-circle" /> Para hacer zoom mantén <kbd>Ctrl</kbd> mientras usas la rueda del ratón.</p>
        </div>
      </div>
    </section>

    <!-- ── 2. Buscador global ────────────────────────────────── -->
    <section class="bloque" id="buscador">
      <h2 class="bloque__titulo"><i class="pi pi-search" /> Buscador global</h2>
      <p class="bloque__intro">
        El buscador está siempre visible en la barra superior. Escribe al menos 2 letras y los resultados aparecen al instante en un desplegable justo debajo del campo.
      </p>

      <div class="cards">
        <div class="card">
          <div class="card__head"><i class="pi pi-bolt" /> Cómo usarlo</div>
          <ul class="lista">
            <li>Haz clic en el campo de búsqueda o pulsa la tecla <kbd>/</kbd> desde cualquier pantalla para enfocarlo.</li>
            <li>Escribe 2 o más caracteres — la búsqueda se lanza automáticamente en 250 ms.</li>
            <li>Los resultados se agrupan por tipo: <strong>Sepulturas</strong>, <strong>Difuntos</strong>, <strong>Concesiones</strong> y <strong>Titulares</strong>.</li>
            <li>Haz clic en un resultado para ir directamente a él. Si tiene sepultura asignada, se abre el expediente de esa sepultura.</li>
            <li>Pulsa <kbd>×</kbd> para limpiar el campo, o <kbd>ESC</kbd> para cerrar el desplegable.</li>
          </ul>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-keyboard" /> Atajos de teclado</div>
          <div class="leyenda" style="flex-direction:column;gap:8px;margin-top:0">
            <span class="leyenda__item"><kbd>/</kbd> Abrir y enfocar el buscador</span>
            <span class="leyenda__item"><kbd>↑</kbd> <kbd>↓</kbd> Navegar entre resultados</span>
            <span class="leyenda__item"><kbd>Enter</kbd> Ir al resultado seleccionado</span>
            <span class="leyenda__item"><kbd>ESC</kbd> Cerrar el desplegable</span>
          </div>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-list" /> Qué busca</div>
          <ul class="lista">
            <li><strong>Sepulturas</strong> — por código (p. ej. «ZV-B3-N12»).</li>
            <li><strong>Difuntos</strong> — por nombre completo.</li>
            <li><strong>Concesiones</strong> — por número de expediente o nombre del titular.</li>
            <li><strong>Titulares</strong> — por nombre, apellidos, DNI o CIF.</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ── 3. Gestión ─────────────────────────────────────────── -->
    <section class="bloque" id="gestion">
      <h2 class="bloque__titulo"><i class="pi pi-database" /> Gestión</h2>
      <p class="bloque__intro">
        El módulo de Gestión contiene todas las tablas del sistema organizadas en pestañas. Cada pestaña permite consultar, filtrar, exportar y administrar sus registros. Los datos mostrados corresponden siempre al cementerio seleccionado.
      </p>

      <h3 class="subtitulo">Filtros por columna</h3>
      <p style="font-size:13px;color:rgba(23,35,31,.70);margin:0;line-height:1.55">Debajo de cada cabecera de columna hay un campo de texto. Escribe para filtrar los resultados en tiempo real. Los filtros son acumulables: puedes filtrar por zona <em>y</em> por tipo a la vez. Para limpiar un filtro borra el texto del campo.</p>

      <div class="tab-grid">
        <div class="tab-card">
          <div class="tab-card__head">Cementerios</div>
          <p>Registro de recintos. Desde aquí se definen nombre, municipio y coordenadas de cada cementerio.</p>
        </div>
        <div class="tab-card">
          <div class="tab-card__head">Zonas</div>
          <p>Cada cementerio se divide en zonas. Haz clic en el nombre de una zona para abrir su ficha detalle con estadísticas de ocupación y mini-mapa de polígono.</p>
        </div>
        <div class="tab-card">
          <div class="tab-card__head">Bloques</div>
          <p>Agrupaciones de sepulturas dentro de una zona. Al crear un bloque se define su cuadrícula (filas × columnas) y el sentido de numeración.</p>
          <ul class="lista">
            <li>Clic en el <strong>nombre del bloque</strong> → cuadrícula de sepulturas con colores por estado.</li>
            <li>Clic en el nombre de la <strong>zona</strong> → navega a Zonas.</li>
          </ul>
        </div>
        <div class="tab-card">
          <div class="tab-card__head">Sepulturas</div>
          <p>Inventario de todas las unidades funerarias (nichos, columbarios, fosas, panteones). Cada sepultura tiene un código único.</p>
          <ul class="lista">
            <li>Botón <strong>Ver</strong> → expediente completo: fotos, difuntos, concesión, documentos y movimientos.</li>
            <li>El estado (libre/ocupada) se actualiza en tiempo real al hacer cambios.</li>
          </ul>
        </div>
        <div class="tab-card">
          <div class="tab-card__head">Concesiones</div>
          <p>Contratos de uso. El icono <i class="pi pi-eye" style="font-size:11px"/> abre el detalle completo: tipo, fechas, importe, titulares y difuntos. Incluye botón <strong>Renovar</strong> y línea de tiempo del historial de renovaciones.</p>
        </div>
        <div class="tab-card">
          <div class="tab-card__head">Titulares</div>
          <p>Personas o empresas concesionarias. Clic en el nombre o en <i class="pi pi-eye" style="font-size:11px"/> para ver su ficha: datos de contacto y todas sus concesiones.</p>
        </div>
        <div class="tab-card">
          <div class="tab-card__head">Difuntos</div>
          <p>Registro de difuntos inhumados. Clic en el nombre o en <i class="pi pi-eye" style="font-size:11px"/> para ver la ficha: fechas, estado de inhumación, sepultura asignada y foto.</p>
          <ul class="lista">
            <li>La columna <strong>Rol</strong> indica si es el difunto principal del nicho o un familiar adicional.</li>
            <li>Botón <strong>«Ver sepultura»</strong> en el detalle → abre el expediente de su unidad funeraria.</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ── 4. Expediente de sepultura ────────────────────────── -->
    <section class="bloque" id="sepultura">
      <h2 class="bloque__titulo"><i class="pi pi-folder-open" /> Expediente de sepultura</h2>
      <p class="bloque__intro">
        El expediente es la ficha digital completa de cada unidad funeraria. Se abre al hacer clic en cualquier celda de la cuadrícula de un bloque, desde la tabla de Sepulturas o desde los resultados del buscador.
      </p>

      <div class="cards">
        <div class="card">
          <div class="card__head"><i class="pi pi-user" /> Difuntos inhumados</div>
          <p>Muestra el difunto principal activo (estado «inhumado») y los restos anteriores que permanecen en el nicho. Cada entrada indica nombre, fechas y parentesco.</p>
          <p>Botón <strong>Exhumar</strong> junto al difunto activo → inicia el proceso de exhumación.</p>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-file" /> Concesión vigente</div>
          <p>Muestra la concesión activa: expediente, tipo, fechas, importe y titulares. Botón <strong>Renovar</strong> para extender la vigencia. El historial de renovaciones aparece como línea de tiempo debajo.</p>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-image" /> Fotos y documentos</div>
          <p>Desde el expediente puedes subir fotos de la sepultura y documentos adjuntos. Los archivos se almacenan vinculados a esa sepultura.</p>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-history" /> Historial de movimientos</div>
          <p>Línea de tiempo con todos los eventos del nicho: inhumaciones, traslados y exhumaciones. Cada registro muestra el nombre del difunto, tipo de movimiento con código de color y fecha.</p>
          <div class="leyenda" style="margin-top:6px">
            <span class="leyenda__item"><span class="dot" style="background:#0F7A4A"/>Inhumación</span>
            <span class="leyenda__item"><span class="dot" style="background:#1266A3"/>Traslado</span>
            <span class="leyenda__item"><span class="dot" style="background:#C44536"/>Exhumación</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 5. Flujo de exhumación ────────────────────────────── -->
    <section class="bloque" id="exhumacion">
      <h2 class="bloque__titulo"><i class="pi pi-arrow-up-right" /> Flujo de exhumación y restos</h2>
      <p class="bloque__intro">
        El sistema gestiona tres estados para los difuntos inhumados. Entender estos estados es clave para operar correctamente.
      </p>

      <div class="tab-grid">
        <div class="tab-card">
          <div class="tab-card__head" style="color:#0F7A4A">Inhumado</div>
          <p>Difunto actualmente enterrado en el nicho. Solo puede haber <strong>uno por nicho</strong> en estado «inhumado» (el difunto principal activo). El nicho aparece en rojo en la cuadrícula.</p>
        </div>
        <div class="tab-card">
          <div class="tab-card__head" style="color:#C9A227">Restos</div>
          <p>La persona sigue vinculada al nicho pero ya no es el inhumado activo (sus restos permanecen físicamente). El nicho queda <strong>libre</strong> para una nueva inhumación. Los restos son visibles en el expediente bajo la sección «Restos en el nicho».</p>
        </div>
        <div class="tab-card">
          <div class="tab-card__head" style="color:#6b7a77">Exhumado</div>
          <p>La persona ha salido completamente del cementerio. Se desvincula de la sepultura (<code>sepultura_id = null</code>). El nicho queda libre.</p>
        </div>
      </div>

      <h3 class="subtitulo" style="margin-top:4px">Proceso paso a paso</h3>
      <div class="pasos">
        <div class="paso">
          <div class="paso__num">1</div>
          <div class="paso__body">
            <div class="paso__titulo">Abrir el expediente de la sepultura</div>
            <p>Desde la cuadrícula de bloques, haz clic en el nicho que quieres exhumar.</p>
          </div>
        </div>
        <div class="paso">
          <div class="paso__num">2</div>
          <div class="paso__body">
            <div class="paso__titulo">Pulsar «Exhumar»</div>
            <p>En la sección de difuntos inhumados, usa el botón <strong>Exhumar</strong> junto al difunto activo. Se abrirá un modal de confirmación.</p>
          </div>
        </div>
        <div class="paso">
          <div class="paso__num">3</div>
          <div class="paso__body">
            <div class="paso__titulo">Confirmar (con documento opcional)</div>
            <p>El modal muestra qué ocurrirá: la persona pasará a «restos» y el nicho quedará libre. Puedes adjuntar el documento de sanidad (opcional). Confirma para ejecutar la acción.</p>
          </div>
        </div>
        <div class="paso">
          <div class="paso__num">4</div>
          <div class="paso__body">
            <div class="paso__titulo">Resultado inmediato</div>
            <p>El expediente se recarga al instante. La celda del nicho cambia de rojo a verde en la cuadrícula sin necesidad de recargar la página. El evento queda registrado en el historial.</p>
          </div>
        </div>
      </div>

      <div class="tip" style="margin-top:4px">
        <i class="pi pi-info-circle" />
        <span>Al enterrar a una nueva persona en un nicho ya ocupado, el difunto anterior pasa automáticamente a estado «restos». No es necesario exhumar manualmente antes.</span>
      </div>
    </section>

    <!-- ── 6. Nuevo caso ──────────────────────────────────────── -->
    <section class="bloque" id="nuevo-caso">
      <h2 class="bloque__titulo"><i class="pi pi-plus-circle" /> Nuevo caso</h2>
      <p class="bloque__intro">
        El asistente guiado permite registrar un caso completo (titular + difunto + sepultura) en cuatro pasos. Accede desde el menú lateral o desde el botón de acceso rápido en Inicio.
      </p>

      <div class="pasos">
        <div class="paso">
          <div class="paso__num">1</div>
          <div class="paso__body">
            <div class="paso__titulo">Titular (concesionario)</div>
            <p>Busca una persona existente por nombre o DNI. Si no existe, rellena los datos para crearla. El titular es el responsable legal de la concesión.</p>
          </div>
        </div>
        <div class="paso">
          <div class="paso__num">2</div>
          <div class="paso__body">
            <div class="paso__titulo">Difunto</div>
            <p>Introduce nombre completo, fecha de fallecimiento y fecha de inhumación. Si el titular y el difunto son la misma persona, puedes marcarlo para reutilizar los datos.</p>
          </div>
        </div>
        <div class="paso">
          <div class="paso__num">3</div>
          <div class="paso__body">
            <div class="paso__titulo">Selección de sepultura</div>
            <p>Elige cementerio, zona y bloque. La cuadrícula muestra en <span style="color:#0F7A4A;font-weight:700">verde</span> las sepulturas libres y en <span style="color:#A61B1B;font-weight:700">rojo</span> las ocupadas. Haz clic en una celda libre para seleccionarla.</p>
          </div>
        </div>
        <div class="paso">
          <div class="paso__num">4</div>
          <div class="paso__body">
            <div class="paso__titulo">Resumen y confirmación</div>
            <p>Revisa todos los datos. Al pulsar <strong>Confirmar</strong> se crean de forma atómica el titular, la concesión y el difunto, y se ocupa la sepultura seleccionada.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 7. Regularizaciones ────────────────────────────────── -->
    <section class="bloque" id="regularizaciones">
      <h2 class="bloque__titulo"><i class="pi pi-arrows-alt" /> Regularizaciones</h2>
      <p class="bloque__intro">
        La pantalla de regularizaciones permite asignar masivamente difuntos y concesiones históricas (que no tienen sepultura asignada) a sus sepulturas reales. El número de pendientes aparece como badge en el menú lateral.
      </p>

      <div class="cards">
        <div class="card">
          <div class="card__head"><i class="pi pi-list" /> Panel de pendientes</div>
          <ul class="lista">
            <li>Alterna entre la pestaña <strong>Difuntos</strong> y <strong>Concesiones</strong> para ver los registros sin asignar.</li>
            <li>Usa el buscador para filtrar por nombre o expediente.</li>
            <li>Botón <strong>«+»</strong> — crea un nuevo difunto o concesión directamente desde aquí sin salir del módulo.</li>
          </ul>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-arrows-h" /> Asignación por arrastrar</div>
          <p>En el panel izquierdo, elige zona y bloque. Arrastra un registro del panel derecho sobre una sepultura libre (verde) para vincularlo al instante. La celda cambia a rojo automáticamente.</p>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-map" /> Mapa interactivo</div>
          <p>El mapa geográfico muestra puntos de colores por tipo de unidad. Haz clic en cualquier punto para abrir el expediente de esa sepultura.</p>
          <p class="tip"><i class="pi pi-info-circle" /> Zoom: <kbd>Ctrl</kbd> + rueda del ratón.</p>
        </div>
      </div>
    </section>

    <!-- ── 8. Alertas ─────────────────────────────────────────── -->
    <section class="bloque" id="alertas">
      <h2 class="bloque__titulo"><i class="pi pi-bell" /> Alertas</h2>
      <p class="bloque__intro">
        El panel lateral de alertas muestra situaciones que requieren atención. Está disponible desde el icono de campana en el menú lateral.
      </p>

      <div class="tab-grid">
        <div class="tab-card">
          <div class="tab-card__head" style="color:#A61B1B">Concesiones caducadas</div>
          <p>Concesiones cuya fecha de vencimiento ha pasado. Nivel crítico — requieren renovación o trámite de baja.</p>
        </div>
        <div class="tab-card">
          <div class="tab-card__head" style="color:#C9A227">Próximas a caducar</div>
          <p>Concesiones que vencerán en los próximos N días (configurable desde Configuración → «Días de aviso»). Permite anticiparse y contactar al titular.</p>
        </div>
        <div class="tab-card">
          <div class="tab-card__head" style="color:#1266A3">Difuntos sin ubicar</div>
          <p>Difuntos registrados en el sistema sin sepultura asignada. Úsalos en Regularizaciones para asignarles su nicho.</p>
        </div>
        <div class="tab-card">
          <div class="tab-card__head" style="color:#6b7a77">Concesiones sin nicho</div>
          <p>Concesiones registradas pero sin sepultura asignada. Igualmente se gestionan desde Regularizaciones.</p>
        </div>
      </div>

      <p class="tip" style="margin-top:4px">
        <i class="pi pi-info-circle" />
        <span>El umbral de «próximas a caducar» se ajusta en <strong>Configuración → Días de aviso de próxima caducidad</strong>.</span>
      </p>
    </section>

    <!-- ── 9. Mapas ───────────────────────────────────────────── -->
    <section class="bloque" id="mapas">
      <h2 class="bloque__titulo"><i class="pi pi-map-marker" /> Mapas</h2>
      <p class="bloque__intro">La aplicación usa dos tipos de mapa complementarios.</p>
      <div class="cards">
        <div class="card">
          <div class="card__head">Cuadrícula de nichos</div>
          <p>Representación esquemática de los bloques. Cada celda es una sepultura:</p>
          <div class="leyenda" style="margin-top:4px">
            <span class="leyenda__item"><span class="dot" style="background:#0F7A4A"/>Verde — libre</span>
            <span class="leyenda__item"><span class="dot" style="background:#A61B1B"/>Rojo — ocupada</span>
            <span class="leyenda__item"><span class="dot" style="background:#C9A227"/>Ámbar — reservada</span>
            <span class="leyenda__item"><span class="dot" style="background:#9a9a9a"/>Gris — clausurada</span>
          </div>
          <p style="margin-top:6px">El color cambia en tiempo real (animación de 400 ms) al inhumar o exhumar, sin recargar la página.</p>
        </div>
        <div class="card">
          <div class="card__head">Mapa GPS (OpenStreetMap)</div>
          <p>Mapa cartográfico real con polígonos de zonas y bloques, y puntos para cada sepultura. Haz clic en cualquier elemento para abrir su detalle.</p>
          <p class="tip"><i class="pi pi-info-circle" /> El scroll de la página no mueve el mapa. Zoom: <kbd>Ctrl</kbd> + rueda del ratón.</p>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-plus" /> Toolbar del mapa</div>
          <p>La barra de herramientas del mapa (disponible en Inicio) incluye:</p>
          <ul class="lista">
            <li><strong>Nueva zona</strong> — abre el formulario de zona sin salir del mapa.</li>
            <li><strong>Nuevo bloque</strong> — ídem para bloques.</li>
            <li><strong>Pantalla completa</strong> — expande el mapa a toda la ventana.</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ── 10. Configuración ──────────────────────────────────── -->
    <section class="bloque" id="configuracion">
      <h2 class="bloque__titulo"><i class="pi pi-cog" /> Configuración</h2>
      <p class="bloque__intro">
        El panel de configuración se abre desde el icono de engranaje en el menú lateral. Requiere el permiso <strong>cementerio.admin</strong>. Los cambios se aplican en tiempo real sin recargar la página.
      </p>
      <div class="cards">
        <div class="card">
          <div class="card__head">Ajustes operativos</div>
          <ul class="lista">
            <li>Días de aviso de concesión próxima a caducar.</li>
            <li>Duración por defecto de nuevas concesiones.</li>
            <li>Nombre y datos del cementerio.</li>
          </ul>
        </div>
        <div class="card">
          <div class="card__head">Apariencia</div>
          <ul class="lista">
            <li>Color primario de la interfaz (se aplica en vivo como variable CSS).</li>
            <li>Logotipo del ayuntamiento.</li>
          </ul>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-download" /> Backup</div>
          <p>Descarga una copia completa de la base de datos en formato <code>.sql</code> desde el botón <strong>Descargar backup</strong> del panel de Información del sistema. Guárdala en un lugar seguro.</p>
        </div>
        <div class="card">
          <div class="card__head">Información del sistema</div>
          <p>Muestra versión de PHP, Laravel, base de datos, uso de disco y espacio en caché. Incluye botones para limpiar caché y optimizar la base de datos.</p>
        </div>
      </div>
    </section>

    <!-- ── 11. Papelera ───────────────────────────────────────── -->
    <section class="bloque" id="papelera">
      <h2 class="bloque__titulo"><i class="pi pi-trash" /> Papelera</h2>
      <p class="bloque__intro">
        Los difuntos, concesiones y titulares eliminados no se borran definitivamente de inmediato: pasan a la papelera. Desde ahí se pueden restaurar o eliminar de forma permanente. Requiere permiso <strong>cementerio.admin</strong>.
      </p>
      <div class="cards">
        <div class="card">
          <div class="card__head"><i class="pi pi-undo" /> Restaurar</div>
          <p>Devuelve el registro al estado activo, conservando todos sus datos y relaciones originales.</p>
        </div>
        <div class="card">
          <div class="card__head"><i class="pi pi-times-circle" /> Eliminar definitivamente</div>
          <p>Borra el registro de forma permanente e irreversible. Usa esta opción solo cuando estés seguro de que el registro no se necesita.</p>
        </div>
      </div>
      <p class="tip" style="margin-top:4px">
        <i class="pi pi-info-circle" />
        <span>La papelera agrupa los elementos por tipo en pestañas. Usa el buscador de cada pestaña para localizar rápidamente el registro que quieres restaurar.</span>
      </p>
    </section>

    <!-- ── 12. Gestión de usuarios ───────────────────────────── -->
    <section class="bloque" id="usuarios">
      <h2 class="bloque__titulo"><i class="pi pi-users" /> Gestión de usuarios</h2>
      <p class="bloque__intro">
        La página de usuarios (<em>Cementerio → Usuarios</em>) solo es visible para cuentas con el permiso <strong>cementerio.admin</strong>. Permite crear, editar y eliminar usuarios, así como asignar roles y permisos.
      </p>
      <div class="cards">
        <div class="card">
          <div class="card__head">Roles disponibles</div>
          <ul class="lista">
            <li><strong>super_admin</strong> — acceso completo a todo el sistema.</li>
          </ul>
          <p style="margin-top:6px;font-size:12px;color:rgba(23,35,31,.6)">Los roles adicionales se pueden crear desde la consola del servidor.</p>
        </div>
        <div class="card">
          <div class="card__head">Permisos del módulo</div>
          <ul class="lista">
            <li><strong>cementerio.ver</strong> — consultar datos (solo lectura).</li>
            <li><strong>cementerio.crear</strong> — dar de alta nuevos registros.</li>
            <li><strong>cementerio.editar</strong> — modificar registros existentes.</li>
            <li><strong>cementerio.admin</strong> — configuración, usuarios, papelera y backup.</li>
          </ul>
        </div>
        <div class="card">
          <div class="card__head">Acciones disponibles</div>
          <ul class="lista">
            <li>Crear usuario nuevo con nombre, usuario, email y contraseña.</li>
            <li>Editar datos de un usuario existente.</li>
            <li>Asignar o quitar roles mediante checkboxes.</li>
            <li>Asignar o quitar permisos directos.</li>
            <li>Eliminar usuario (no puedes eliminar tu propia cuenta).</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ── 13. Consejos ───────────────────────────────────────── -->
    <section class="bloque" id="consejos">
      <h2 class="bloque__titulo"><i class="pi pi-lightbulb" /> Consejos de uso</h2>
      <div class="consejos-grid">
        <div class="consejo">
          <i class="pi pi-search consejo__icon" />
          <div>
            <strong>Buscador siempre disponible</strong>
            <p>Pulsa <kbd>/</kbd> desde cualquier pantalla para enfocar el buscador global. Encuentra cualquier nicho, difunto o expediente sin ir a Gestión.</p>
          </div>
        </div>
        <div class="consejo">
          <i class="pi pi-building consejo__icon" />
          <div>
            <strong>Cambiar de cementerio</strong>
            <p>El selector de la barra superior actualiza todos los datos de la aplicación al instante: KPIs, mapa, tablas de Gestión y alertas.</p>
          </div>
        </div>
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
            <p>En las tablas de Bloques, Sepulturas y Concesiones, los nombres de zona y bloque son enlaces. Clic → navega directamente a esa pestaña.</p>
          </div>
        </div>
        <div class="consejo">
          <i class="pi pi-download consejo__icon" />
          <div>
            <strong>Exportar datos</strong>
            <p>Las pestañas de Sepulturas, Concesiones, Difuntos y Titulares tienen botón <em>Exportar CSV</em>. Solo exporta los registros visibles tras aplicar los filtros activos.</p>
          </div>
        </div>
        <div class="consejo">
          <i class="pi pi-th-large consejo__icon" />
          <div>
            <strong>Cuadrícula de bloques</strong>
            <p>En la pestaña Bloques, haz clic en el nombre del bloque para ver su cuadrícula. Clic en cualquier celda abre el expediente de esa sepultura. El color se actualiza en tiempo real.</p>
          </div>
        </div>
        <div class="consejo">
          <i class="pi pi-refresh consejo__icon" />
          <div>
            <strong>Renovar concesiones</strong>
            <p>Desde el expediente de una sepultura o desde el detalle de una concesión en Gestión, usa el botón <strong>Renovar</strong> para extender la vigencia. El historial de renovaciones queda registrado.</p>
          </div>
        </div>
        <div class="consejo">
          <i class="pi pi-trash consejo__icon" />
          <div>
            <strong>Borrado seguro</strong>
            <p>Los registros eliminados van a la Papelera. Desde ahí puedes restaurarlos si fue un error, o eliminarlos definitivamente cuando estés seguro.</p>
          </div>
        </div>
      </div>
    </section>

    <div class="footer-manual">
      Sistema de Gestión de Cementerios Municipales · Ayuntamiento de Los Corrales de Buelna
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
  padding: 5px 12px; border-radius: 8px; font-size: 12.5px; font-weight: 600;
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

.subtitulo { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--c2-primary,#118652); margin: 0; }

/* ── Cards ────────────────────────────────────────────────── */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.card {
  padding: 14px 16px; border-radius: 12px;
  border: 1px solid rgba(23,35,31,.09);
  background: rgba(245,247,244,.6);
  display: grid; gap: 8px; align-content: start;
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
.tab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.tab-card {
  padding: 12px 14px; border-radius: 12px;
  border: 1px solid rgba(23,35,31,.09);
  background: rgba(245,247,244,.5);
  display: grid; gap: 6px; align-content: start;
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
