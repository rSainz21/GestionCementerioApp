<template>
  <div class="page">
    <header class="page__header">
      <div>
        <h2 class="title">Inicio</h2>
        <div class="subtitle">Resumen de ocupación y accesos rápidos.</div>
      </div>
      <div class="actions">
        <router-link class="btn btn--ghost" to="/cementerio/gestion">Gestión</router-link>
        <router-link class="btn btn--primary" to="/cementerio/nuevo">Nuevo caso</router-link>
      </div>
    </header>

    <!-- ── KPIs ──────────────────────────────────────────────────────────── -->
    <div class="kpis">
      <div class="kpi kpi--free">
        <div class="kpi__label">Libres</div>
        <div class="kpi__value">{{ stats.libres ?? '—' }}</div>
      </div>
      <div class="kpi kpi--busy">
        <div class="kpi__label">Ocupadas</div>
        <div class="kpi__value">{{ stats.ocupadas ?? '—' }}</div>
      </div>
      <div class="kpi kpi--total">
        <div class="kpi__label">Total</div>
        <div class="kpi__value">{{ totalSepulturas }}</div>
      </div>
      <div class="kpi kpi--pct">
        <div class="kpi__label">% ocupación</div>
        <div class="kpi__value">{{ pctOcupacion }}%</div>
      </div>
    </div>

    <!-- ── Gráficas de ocupación ──────────────────────────────────────────── -->
    <div class="charts-grid">
      <section class="card">
        <div class="card__body">
          <div class="card__title">Ocupación por bloque</div>
          <ApexChart
            v-if="bloqueSeries.length"
            type="bar"
            height="210"
            :options="bloqueOptions"
            :series="bloqueSeries"
          />
          <div v-else class="chart-empty muted">Cargando…</div>
        </div>
      </section>

      <section class="card">
        <div class="card__body">
          <div class="card__title">Ocupación por tipo de unidad</div>
          <ApexChart
            v-if="tipoSeries.length"
            type="bar"
            height="210"
            :options="tipoOptions"
            :series="tipoSeries"
          />
          <div v-else class="chart-empty muted">Cargando…</div>
        </div>
      </section>

      <section class="card">
        <div class="card__body">
          <div class="card__title">Ocupación por zona</div>
          <ApexChart
            v-if="zonaSeries.length"
            type="bar"
            height="210"
            :options="zonaOptions"
            :series="zonaSeries"
          />
          <div v-else class="chart-empty muted">Cargando…</div>
        </div>
      </section>

      <section class="card">
        <div class="card__body">
          <div class="card__title">Resumen general</div>
          <ApexChart
            v-if="donutSeries.length"
            type="donut"
            height="210"
            :options="donutOptions"
            :series="donutSeries"
          />
          <div v-else class="chart-empty muted">Cargando…</div>
        </div>
      </section>
    </div>

    <!-- ── Fila 3: Accesos rápidos ───────────────────────────────────────── -->
    <div class="quick">
      <router-link class="quick__tile quick__tile--primary" to="/cementerio/nuevo">
        <div class="quick__icon"><i class="pi pi-plus-circle" /></div>
        <div class="quick__text">
          <div class="quick__title">Nuevo caso</div>
          <div class="quick__sub">Alta guiada de concesión y asignación de sepultura.</div>
        </div>
      </router-link>

      <!-- Buscar concesiones -->
      <div class="quick__tile" :class="{ 'quick__tile--expanded': selectedConcesion }">
        <div class="quick__icon"><i class="pi pi-search" /></div>
        <div class="quick__text">
          <div class="quick__title">Buscar concesiones</div>
          <div class="quick__sub">Busca por nombre o DNI del concesionario.</div>
        </div>
        <div class="search">
          <input
            v-model="concesionSearch"
            class="input"
            placeholder="Ej: García o 12345678Z"
            @input="onConcesionSearchInput"
            @focus="if (selectedConcesion) { concesionSearch = ''; selectedConcesion = null; }"
          />
          <div v-if="concesionLoading" class="help muted">Buscando…</div>
          <div v-else-if="concesionItems.length" class="dropdown">
            <button
              v-for="it in concesionItems"
              :key="it.id"
              type="button"
              class="dropdown__item"
              @click="selectConcesion(it)"
            >
              {{ it.label }}
            </button>
          </div>
          <div v-else-if="!selectedConcesion" class="help muted">Escribe al menos 2 caracteres.</div>
        </div>

        <!-- Resultado inline -->
        <transition name="res-fade">
          <div v-if="selectedConcesion" class="inline-result">
            <button class="inline-result__close" type="button" @click="clearSelectedConcesion" title="Nueva búsqueda">
              <i class="pi pi-times" />
            </button>

            <div class="ir-nombre">
              {{ selectedConcesion.concesionario || 'Sin concesionario' }}
              <span v-if="selectedConcesion.concesionario_dni" class="ir-dni">{{ selectedConcesion.concesionario_dni }}</span>
            </div>

            <div class="ir-pills">
              <span class="ir-pill" v-if="selectedConcesion.tipo">{{ selectedConcesion.tipo }}</span>
              <span class="ir-pill ir-pill--estado" :class="`ir-pill--${selectedConcesion.estado}`" v-if="selectedConcesion.estado">{{ selectedConcesion.estado }}</span>
            </div>

            <div class="ir-rows">
              <div v-if="selectedConcesion.numero_expediente" class="ir-row">
                <i class="pi pi-file ir-icon" />{{ selectedConcesion.numero_expediente }}
              </div>
              <div v-if="selectedConcesion.sepultura_codigo" class="ir-row ir-row--loc">
                <i class="pi pi-map-marker ir-icon" />
                <span>{{ selectedConcesion.sepultura_codigo }}</span>
                <span v-if="selectedConcesion.bloque_nombre" class="ir-muted">· {{ selectedConcesion.bloque_nombre }}</span>
                <span v-if="selectedConcesion.zona_nombre" class="ir-muted">· {{ selectedConcesion.zona_nombre }}</span>
              </div>
              <div v-else class="ir-row ir-muted"><i class="pi pi-exclamation-circle ir-icon" />Sin sepultura asignada</div>
              <div v-if="selectedConcesion.fecha_concesion" class="ir-row">
                <i class="pi pi-calendar ir-icon" />Concedida: {{ selectedConcesion.fecha_concesion }}
              </div>
              <div v-if="selectedConcesion.fecha_vencimiento" class="ir-row">
                <i class="pi pi-clock ir-icon" />Vence: {{ selectedConcesion.fecha_vencimiento }}
              </div>
            </div>

            <div v-if="selectedConcesion.difuntos?.length" class="ir-difuntos">
              <div class="ir-difuntos__label">Difuntos</div>
              <div v-for="d in selectedConcesion.difuntos" :key="d.id" class="ir-difunto">
                <i class="pi pi-user ir-icon" />
                <span>{{ d.nombre_completo }}</span>
                <span v-if="d.fecha_fallecimiento" class="ir-muted">† {{ d.fecha_fallecimiento }}</span>
                <span v-if="d.es_titular" class="ir-titular">titular</span>
              </div>
            </div>

            <div class="ir-actions">
              <button
                v-if="selectedConcesion.sepultura_id"
                class="ir-btn ir-btn--primary"
                type="button"
                @click="openSepultura(selectedConcesion.sepultura_id)"
              >
                <i class="pi pi-external-link" /> Ver nicho
              </button>
            </div>
          </div>
        </transition>
      </div>

      <!-- Buscar difunto -->
      <div class="quick__tile" :class="{ 'quick__tile--expanded': selectedDifunto }">
        <div class="quick__icon"><i class="pi pi-user" /></div>
        <div class="quick__text">
          <div class="quick__title">Buscar difunto</div>
          <div class="quick__sub">Localiza dónde está enterrado por nombre o DNI.</div>
        </div>
        <div class="search">
          <input
            v-model="difuntoSearch"
            class="input"
            placeholder="Ej: Hernández o 12345678Z"
            @input="onDifuntoSearchInput"
            @focus="if (selectedDifunto) { difuntoSearch = ''; selectedDifunto = null; }"
          />
          <div v-if="difuntoLoading" class="help muted">Buscando…</div>
          <div v-else-if="difuntoItems.length" class="dropdown">
            <button
              v-for="it in difuntoItems"
              :key="it.id"
              type="button"
              class="dropdown__item"
              @click="selectDifunto(it)"
            >
              {{ it.label }}
            </button>
          </div>
          <div v-else-if="!selectedDifunto" class="help muted">Escribe al menos 2 caracteres.</div>
        </div>

        <!-- Resultado inline -->
        <transition name="res-fade">
          <div v-if="selectedDifunto" class="inline-result">
            <button class="inline-result__close" type="button" @click="clearSelectedDifunto" title="Nueva búsqueda">
              <i class="pi pi-times" />
            </button>

            <div class="ir-nombre">
              {{ selectedDifunto.nombre_completo || '—' }}
              <span v-if="selectedDifunto.dni" class="ir-dni">{{ selectedDifunto.dni }}</span>
            </div>

            <div class="ir-rows">
              <div v-if="selectedDifunto.fecha_fallecimiento" class="ir-row">
                <i class="pi pi-heart-fill ir-icon" style="color:#A61B1B" />Fallecido: {{ selectedDifunto.fecha_fallecimiento }}
              </div>
              <div v-if="selectedDifunto.fecha_inhumacion" class="ir-row">
                <i class="pi pi-calendar ir-icon" />Inhumado: {{ selectedDifunto.fecha_inhumacion }}
              </div>
              <div v-if="selectedDifunto.sepultura_codigo" class="ir-row ir-row--loc">
                <i class="pi pi-map-marker ir-icon" />
                <span>{{ selectedDifunto.sepultura_codigo }}</span>
                <span v-if="selectedDifunto.bloque_nombre" class="ir-muted">· {{ selectedDifunto.bloque_nombre }}</span>
                <span v-if="selectedDifunto.zona_nombre" class="ir-muted">· {{ selectedDifunto.zona_nombre }}</span>
              </div>
              <div v-else class="ir-row ir-muted">
                <i class="pi pi-exclamation-circle ir-icon" />Sin sepultura asignada
              </div>
            </div>

            <div class="ir-actions">
              <button
                v-if="selectedDifunto.sepultura_id"
                class="ir-btn ir-btn--primary"
                type="button"
                @click="openSepultura(selectedDifunto.sepultura_id)"
              >
                <i class="pi pi-external-link" /> Ver nicho
              </button>
            </div>
          </div>
        </transition>
      </div>

      <button class="quick__tile quick__tile--reg" type="button" @click="regVisible = true">
        <div class="quick__icon"><i class="pi pi-sync" /></div>
        <div class="quick__text">
          <div class="quick__title">Regularizaciones</div>
          <div class="quick__sub">Asigna difuntos y concesiones sin sepultura.</div>
        </div>
      </button>
    </div>

    <!-- ── Fila 4: Mapa ──────────────────────────────────────────────────── -->
    <section class="card mapa-card" :class="{ 'mapa-card--fullscreen': mapaFullscreen }">
      <div class="mapa-card__head">
        <div class="card__title" style="margin:0">Mapa del cementerio</div>
        <div class="mapa-toolbar">
          <div class="capas">
            <span class="capas__label">Capas:</span>
            <label class="capa-check capa-check--zona">
              <input type="checkbox" v-model="capasActivas" value="zona" />
              Zonas
            </label>
            <label class="capa-check capa-check--bloque">
              <input type="checkbox" v-model="capasActivas" value="bloque" />
              Bloques
            </label>
          </div>
          <div class="mapa-actions">
            <button type="button" class="mapa-btn" @click="abrirNuevaZona" title="Nueva zona">
              <i class="pi pi-map" /> Nueva zona
            </button>
            <button type="button" class="mapa-btn" @click="abrirNuevoBloque" title="Nuevo bloque">
              <i class="pi pi-th-large" /> Nuevo bloque
            </button>
            <button type="button" class="mapa-btn mapa-btn--icon" @click="mapaFullscreen = !mapaFullscreen"
                    :title="mapaFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'">
              <i :class="mapaFullscreen ? 'pi pi-compress' : 'pi pi-expand'" />
            </button>
          </div>
        </div>
      </div>
      <div class="mapa-card__map-wrap">
        <MapaCementerioSomahoz
          ref="mapaRef"
          :fullscreen="mapaFullscreen"
          :centerLat="LAT"
          :centerLon="LON"
          :zoom="18"
          :items="[]"
          :capasActivas="capasActivas"
          :zonas="zonasGeo"
          :bloques="bloquesGeo"
          @select="onMapSelect"
        />
      </div>
      <div class="mapa-foot muted">
        Cementerio de Somahoz · Los Corrales de Buelna · Clic en una zona o bloque para ver su contenido
        <span v-if="mapaFullscreen"> · <button type="button" class="mapa-esc-hint" @click="mapaFullscreen=false">ESC para salir</button></span>
      </div>
    </section>

    <!-- ── Dialog nueva zona (formulario completo idéntico a Gestión) ──────── -->
    <ZonaFormDialog
      v-model="nuevaZonaDialog"
      :cementerios="cementeriosList"
      @saved="onZonaGuardada"
    />

    <!-- ── Dialog nuevo bloque (formulario completo idéntico a Gestión) ──── -->
    <BloqueFormDialog
      v-model="nuevoBloqueDialog"
      :zonas="zonasParaBloque"
      @saved="onBloqueGuardado"
    />


    <div v-if="error" class="error">{{ error }}</div>

    <!-- ── Modal Regularizaciones ────────────────────────────────────────── -->
    <RegularizacionesModal v-model:visible="regVisible" />

    <!-- ── Dialog detalle sepultura ──────────────────────────────────────── -->
    <Dialog v-model:visible="sepDialog" modal header="Detalle de sepultura" :style="{ width: 'min(1400px, 96vw)' }">
      <SepulturaInfoPanel :sepulturaId="sepDialogId" @navigate="onSepNavigate" @changed="onSepChanged" />
      <template #footer>
        <Button label="Cerrar" severity="secondary" @click="sepDialog = false" />
      </template>
    </Dialog>

    <!-- ── Dialog cuadrícula de bloque ───────────────────────────────────── -->
    <BloqueGridView v-model="bloqueGridVisible" :bloque="selectedBloque" />

    <!-- ── Dialog zona: contenido ────────────────────────────────────────── -->
    <Dialog v-model:visible="zonaDialog" modal :header="selectedZona ? `Zona: ${selectedZona.nombre}` : 'Zona'" :style="{ width: 'min(900px, 96vw)' }">
      <div class="zona-det">
        <div class="zona-det__kpis">
          <div class="zkpi"><div class="zkpi__l">Bloques</div><div class="zkpi__v">{{ zonaBloques.length }}</div></div>
          <div class="zkpi"><div class="zkpi__l">Sepulturas</div><div class="zkpi__v">{{ zonaSepulturas.length }}</div></div>
        </div>

        <div class="zona-det__cols">
          <div class="zcol">
            <div class="zcol__h">Bloques</div>
            <div v-if="!zonaBloques.length" class="muted">Sin bloques en esta zona.</div>
            <button v-for="b in zonaBloques" :key="b.id" type="button" class="zrow" @click="openBloqueGridFromZona(b)">
              <span class="zrow__name">{{ b.nombre }}</span>
              <span class="muted">{{ b.codigo }}</span>
              <span class="zrow__cta">Ver cuadrícula</span>
            </button>
          </div>
          <div class="zcol">
            <div class="zcol__h">Sepulturas</div>
            <div class="muted small">Mostrando hasta 250 (para UX rápida).</div>
            <div v-if="!zonaSepulturas.length" class="muted">Sin sepulturas cargadas.</div>
            <div v-else class="sep-mini">
              <button v-for="s in zonaSepulturas" :key="s.id" type="button" class="sep-mini__row" @click="openSepultura(s.id)">
                <span class="sep-dot" :class="`sep-dot--${s.estado}`" />
                <span class="sep-code">{{ s.codigo || s.id }}</span>
                <span class="muted">{{ s.bloque_nombre ?? '' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cerrar" severity="secondary" @click="zonaDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';
import { useCementerioStore } from '@/stores/cementerio';
import ApexChart from 'vue3-apexcharts';
import RegularizacionesModal from '@/components/cementerio/RegularizacionesModal.vue';
import SepulturaInfoPanel from '@/components/cementerio/SepulturaInfoPanel.vue';
import MapaCementerioSomahoz from '@/components/cementerio/MapaCementerioSomahoz.vue';
import BloqueGridView from '@/components/cementerio/BloqueGridView.vue';
import ZonaFormDialog from '@/components/cementerio/admin/ZonaFormDialog.vue';
import BloqueFormDialog from '@/components/cementerio/admin/BloqueFormDialog.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';

const router = useRouter();
const route  = useRoute();
const cemStore = useCementerioStore();
const cid = computed(() => cemStore.activoId);
const stats = reactive({});
const error = ref(null);

// ── KPIs ────────────────────────────────────────────────────────────────────
const totalSepulturas = computed(() => (Number(stats.libres ?? 0) + Number(stats.ocupadas ?? 0)));
const pctOcupacion = computed(() => {
  const t = totalSepulturas.value;
  return t > 0 ? Math.round((Number(stats.ocupadas ?? 0) / t) * 100) : 0;
});

// ── Opciones base compartidas para gráficas de barras apiladas ─────────────
function makeBarOptions(categories, rotateLabels = false) {
  return {
    chart: {
      stacked: true,
      toolbar: { show: false },
      animations: { enabled: true, speed: 250 },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 5,
        columnWidth: '60%',
      },
    },
    xaxis: {
      categories,
      labels: {
        rotate: rotateLabels ? -45 : 0,
        rotateAlways: rotateLabels,
        trim: true,
        hideOverlappingLabels: true,
        style: { fontSize: '10px' },
        maxHeight: rotateLabels ? 72 : 32,
        offsetY: rotateLabels ? 4 : 0,
      },
      tickPlacement: 'between',
    },
    yaxis: { labels: { style: { fontSize: '10px' } } },
    colors: ['#A61B1B', '#0F7A4A'],
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    grid: { borderColor: 'rgba(23,35,31,0.08)', padding: { left: 4, right: 4, top: 0, bottom: 0 } },
    tooltip: { y: { formatter: (v) => `${v}` } },
  };
}

// ── Gráfica por bloque ──────────────────────────────────────────────────────
const bloqueItems = ref([]);

const bloqueSeries = computed(() => {
  if (!bloqueItems.value.length) return [];
  return [
    { name: 'Ocupadas', data: bloqueItems.value.map((b) => b.ocupadas) },
    { name: 'Libres',   data: bloqueItems.value.map((b) => b.libres)   },
  ];
});

const bloqueOptions = computed(() =>
  makeBarOptions(
    bloqueItems.value.map((b) => (b.codigo || b.nombre || '').toString()),
    bloqueItems.value.length > 5,
  )
);

// ── Gráfica por tipo de unidad ───────────────────────────────────────────────
const tipoItems = ref([]);

const tipoSeries = computed(() => {
  if (!tipoItems.value.length) return [];
  return [
    { name: 'Ocupadas', data: tipoItems.value.map((t) => t.ocupadas) },
    { name: 'Libres',   data: tipoItems.value.map((t) => t.libres)   },
  ];
});

const tipoOptions = computed(() =>
  makeBarOptions(tipoItems.value.map((t) => t.nombre), false)
);

// ── Gráfica por zona ─────────────────────────────────────────────────────────
const zonaItems = ref([]);

const zonaSeries = computed(() => {
  if (!zonaItems.value.length) return [];
  return [
    { name: 'Ocupadas', data: zonaItems.value.map((z) => z.ocupadas) },
    { name: 'Libres',   data: zonaItems.value.map((z) => z.libres)   },
  ];
});

const zonaOptions = computed(() =>
  makeBarOptions(zonaItems.value.map((z) => z.nombre), false)
);

// ── Donut resumen general ────────────────────────────────────────────────────
const donutSeries = computed(() => {
  const libres   = Number(stats.libres   ?? 0);
  const ocupadas = Number(stats.ocupadas ?? 0);
  return libres + ocupadas > 0 ? [ocupadas, libres] : [];
});

const donutOptions = computed(() => ({
  labels: ['Ocupadas', 'Libres'],
  colors: ['#A61B1B', '#0F7A4A'],
  legend: { position: 'bottom', fontSize: '11px' },
  dataLabels: { enabled: true, style: { fontSize: '11px' } },
  stroke: { width: 0 },
  plotOptions: { pie: { donut: { size: '60%' } } },
}));

// ── Buscar concesiones ───────────────────────────────────────────────────────
const concesionSearch = ref('');
const concesionItems = ref([]);
const concesionLoading = ref(false);
const selectedConcesion = ref(null);
let concesionTimer = null;

function onConcesionSearchInput() {
  if (concesionTimer) clearTimeout(concesionTimer);
  concesionTimer = setTimeout(buscarConcesiones, 250);
}

async function buscarConcesiones() {
  const q = concesionSearch.value?.trim() ?? '';
  if (q.length < 2) { concesionItems.value = []; return; }
  concesionLoading.value = true;
  try {
    const res = await api.get('/api/cementerio/concesiones', { params: { q, cementerio_id: cid.value } });
    concesionItems.value = res.data?.items ?? [];
  } finally { concesionLoading.value = false; }
}

function selectConcesion(it) {
  selectedConcesion.value = it;
  concesionSearch.value = it?.concesionario || it?.label || '';
  concesionItems.value = [];
}
function clearSelectedConcesion() { selectedConcesion.value = null; }

// ── Buscar difunto ───────────────────────────────────────────────────────────
const difuntoSearch = ref('');
const difuntoItems = ref([]);
const difuntoLoading = ref(false);
const selectedDifunto = ref(null);
let difuntoTimer = null;

function onDifuntoSearchInput() {
  if (difuntoTimer) clearTimeout(difuntoTimer);
  difuntoTimer = setTimeout(buscarDifuntos, 250);
}

async function buscarDifuntos() {
  const q = difuntoSearch.value?.trim() ?? '';
  if (q.length < 2) { difuntoItems.value = []; return; }
  difuntoLoading.value = true;
  try {
    const res = await api.get('/api/cementerio/personas', { params: { q, tipo: 'difunto', cementerio_id: cid.value } });
    difuntoItems.value = res.data?.items ?? [];
  } finally { difuntoLoading.value = false; }
}

function selectDifunto(it) {
  selectedDifunto.value = it;
  difuntoSearch.value = it?.nombre_completo || it?.label || '';
  difuntoItems.value = [];
}
function clearSelectedDifunto() { selectedDifunto.value = null; }

// ── Mapa Somahoz (centro recinto) ───────────────────────────────────────────
const LAT = 43.248730;
const LON = -4.057985;

// ── Capas (solo estructuras: zonas y bloques) ────────────────────────────────
const capasActivas = ref(['zona', 'bloque']);

// ── Geo: zonas y bloques ──────────────────────────────────────────────────────
const zonasGeo  = ref([]);
const bloquesGeo = ref([]);

async function loadZonasGeo() {
  try {
    const res = await api.get('/api/cementerio/zonas/geo', { params: { cementerio_id: cid.value } });
    zonasGeo.value = res.data?.items ?? [];
  } catch { zonasGeo.value = []; }
}

async function loadBloquesGeo() {
  try {
    const res = await api.get('/api/cementerio/bloques/geo', { params: { cementerio_id: cid.value } });
    bloquesGeo.value = res.data?.items ?? [];
  } catch { bloquesGeo.value = []; }
}

// ── Sepulturas (para zona dialog) ────────────────────────────────────────────
const allSepulturas = ref([]);

async function loadSepulturas() {
  try {
    const res = await api.get('/api/cementerio/admin/sepulturas', { params: { cementerio_id: cid.value } });
    allSepulturas.value = res.data?.items ?? [];
  } catch { allSepulturas.value = []; }
}

// ── Dialog sepultura ─────────────────────────────────────────────────────────
const sepDialog = ref(false);
const sepDialogId = ref(null);

function openSepultura(id) {
  const v = Number(id);
  if (!Number.isFinite(v) || v <= 0) return;
  sepDialogId.value = v;
  sepDialog.value = true;
}

function onSepChanged({ id, estado, nombre }) {
  const sep = allSepulturas.value.find(s => s.id === id);
  if (sep) {
    sep.estado = estado;
    sep.tooltip_nombre = nombre;
  }
}

function onSepNavigate(id) {
  const v = Number(id);
  if (!Number.isFinite(v) || v <= 0) return;
  sepDialogId.value = v;
}

// ── Regularizaciones ────────────────────────────────────────────────────────
const regVisible = ref(false);

// ── Mapa: selección de elementos (sepultura / bloque / zona) ────────────────
const bloqueGridVisible = ref(false);
const selectedBloque = ref(null);

const zonaDialog = ref(false);
const selectedZona = ref(null);

// ── Mapa fullscreen + toolbar ────────────────────────────────────────────────
const mapaFullscreen = ref(false);
const mapaRef = ref(null);

function onMapaFsKeydown(e) {
  if (e.key === 'Escape') mapaFullscreen.value = false;
}

watch(mapaFullscreen, async (full) => {
  if (full) {
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onMapaFsKeydown);
  } else {
    document.body.style.overflow = '';
    window.removeEventListener('keydown', onMapaFsKeydown);
  }
  await nextTick();
  requestAnimationFrame(() => mapaRef.value?.invalidateSize?.());
  setTimeout(() => mapaRef.value?.invalidateSize?.(), 200);
  setTimeout(() => mapaRef.value?.invalidateSize?.(), 500);
});

