<template>
  <div class="page">
    <header class="page__header">
      <div>
        <h2 class="title">Dashboard</h2>
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
      <MapaUnidades />
    </section>

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '@/services/api';
import ApexChart from 'vue3-apexcharts';
import MapaUnidades from '@/components/cementerio/MapaUnidades.vue';
const stats = reactive({});
const error = ref(null);

async function load() {
  error.value = null;
  try {
    const res = await api.get('/api/cementerio/stats');
    Object.assign(stats, res.data ?? {});
  } catch (e) {
    error.value = e?.response?.data?.message ?? 'No se pudo cargar el dashboard.';
  }
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

.muted { color: rgba(23, 35, 31, 0.60); font-size: 12px; }
.error { margin-top: 12px; color: var(--c2-danger, #A61B1B); font-size: 13px; }

@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
  .kpis { grid-template-columns: repeat(2, 1fr); }
}
</style>

