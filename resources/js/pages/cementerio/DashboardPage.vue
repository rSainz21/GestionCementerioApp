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

    <div class="grid">
      <section class="card">
        <div class="card__body">
          <div class="kpis">
            <div class="kpi kpi--free">
              <div class="kpi__label">Libres</div>
              <div class="kpi__value">{{ stats.libres ?? '—' }}</div>
            </div>
            <div class="kpi kpi--busy">
              <div class="kpi__label">Ocupadas</div>
              <div class="kpi__value">{{ stats.ocupadas ?? '—' }}</div>
            </div>
            <div class="kpi kpi--res">
              <div class="kpi__label">Reservadas</div>
              <div class="kpi__value">{{ stats.reservadas ?? '—' }}</div>
            </div>
            <div class="kpi kpi--closed">
              <div class="kpi__label">Clausuradas</div>
              <div class="kpi__value">{{ stats.clausuradas ?? '—' }}</div>
            </div>
          </div>

          <div class="quick">
            <router-link class="quick__tile quick__tile--primary" to="/cementerio/nuevo">
              <div class="quick__icon"><i class="pi pi-plus-circle" /></div>
              <div class="quick__text">
                <div class="quick__title">Nuevo caso</div>
                <div class="quick__sub">Alta guiada de concesión y asignación de unidad.</div>
              </div>
            </router-link>

            <div class="quick__tile">
              <div class="quick__icon"><i class="pi pi-search" /></div>
              <div class="quick__text">
                <div class="quick__title">Buscar concesiones</div>
                <div class="quick__sub">Escribe un nombre o DNI para ver si ya tiene concesiones.</div>
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
                <div class="quick__sub">Escribe nombre o DNI para localizar dónde está enterrado.</div>
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

            <button class="quick__tile quick__tile--disabled" type="button" disabled>
              <div class="quick__icon"><i class="pi pi-wrench" /></div>
              <div class="quick__text">
                <div class="quick__title">Función 4</div>
                <div class="quick__sub">Pendiente de definir.</div>
              </div>
            </button>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card__body">
          <div class="card__title">Ocupación</div>
          <ApexChart v-if="chartSeries.length" type="donut" height="260" :options="chartOptions" :series="chartSeries" />
          <div v-else class="muted">Cargando…</div>
        </div>
      </section>
    </div>

    <section class="card card--mapa">
      <div class="card__body">
        <div class="card__title">Mapa de unidades</div>
      </div>
      <div id="mapa-unidades"></div>
      <MapaUnidades />
    </section>

    <section v-if="selectedConcesion" class="card card--result">
      <div class="card__body">
        <div class="card__title">Resultado</div>
        <div class="result">
          <div class="result__main">
            <div class="result__name">
              {{ selectedConcesion.concesionario || '—' }}
              <span v-if="selectedConcesion.concesionario_dni" class="muted">({{ selectedConcesion.concesionario_dni }})</span>
            </div>
            <div class="muted">
              Concesión #{{ selectedConcesion.id }}
              <span v-if="selectedConcesion.sepultura_codigo"> · Unidad {{ selectedConcesion.sepultura_codigo }}</span>
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
        <div class="card__title">Resultado</div>
        <div class="result">
          <div class="result__main">
            <div class="result__name">
              {{ selectedDifunto.nombre_completo || '—' }}
              <span v-if="selectedDifunto.dni" class="muted">({{ selectedDifunto.dni }})</span>
            </div>
            <div class="muted">
              Difunto #{{ selectedDifunto.id }}
              <span v-if="selectedDifunto.sepultura_codigo"> · Unidad {{ selectedDifunto.sepultura_codigo }}</span>
              <span v-if="selectedDifunto.bloque_nombre"> · Bloque {{ selectedDifunto.bloque_nombre }}</span>
              <span v-if="selectedDifunto.zona_nombre"> · Zona {{ selectedDifunto.zona_nombre }}</span>
            </div>
            <div class="muted" v-if="selectedDifunto.fecha_inhumacion || selectedDifunto.fecha_fallecimiento">
              <span v-if="selectedDifunto.fecha_inhumacion">Inhumación {{ selectedDifunto.fecha_inhumacion }}</span>
              <span v-if="selectedDifunto.fecha_fallecimiento"> · Fallecimiento {{ selectedDifunto.fecha_fallecimiento }}</span>
            </div>
          </div>
          <div class="result__actions">
            <button v-if="selectedDifunto.sepultura_id" class="btn btn--primary" type="button" @click="verUnidadDeDifunto">
              Ver unidad
            </button>
            <button class="btn btn--ghost" type="button" @click="clearSelectedDifunto">Cerrar</button>
          </div>
        </div>
      </div>
    </section>

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import ApexChart from 'vue3-apexcharts';
import MapaUnidades from '@/components/cementerio/MapaUnidades.vue';
const stats = reactive({});
const error = ref(null);
const router = useRouter();

const concesionSearch = ref('');
const concesionItems = ref([]);
const concesionLoading = ref(false);
const selectedConcesion = ref(null);
let concesionTimer = null;

const difuntoSearch = ref('');
const difuntoItems = ref([]);
const difuntoLoading = ref(false);
const selectedDifunto = ref(null);
let difuntoTimer = null;

async function load() {
  error.value = null;
  try {
    const res = await api.get('/api/cementerio/stats');
    Object.assign(stats, res.data ?? {});
  } catch (e) {
    error.value = e?.response?.data?.message ?? 'No se pudo cargar el dashboard.';
  }
}

function onConcesionSearchInput() {
  if (concesionTimer) clearTimeout(concesionTimer);
  concesionTimer = setTimeout(buscarConcesiones, 250);
}

