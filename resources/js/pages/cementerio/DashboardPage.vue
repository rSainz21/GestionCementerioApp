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

      <div class="quick__tile">
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
          <div v-else class="help muted">Escribe al menos 2 caracteres.</div>
        </div>
      </div>

      <div class="quick__tile">
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
          <div v-else class="help muted">Escribe al menos 2 caracteres.</div>
        </div>
      </div>

      <button class="quick__tile quick__tile--reg" type="button" @click="regVisible = true">
        <div class="quick__icon"><i class="pi pi-sync" /></div>
        <div class="quick__text">
          <div class="quick__title">Regularizaciones</div>
          <div class="quick__sub">Asigna difuntos y concesiones sin sepultura.</div>
        </div>
      </button>
    </div>

    <!-- ── Fila 4: Mapa + panel de sepulturas ────────────────────────────── -->
    <div class="mapa-row">
      <!-- Mapa (Leaflet) -->
      <section class="card mapa-card">
        <div class="mapa-card__head">
          <div class="card__title" style="margin:0">Mapa del cementerio</div>
          <div class="capas">
            <span class="capas__label">Capas:</span>
            <label v-for="capa in capas" :key="capa.key" class="capa-check">
              <input type="checkbox" v-model="capasActivas" :value="capa.key" />
              {{ capa.label }}
            </label>
          </div>
        </div>
        <MapaCementerioSomahoz
          :centerLat="LAT"
          :centerLon="LON"
          :zoom="18"
          :items="geoItems"
          :capasActivas="capasActivas"
          @select="(it) => openSepultura(it.id)"
        />
        <div class="mapa-foot muted">
          Cementerio de Somahoz · Los Corrales de Buelna
        </div>
      </section>

      <!-- Panel de sepulturas -->
      <section class="card panel-sep">
        <div class="panel-sep__head">
          <div class="card__title" style="margin:0">Sepulturas</div>
          <input
            v-model="sepSearch"
            class="input input--sm"
            placeholder="Buscar código o número…"
          />
        </div>
        <div v-if="sepLoading" class="panel-sep__empty muted">Cargando…</div>
        <div v-else-if="!sepFiltradas.length" class="panel-sep__empty muted">Sin resultados.</div>
        <div v-else class="sep-list">
          <button
            v-for="s in sepFiltradas"
            :key="s.id"
            type="button"
            class="sep-item"
            :class="{ 'sep-item--ocupada': s.estado === 'ocupada' }"
            @click="openSepultura(s.id)"
          >
            <span class="sep-dot" :class="`sep-dot--${s.estado}`" />
            <span class="sep-code">{{ s.codigo || s.id }}</span>
            <span class="sep-meta muted">{{ s.tipo || '' }}</span>
          </button>
        </div>
      </section>
    </div>

    <!-- ── Resultados de búsqueda ────────────────────────────────────────── -->
    <section v-if="selectedConcesion" class="card card--result">
      <div class="card__body">
        <div class="card__title">Resultado de búsqueda</div>
        <div class="result">
          <div class="result__main">
            <div class="result__name">
              {{ selectedConcesion.concesionario || '—' }}
              <span v-if="selectedConcesion.concesionario_dni" class="muted">({{ selectedConcesion.concesionario_dni }})</span>
            </div>
            <div class="muted">
              Concesión #{{ selectedConcesion.id }}
              <span v-if="selectedConcesion.sepultura_codigo"> · Sepultura {{ selectedConcesion.sepultura_codigo }}</span>
              <span v-if="selectedConcesion.bloque_nombre"> · Bloque {{ selectedConcesion.bloque_nombre }}</span>
              <span v-if="selectedConcesion.zona_nombre"> · Zona {{ selectedConcesion.zona_nombre }}</span>
            </div>
          </div>
          <button class="btn btn--ghost" type="button" @click="clearSelectedConcesion">Cerrar</button>
        </div>
      </div>
    </section>

    <section v-if="selectedDifunto" class="card card--result">
      <div class="card__body">
        <div class="card__title">Resultado de búsqueda</div>
        <div class="result">
          <div class="result__main">
            <div class="result__name">
              {{ selectedDifunto.nombre_completo || '—' }}
              <span v-if="selectedDifunto.dni" class="muted">({{ selectedDifunto.dni }})</span>
            </div>
            <div class="muted">
              <span v-if="selectedDifunto.sepultura_codigo"> Sepultura {{ selectedDifunto.sepultura_codigo }}</span>
              <span v-if="selectedDifunto.bloque_nombre"> · Bloque {{ selectedDifunto.bloque_nombre }}</span>
              <span v-if="selectedDifunto.fecha_inhumacion"> · Inh. {{ selectedDifunto.fecha_inhumacion }}</span>
            </div>
          </div>
          <div class="result__actions">
            <button v-if="selectedDifunto.sepultura_id" class="btn btn--primary" type="button" @click="openSepultura(selectedDifunto.sepultura_id)">
              Ver sepultura
            </button>
            <button class="btn btn--ghost" type="button" @click="clearSelectedDifunto">Cerrar</button>
          </div>
        </div>
      </div>
    </section>

    <div v-if="error" class="error">{{ error }}</div>

    <!-- ── Modal Regularizaciones ────────────────────────────────────────── -->
    <RegularizacionesModal v-model:visible="regVisible" />

    <!-- ── Dialog detalle sepultura ──────────────────────────────────────── -->
    <Dialog v-model:visible="sepDialog" modal header="Detalle de sepultura" :style="{ width: 'min(1400px, 96vw)' }">
      <SepulturaInfoPanel :sepulturaId="sepDialogId" @navigate="onSepNavigate" />
      <template #footer>
        <Button label="Cerrar" severity="secondary" @click="sepDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import ApexChart from 'vue3-apexcharts';