onUnmounted(() => {
  document.body.style.overflow = '';
  window.removeEventListener('keydown', onMapaFsKeydown);
});

const nuevaZonaDialog  = ref(false);
const nuevoBloqueDialog = ref(false);
const cementeriosList   = ref([]);

function abrirNuevaZona() { nuevaZonaDialog.value = true; }
function abrirNuevoBloque() { nuevoBloqueDialog.value = true; }

async function onZonaGuardada() { await loadGeo(); }
async function onBloqueGuardado() { await loadGeo(); }

async function loadCementerios() {
  try {
    const res = await api.get('/api/cementerio/admin/cementerios');
    cementeriosList.value = res.data?.items ?? [];
  } catch { /* silencioso */ }
}

// Zonas con el formato completo que necesita BloqueFormDialog (polygon parseado)
const zonasParaBloque = computed(() =>
  (zonasGeo.value ?? []).map((z) => ({
    ...z,
    polygon: typeof z.polygon === 'string' ? JSON.parse(z.polygon) : (z.polygon ?? null),
  }))
);

const zonaBloques = computed(() => {
  const zid = selectedZona.value?.id;
  if (!zid) return [];
  return bloquesGeo.value.filter((b) => Number(b.zona_id) === Number(zid));
});

const zonaSepulturas = computed(() => {
  const zid = selectedZona.value?.id;
  if (!zid) return [];
  return (allSepulturas.value ?? [])
    .filter((s) => Number(s.zona_id) === Number(zid))
    .slice(0, 250);
});