async function buscarConcesiones() {
  const q = concesionSearch.value?.trim() ?? '';
  if (q.length < 2) {
    concesionItems.value = [];
    return;
  }
  concesionLoading.value = true;
  try {
    const res = await api.get('/api/cementerio/concesiones', { params: { q } });
    concesionItems.value = res.data?.items ?? [];
  } finally {
    concesionLoading.value = false;
  }
}

function selectConcesion(it) {
  selectedConcesion.value = it;
  concesionSearch.value = it?.concesionario || it?.label || '';
  concesionItems.value = [];
}

function clearSelectedConcesion() {
  selectedConcesion.value = null;
}

function onDifuntoSearchInput() {
  if (difuntoTimer) clearTimeout(difuntoTimer);
  difuntoTimer = setTimeout(buscarDifuntos, 250);
}

async function buscarDifuntos() {
  const q = difuntoSearch.value?.trim() ?? '';
  if (q.length < 2) {
    difuntoItems.value = [];
    return;
  }
  difuntoLoading.value = true;
  try {
    const res = await api.get('/api/cementerio/difuntos', { params: { q } });
    difuntoItems.value = res.data?.items ?? [];
  } finally {
    difuntoLoading.value = false;
  }
}

function selectDifunto(it) {
  selectedDifunto.value = it;
  difuntoSearch.value = it?.nombre_completo || it?.label || '';
  difuntoItems.value = [];
}

function clearSelectedDifunto() {
  selectedDifunto.value = null;
}

async function verUnidadDeDifunto() {
  const sepulturaId = Number(selectedDifunto.value?.sepultura_id);
  if (!Number.isFinite(sepulturaId) || sepulturaId <= 0) return;
  await router.push({ path: '/cementerio', query: { sepultura: String(sepulturaId) } });
  await nextTick();
  const el = document.getElementById('mapa-unidades');
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const chartSeries = computed(() => {
  const libres = Number(stats.libres ?? 0);
  const ocupadas = Number(stats.ocupadas ?? 0);
  const reservadas = Number(stats.reservadas ?? 0);
  const clausuradas = Number(stats.clausuradas ?? 0);
  return [libres, ocupadas, reservadas, clausuradas];
});

const chartOptions = computed(() => ({
  labels: ['Libres', 'Ocupadas', 'Reservadas', 'Clausuradas'],
  colors: ['#0F7A4A', '#A61B1B', '#C9A227', '#6B7280'],
  legend: { position: 'bottom' },
  dataLabels: { enabled: true },
  stroke: { width: 0 },
}));

onMounted(load);
</script>

<style scoped>
.page {
  min-height: 100vh;
}

.page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.title { margin: 0; font-size: 20px; color: var(--c2-text, #17231F); }
.subtitle { margin-top: 4px; color: rgba(23, 35, 31, 0.65); font-size: 13px; }

.actions { display: flex; gap: 10px; align-items: center; }

.card {
  background: white;
  border-radius: 14px;
  border: 1px solid rgba(23, 35, 31, 0.10);
  box-shadow: 0 6px 18px rgba(23, 35, 31, 0.06);
}
.card__body { padding: 16px; }
.card__title { font-weight: 900; margin-bottom: 10px; }
.card--mapa { margin-top: 12px; }

.grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 12px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.kpi {
  border: 1px solid rgba(23, 35, 31, 0.10);
  border-radius: 12px;
  padding: 12px;
  background: rgba(245, 247, 244, 0.65);
}
.kpi__label { font-size: 12px; font-weight: 800; color: rgba(23, 35, 31, 0.65); }
.kpi__value { font-size: 22px; font-weight: 900; margin-top: 6px; }

.kpi--free { border-color: rgba(15, 122, 74, 0.25); }
.kpi--busy { border-color: rgba(166, 27, 27, 0.25); }
.kpi--res { border-color: rgba(201, 162, 39, 0.35); }
.kpi--closed { border-color: rgba(107, 114, 128, 0.35); }

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

.quick {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.quick__tile {
  border: 2px solid rgba(0, 0, 0, 0.85);
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
}

.quick__tile--primary {
  border-color: rgba(17, 134, 82, 0.65);
  box-shadow: 0 0 0 4px rgba(17, 134, 82, 0.08);
}

.quick__tile--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick__icon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(23, 35, 31, 0.06);
  border: 1px solid rgba(23, 35, 31, 0.10);
}

.quick__title { font-weight: 900; }
.quick__sub { color: rgba(23, 35, 31, 0.65); font-size: 12px; margin-top: 2px; }

.search { display: grid; gap: 8px; }
.input {
  border-radius: 10px;
  border: 1px solid rgba(23, 35, 31, 0.18);
  padding: 10px 10px;
  outline: none;
}
.input:focus {
  border-color: var(--c2-primary, #118652);
  box-shadow: 0 0 0 4px rgba(17, 134, 82, 0.12);
}

.help { font-size: 12px; }

.dropdown {
  border: 1px solid rgba(23, 35, 31, 0.12);
  border-radius: 12px;
  overflow: hidden;
  background: white;
  box-shadow: 0 10px 24px rgba(23, 35, 31, 0.10);
  max-height: 240px;
  overflow-y: auto;
}
.dropdown__item {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: 0;
  background: white;
  cursor: pointer;
}
.dropdown__item:hover { background: rgba(17, 134, 82, 0.08); }

.card--result { margin-top: 12px; }
.result {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.result__name { font-weight: 900; }
.result__actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

.muted { color: rgba(23, 35, 31, 0.60); font-size: 12px; }
.error { margin-top: 12px; color: var(--c2-danger, #A61B1B); font-size: 13px; }

@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
  .kpis { grid-template-columns: repeat(2, 1fr); }
  .quick { grid-template-columns: repeat(2, 1fr); }
  .result { flex-direction: column; }
}
</style>