import RegularizacionesModal from '@/components/cementerio/RegularizacionesModal.vue';
import SepulturaInfoPanel from '@/components/cementerio/SepulturaInfoPanel.vue';
import MapaCementerioSomahoz from '@/components/cementerio/MapaCementerioSomahoz.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';

const router = useRouter();
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
    const res = await api.get('/api/cementerio/concesiones', { params: { q } });
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
    const res = await api.get('/api/cementerio/difuntos', { params: { q } });
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
const LAT = 43.25445;
const LON = -4.04920;

// ── Capas ───────────────────────────────────────────────────────────────────
const capas = [
  { key: 'nicho',     label: 'Nichos'     },
  { key: 'fosa',      label: 'Fosas'      },
  { key: 'columbario', label: 'Columbarios' },
  { key: 'panteon',   label: 'Panteones'  },
];
const capasActivas = ref(capas.map((c) => c.key));

// ── Panel sepulturas ─────────────────────────────────────────────────────────
const allSepulturas = ref([]);
const sepLoading = ref(false);
const sepSearch = ref('');

const sepFiltradas = computed(() => {
  let list = allSepulturas.value;
  if (capasActivas.value.length < capas.length) {
    list = list.filter((s) => capasActivas.value.includes((s.tipo || '').toLowerCase()));
  }
  const q = sepSearch.value.trim().toLowerCase();
  if (q.length >= 1) {
    list = list.filter((s) =>
      String(s.codigo || '').toLowerCase().includes(q) ||
      String(s.numero || '').includes(q)
    );
  }
  return list;
});

async function loadSepulturas() {
  sepLoading.value = true;
  try {
    const res = await api.get('/api/cementerio/admin/sepulturas');
    allSepulturas.value = res.data?.items ?? [];
  } finally {
    sepLoading.value = false;
  }
}

// ── Puntos GEO para el mapa ──────────────────────────────────────────────────
const geoItems = ref([]);
async function loadGeo() {
  const res = await api.get('/api/cementerio/sepulturas/geo', { params: { limit: 5000 } });
  geoItems.value = res.data?.items ?? [];
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

function onSepNavigate(id) {
  const v = Number(id);
  if (!Number.isFinite(v) || v <= 0) return;
  sepDialogId.value = v;
}

// ── Regularizaciones ────────────────────────────────────────────────────────
const regVisible = ref(false);

// ── Carga inicial ────────────────────────────────────────────────────────────
async function loadStats() {
  error.value = null;
  try {
    const [resStats, resBloques, resTipos, resZonas] = await Promise.all([
      api.get('/api/cementerio/stats'),
      api.get('/api/cementerio/stats/bloques'),
      api.get('/api/cementerio/stats/tipos'),
      api.get('/api/cementerio/stats/zonas'),
    ]);
    Object.assign(stats, resStats.data ?? {});
    bloqueItems.value = resBloques.data?.items ?? [];
    tipoItems.value   = resTipos.data?.items   ?? [];
    zonaItems.value   = resZonas.data?.items   ?? [];
  } catch (e) {
    error.value = e?.response?.data?.message ?? 'No se pudo cargar el dashboard.';
  }
}

onMounted(async () => {
  await Promise.all([loadStats(), loadSepulturas(), loadGeo()]);
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

/* ── Fila mapa ── */
.mapa-row {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 12px;
  align-items: start;
}

.mapa-card { overflow: hidden; }

.mapa-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(23,35,31,0.08);
}

.capas { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.capas__label { font-size: 11px; font-weight: 800; color: rgba(23,35,31,0.55); text-transform: uppercase; }
.capa-check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(23,35,31,0.80);
  cursor: pointer;
}
.capa-check input { cursor: pointer; accent-color: var(--c2-primary, #118652); }

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

/* ── Panel sepulturas ── */
.panel-sep { overflow: hidden; display: flex; flex-direction: column; }

.panel-sep__head {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(23,35,31,0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-sep__empty { padding: 20px 14px; font-size: 13px; }

.sep-list {
  flex: 1;
  overflow-y: auto;
  max-height: 420px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
}

.sep-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 100ms, border-color 100ms;
}
.sep-item:hover { background: rgba(17,134,82,0.07); border-color: rgba(17,134,82,0.18); }

.sep-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
}
.sep-dot--libre   { background: var(--c2-success, #0F7A4A); }
.sep-dot--ocupada { background: var(--c2-danger, #A61B1B); }

.sep-code { font-weight: 700; font-size: 13px; flex: 1; }
.sep-meta { font-size: 11px; }

/* ── Resultados ── */
.card--result { }
.result {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.result__name { font-weight: 900; }
.result__actions { display: flex; gap: 10px; align-items: center; }

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

@media (max-width: 1300px) {
  .charts-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 1100px) {
  .mapa-row { grid-template-columns: 1fr; }
}
@media (max-width: 900px) {
  .kpis { grid-template-columns: repeat(2, 1fr); }
  .charts-grid { grid-template-columns: 1fr; }
  .quick { grid-template-columns: repeat(2, 1fr); }
  .result { flex-direction: column; }
}
</style>