function openBloqueGrid(b) {
  if (!b?.id) return;
  selectedBloque.value = b;
  bloqueGridVisible.value = true;
}

function openBloqueGridFromZona(b) {
  zonaDialog.value = false;
  openBloqueGrid(b);
}

function onMapSelect(it) {
  const tipo = it?.tipo;
  if (tipo === 'sepultura') {
    openSepultura(it.id);
    return;
  }
  if (tipo === 'bloque') {
    openBloqueGrid(it);
    return;
  }
  if (tipo === 'zona') {
    selectedZona.value = it;
    zonaDialog.value = true;
  }
}

// ── Carga inicial ────────────────────────────────────────────────────────────
async function loadStats() {
  error.value = null;
  try {
    const params = { cementerio_id: cid.value };
    const [resStats, resBloques, resTipos, resZonas] = await Promise.all([
      api.get('/api/cementerio/stats',        { params }),
      api.get('/api/cementerio/stats/bloques', { params }),
      api.get('/api/cementerio/stats/tipos',   { params }),
      api.get('/api/cementerio/stats/zonas',   { params }),
    ]);
    Object.assign(stats, resStats.data ?? {});
    bloqueItems.value = resBloques.data?.items ?? [];
    tipoItems.value   = resTipos.data?.items   ?? [];
    zonaItems.value   = resZonas.data?.items   ?? [];
  } catch (e) {
    error.value = e?.response?.data?.message ?? 'No se pudo cargar el dashboard.';
  }
}

// ── Deep-link desde alertas del sidebar ─────────────────────────────────────
// Escucha query params emitidos por el sidebar de alertas
// Se usan ?t=timestamp para que siempre dispare aunque el param anterior sea igual
watch(
  () => [route.query.sepultura, route.query.t],
  ([id]) => {
    const v = Number(id);
    if (Number.isFinite(v) && v > 0) {
      openSepultura(v);
      router.replace({ path: '/cementerio' });
    }
  },
  { immediate: true },
);

watch(
  () => [route.query.regularizaciones, route.query.t],
  ([v]) => {
    if (v) {
      regVisible.value = true;
      router.replace({ path: '/cementerio' });
    }
  },
  { immediate: true },
);

// Recargar todo cuando cambie el cementerio activo
watch(cid, async (newVal, oldVal) => {
  if (newVal !== oldVal && newVal) {
    await Promise.all([loadStats(), loadSepulturas(), loadZonasGeo(), loadBloquesGeo()]);
  }
});

onMounted(async () => {
  await Promise.all([loadStats(), loadSepulturas(), loadZonasGeo(), loadBloquesGeo(), loadCementerios()]);
});
</script>

<style scoped>
.page { display: grid; gap: 14px; }

.page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.title { margin: 0; font-size: 20px; color: var(--c2-text, #17231F); }
.subtitle { margin-top: 4px; color: rgba(23, 35, 31, 0.65); font-size: 13px; }
.actions { display: flex; gap: 10px; align-items: center; }

/* ── KPIs ── */
.kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

/* ── Gráficas de ocupación ── */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  align-items: start;
}

.kpi {
  border: 1px solid rgba(23, 35, 31, 0.10);
  border-radius: 12px;
  padding: 14px 12px;
  background: white;
}
.kpi__label { font-size: 11px; font-weight: 800; color: rgba(23, 35, 31, 0.65); text-transform: uppercase; letter-spacing: 0.05em; }
.kpi__value { font-size: 28px; font-weight: 900; margin-top: 6px; }

.kpi--free  { border-color: rgba(15, 122, 74, 0.30); }
.kpi--free .kpi__value  { color: var(--c2-success, #0F7A4A); }
.kpi--busy  { border-color: rgba(166, 27, 27, 0.30); }
.kpi--busy .kpi__value  { color: var(--c2-danger, #A61B1B); }
.kpi--total { border-color: rgba(18, 102, 163, 0.20); }
.kpi--total .kpi__value { color: var(--c2-tertiary, #1266A3); }
.kpi--pct   { border-color: rgba(201, 162, 39, 0.30); }
.kpi--pct .kpi__value   { color: var(--c2-secondary, #C9A227); }

/* ── Cards ── */
.card {
  background: white;
  border-radius: 14px;
  border: 1px solid rgba(23, 35, 31, 0.10);
  box-shadow: 0 6px 18px rgba(23, 35, 31, 0.06);
}
.card__body { padding: 16px; }
.card__title { font-weight: 900; margin-bottom: 10px; color: rgba(23,35,31,0.92); }
.charts-grid .card__body { padding: 12px 14px; }
.chart-empty { padding: 40px 0; text-align: center; }

/* ── Quick tiles ── */
.quick {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.quick__tile {
  border: 2px solid rgba(23, 35, 31, 0.12);
  border-radius: 12px;
  padding: 12px;
  background: white;
  display: grid;
  gap: 10px;
  align-content: start;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  min-height: 112px;
  text-align: left;
  transition: border-color 120ms, box-shadow 120ms;
}
.quick__tile:hover { border-color: rgba(23,35,31,0.25); box-shadow: 0 6px 18px rgba(23,35,31,0.08); }

.quick__tile--primary {
  border-color: rgba(17, 134, 82, 0.55);
  box-shadow: 0 0 0 4px rgba(17, 134, 82, 0.08);
}

.quick__tile--reg {
  border-color: rgba(18, 102, 163, 0.40);
}
.quick__tile--reg:hover { border-color: rgba(18, 102, 163, 0.65); }

.quick__icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(23, 35, 31, 0.06);
  border: 1px solid rgba(23, 35, 31, 0.10);
}
.quick__title { font-weight: 900; }
.quick__sub { color: rgba(23, 35, 31, 0.65); font-size: 12px; margin-top: 2px; }

/* ── Mapa ── */
.mapa-card { overflow: hidden; }

.mapa-card__map-wrap {
  position: relative;
  min-height: 0;
}

.mapa-card--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 5000;
  border-radius: 0 !important;
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100dvh;
  max-height: 100dvh;
  width: 100vw;
  max-width: 100vw;
  background: #fff;
  box-shadow: none;
  overflow: hidden;
}

.mapa-card--fullscreen .mapa-card__head {
  grid-row: 1;
}

.mapa-card--fullscreen .mapa-card__map-wrap {
  grid-row: 2;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.mapa-card--fullscreen .mapa-foot {
  grid-row: 3;
}

.mapa-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(23,35,31,0.08);
}

.mapa-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.mapa-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mapa-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid rgba(23,35,31,.14);
  background: #f5f7f4;
  color: #374240;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background .12s, border-color .12s;
}
.mapa-btn:hover { background: #e8eceb; border-color: rgba(23,35,31,.22); }
.mapa-btn .pi { font-size: 12px; color: var(--c2-primary, #118652); }
.mapa-btn--icon { padding: 5px 8px; }

.mapa-esc-hint {
  background: none; border: none; color: var(--c2-primary, #118652);
  cursor: pointer; font-size: 12px; text-decoration: underline;
}

.capas { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.capas__label { font-size: 11px; font-weight: 800; color: rgba(23,35,31,0.55); text-transform: uppercase; }
.capa-check {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; color: rgba(23,35,31,0.80); cursor: pointer;
}
.capa-check input { cursor: pointer; accent-color: var(--c2-primary, #118652); }
.capa-check--zona  input { accent-color: #0D6B42; }
.capa-check--bloque input { accent-color: #1266A3; }

.mapa-iframe {
  width: 100%;
  height: 420px;
  border: 0;
  display: block;
}

.mapa-foot {
  padding: 8px 14px;
  border-top: 1px solid rgba(23,35,31,0.06);
  font-size: 12px;
}



/* ── Tile expandido con resultado ── */
.quick__tile--expanded {
  border-color: rgba(17, 134, 82, 0.45);
  box-shadow: 0 0 0 3px rgba(17, 134, 82, 0.08), 0 6px 18px rgba(23,35,31,0.08);
}

/* ── Resultado inline ── */
.inline-result {
  position: relative;
  border-top: 1px solid rgba(23, 35, 31, 0.08);
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inline-result__close {
  position: absolute;
  top: 10px;
  right: 0;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(23, 35, 31, 0.12);
  background: rgba(23, 35, 31, 0.04);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 11px;
  color: rgba(23, 35, 31, 0.55);
  transition: background 100ms;
}
.inline-result__close:hover { background: rgba(23, 35, 31, 0.10); }

.ir-nombre {
  font-weight: 900;
  font-size: 14px;
  color: #1c2d29;
  padding-right: 28px;
  line-height: 1.3;
}
.ir-dni {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: rgba(23, 35, 31, 0.50);
  margin-left: 4px;
}

.ir-pills {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.ir-pill {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(23, 35, 31, 0.07);
  color: rgba(23, 35, 31, 0.70);
  text-transform: capitalize;
}
.ir-pill--vigente   { background: rgba(15, 122, 74, 0.12); color: #0F7A4A; }
.ir-pill--caducada,
.ir-pill--vencida   { background: rgba(166, 27, 27, 0.10); color: #A61B1B; }
.ir-pill--renovada  { background: rgba(18, 102, 163, 0.10); color: #1266A3; }

.ir-rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ir-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 12px;
  color: #2c3e39;
  flex-wrap: wrap;
}
.ir-row--loc { color: var(--c2-primary, #118652); font-weight: 600; }
.ir-icon { font-size: 11px; opacity: 0.70; flex-shrink: 0; }
.ir-muted { font-size: 11px; color: rgba(23, 35, 31, 0.50); }

.ir-difuntos {
  border-top: 1px solid rgba(23, 35, 31, 0.06);
  padding-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ir-difuntos__label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(23, 35, 31, 0.45);
  margin-bottom: 2px;
}
.ir-difunto {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 12px;
  flex-wrap: wrap;
}
.ir-titular {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(17, 134, 82, 0.10);
  color: var(--c2-primary, #118652);
}

.ir-actions {
  display: flex;
  gap: 6px;
}
.ir-btn {
  height: 32px;
  padding: 0 12px;
  border-radius: 9px;
  border: none;
  cursor: pointer;
  font-weight: 700;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: filter 100ms;
}
.ir-btn--primary {
  background: var(--c2-primary, #118652);
  color: #fff;
}
.ir-btn--primary:hover { filter: brightness(1.08); }

/* ── Transición fade ── */
.res-fade-enter-active { transition: opacity 150ms ease, transform 150ms ease; }
.res-fade-leave-active { transition: opacity 100ms ease; }
.res-fade-enter-from { opacity: 0; transform: translateY(-4px); }
.res-fade-leave-to  { opacity: 0; }

/* ── Inputs y botones ── */
.btn {
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(23, 35, 31, 0.14);
  background: white;
  cursor: pointer;
  font-weight: 800;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.btn--primary { background: var(--c2-primary, #118652); color: white; border-color: rgba(17, 134, 82, 0.55); }
.btn--ghost { background: transparent; }

.input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(23, 35, 31, 0.18);
  padding: 8px 10px;
  outline: none;
  font-size: 13px;
  box-sizing: border-box;
}
.input--sm { height: 34px; padding: 0 10px; }
.input:focus { border-color: var(--c2-primary, #118652); box-shadow: 0 0 0 3px rgba(17, 134, 82, 0.12); }

.search { display: grid; gap: 6px; }
.help { font-size: 12px; }

.dropdown {
  border: 1px solid rgba(23, 35, 31, 0.12);
  border-radius: 10px;
  overflow: hidden;
  background: white;
  box-shadow: 0 10px 24px rgba(23, 35, 31, 0.10);
  max-height: 200px;
  overflow-y: auto;
}
.dropdown__item {
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border: 0;
  background: white;
  cursor: pointer;
  font-size: 13px;
}
.dropdown__item:hover { background: rgba(17, 134, 82, 0.08); }

.muted { color: rgba(23, 35, 31, 0.60); font-size: 12px; }
.error { color: var(--c2-danger, #A61B1B); font-size: 13px; }

/* ── Zona dialog ─────────────────────────────────────────── */
.zona-det { display: grid; gap: 12px; }
.zona-det__kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.zkpi { border: 1px solid rgba(23,35,31,.10); border-radius: 12px; padding: 10px 12px; background: rgba(245,247,244,.55); }
.zkpi__l { font-size: 11px; font-weight: 800; color: rgba(23,35,31,.55); text-transform: uppercase; letter-spacing:.05em; }
.zkpi__v { font-size: 20px; font-weight: 900; margin-top: 4px; color: rgba(23,35,31,.92); }

.zona-det__cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.zcol { border: 1px solid rgba(23,35,31,.10); border-radius: 12px; padding: 10px 10px; background: white; }
.zcol__h { font-weight: 900; margin-bottom: 8px; color: rgba(23,35,31,.92); }
.zrow {
  width: 100%;
  border: 1px solid rgba(23,35,31,.08);
  background: rgba(245,247,244,.6);
  border-radius: 10px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;
  cursor: pointer;
  text-align: left;
  margin-bottom: 6px;
}
.zrow:hover { border-color: rgba(17,134,82,.35); background: rgba(17,134,82,.06); }
.zrow__name { font-weight: 800; }
.zrow__cta { color: var(--c2-primary,#118652); font-weight: 800; font-size: 12px; }

.sep-mini { display: grid; gap: 4px; max-height: 420px; overflow: auto; padding-right: 4px; }
.sep-mini__row {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 10px;
  padding: 8px 10px;
  display: grid;
  grid-template-columns: 10px 1fr 1fr;
  gap: 8px;
  align-items: center;
  cursor: pointer;
  text-align: left;
}
.sep-mini__row:hover { background: rgba(17,134,82,.06); border-color: rgba(17,134,82,.16); }
.small { font-size: 12px; }

@media (max-width: 1300px) {
  .charts-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 1100px) {
  .mapa-row { grid-template-columns: 1fr; }
  .zona-det__cols { grid-template-columns: 1fr; }
}
@media (max-width: 900px) {
  .kpis { grid-template-columns: repeat(2, 1fr); }
  .charts-grid { grid-template-columns: 1fr; }
  .quick { grid-template-columns: repeat(2, 1fr); }
  .result { flex-direction: column; }
}
</style>
