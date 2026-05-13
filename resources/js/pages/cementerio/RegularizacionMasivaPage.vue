<template>
  <div class="page">
    <header class="page__header">
      <div>
        <h2 class="title">Regularización masiva</h2>
        <div class="subtitle">Asigna sepulturas a los difuntos y concesiones históricas sin ubicar.</div>
      </div>
    </header>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ 'tab--active': tab === 'difuntos' }" @click="tab = 'difuntos'">
        <i class="pi pi-user" />
        Difuntos sin asignar
        <span v-if="difuntosTotal > 0" class="tab-badge">{{ difuntosTotal }}</span>
      </button>
      <button class="tab" :class="{ 'tab--active': tab === 'concesiones' }" @click="tab = 'concesiones'">
        <i class="pi pi-file" />
        Concesiones sin asignar
        <span v-if="concesionesTotal > 0" class="tab-badge">{{ concesionesTotal }}</span>
      </button>
    </div>

    <!-- Panel difuntos -->
    <div v-if="tab === 'difuntos'" class="panel">
      <div class="panel__toolbar">
        <input v-model="difQ" type="text" class="search-inp" placeholder="Buscar nombre…" @input="loadDifuntos" />
        <button class="btn btn--ghost" @click="loadDifuntos"><i class="pi pi-refresh" /> Actualizar</button>
        <span class="count-hint" v-if="!difLoading">{{ difuntosTotal }} registros pendientes</span>
      </div>

      <div v-if="difLoading" class="loading"><i class="pi pi-spin pi-spinner" /> Cargando…</div>
      <div v-else-if="difuntos.length === 0" class="empty">
        <i class="pi pi-check-circle" style="font-size:24px;color:#16a34a" />
        <span>Todos los difuntos tienen sepultura asignada.</span>
      </div>
      <div v-else class="table-wrap">
        <table class="reg-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre completo</th>
              <th>† Fallecimiento</th>
              <th>Inhumación</th>
              <th style="min-width:260px">Asignar sepultura</th>
              <th style="width:120px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in difuntos" :key="d.id" :class="{ 'row--saved': savedDifuntos.has(d.id) }">
              <td class="id-cell">{{ d.id }}</td>
              <td class="nombre-cell">{{ d.nombre_completo }}</td>
              <td>{{ d.fecha_fallecimiento ?? '—' }}</td>
              <td>{{ d.fecha_inhumacion ?? '—' }}</td>
              <td>
                <SepulturaSearchInline v-model="selDifunto[d.id]" />
              </td>
              <td>
                <button
                  v-if="savedDifuntos.has(d.id)"
                  class="btn-asig btn-asig--saved" disabled
                >
                  <i class="pi pi-check" /> Asignado
                </button>
                <button
                  v-else
                  class="btn-asig btn-asig--primary"
                  :disabled="!selDifunto[d.id] || savingDifunto[d.id]"
                  @click="asignarDifunto(d)"
                >
                  <i v-if="savingDifunto[d.id]" class="pi pi-spin pi-spinner" />
                  <i v-else class="pi pi-link" />
                  Asignar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="difuntos.length < difuntosTotal" class="load-more">
          <button class="btn btn--ghost" @click="loadMasDifuntos" :disabled="difLoading">
            Cargar más ({{ difuntosTotal - difuntos.length }} restantes)
          </button>
        </div>
      </div>
    </div>

    <!-- Panel concesiones -->
    <div v-if="tab === 'concesiones'" class="panel">
      <div class="panel__toolbar">
        <input v-model="conQ" type="text" class="search-inp" placeholder="Buscar expediente o titular…" @input="loadConcesiones" />
        <button class="btn btn--ghost" @click="loadConcesiones"><i class="pi pi-refresh" /> Actualizar</button>
        <span class="count-hint" v-if="!conLoading">{{ concesionesTotal }} registros pendientes</span>
      </div>

      <div v-if="conLoading" class="loading"><i class="pi pi-spin pi-spinner" /> Cargando…</div>
      <div v-else-if="concesiones.length === 0" class="empty">
        <i class="pi pi-check-circle" style="font-size:24px;color:#16a34a" />
        <span>Todas las concesiones tienen sepultura asignada.</span>
      </div>
      <div v-else class="table-wrap">
        <table class="reg-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Expediente</th>
              <th>Concesionario</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th style="min-width:260px">Asignar sepultura</th>
              <th style="width:120px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in concesiones" :key="c.id" :class="{ 'row--saved': savedConcesiones.has(c.id) }">
              <td class="id-cell">{{ c.id }}</td>
              <td>{{ c.numero_expediente ?? '—' }}</td>
              <td class="nombre-cell">{{ concesionario(c) ?? '—' }}</td>
              <td>{{ c.fecha_concesion ?? '—' }}</td>
              <td>
                <span class="badge-estado" :class="`badge-estado--${c.estado}`">{{ c.estado }}</span>
              </td>
              <td>
                <SepulturaSearchInline v-model="selConcesion[c.id]" />
              </td>
              <td>
                <button
                  v-if="savedConcesiones.has(c.id)"
                  class="btn-asig btn-asig--saved" disabled
                >
                  <i class="pi pi-check" /> Asignada
                </button>
                <button
                  v-else
                  class="btn-asig btn-asig--primary"
                  :disabled="!selConcesion[c.id] || savingConcesion[c.id]"
                  @click="asignarConcesion(c)"
                >
                  <i v-if="savingConcesion[c.id]" class="pi pi-spin pi-spinner" />
                  <i v-else class="pi pi-link" />
                  Asignar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="concesiones.length < concesionesTotal" class="load-more">
          <button class="btn btn--ghost" @click="loadMasConcesiones" :disabled="conLoading">
            Cargar más ({{ concesionesTotal - concesiones.length }} restantes)
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '@/services/api';
import SepulturaSearchInline from '@/components/cementerio/SepulturaSearchInline.vue';
import { useSettingsStore } from '@/stores/settings';
import { putPersonaAsignarSepulturaConConfirmacionDoc } from '@/utils/cementerioPersonaAsignar.js';

const tab = ref('difuntos');
const settings = useSettingsStore();
/** Coincide con `regularizacion_filas_por_carga` en configuración (backend aplica el mismo tope). */
const pageSize = computed(() => {
    const n = Number(settings.get('regularizacion_filas_por_carga', '50'));
    if (!Number.isFinite(n) || n < 10) return 50;
    return Math.min(300, Math.floor(n));
});

// ── Difuntos ──────────────────────────────────────────────────────────────────
const difQ          = ref('');
const difuntos      = ref([]);
const difuntosTotal = ref(0);
const difLoading    = ref(false);
const selDifunto    = reactive({});
const savingDifunto = reactive({});
const savedDifuntos = ref(new Set());
let   difOffset     = 0;

async function loadDifuntos() {
  difLoading.value = true;
  difOffset = 0;
  try {
    const res = await api.get('/api/cementerio/personas/sin-sepultura', { params: { q: difQ.value, limit: pageSize.value, offset: 0 } });
    difuntos.value      = res.data?.items ?? [];
    difuntosTotal.value = res.data?.total ?? difuntos.value.length;
  } finally {
    difLoading.value = false;
  }
}

async function loadMasDifuntos() {
  difOffset += pageSize.value;
  difLoading.value = true;
  try {
    const res = await api.get('/api/cementerio/personas/sin-sepultura', { params: { q: difQ.value, limit: pageSize.value, offset: difOffset } });
    difuntos.value.push(...(res.data?.items ?? []));
  } finally {
    difLoading.value = false;
  }
}

async function asignarDifunto(d) {
  const sep = selDifunto[d.id];
  if (!sep) return;
  savingDifunto[d.id] = true;
  try {
    const res = await putPersonaAsignarSepulturaConConfirmacionDoc(d.id, sep.id);
    if (res === null) return;
    savedDifuntos.value.add(d.id);
    difuntosTotal.value = Math.max(0, difuntosTotal.value - 1);
  } catch (e) {
    alert(e?.response?.data?.message ?? 'Error al asignar la sepultura.');
  } finally {
    savingDifunto[d.id] = false;
  }
}

// ── Concesiones ───────────────────────────────────────────────────────────────
const conQ              = ref('');
const concesiones       = ref([]);
const concesionesTotal  = ref(0);
const conLoading        = ref(false);
const selConcesion      = reactive({});
const savingConcesion   = reactive({});
const savedConcesiones  = ref(new Set());
let   conOffset         = 0;

async function loadConcesiones() {
  conLoading.value = true;
  conOffset = 0;
  try {
    const res = await api.get('/api/cementerio/concesiones/sin-asignar', { params: { q: conQ.value, limit: pageSize.value, offset: 0 } });
    concesiones.value      = res.data?.items ?? [];
    concesionesTotal.value = res.data?.total ?? concesiones.value.length;
  } finally {
    conLoading.value = false;
  }
}

async function loadMasConcesiones() {
  conOffset += pageSize.value;
  conLoading.value = true;
  try {
    const res = await api.get('/api/cementerio/concesiones/sin-asignar', { params: { q: conQ.value, limit: pageSize.value, offset: conOffset } });
    concesiones.value.push(...(res.data?.items ?? []));
  } finally {
    conLoading.value = false;
  }
}

async function asignarConcesion(c) {
  const sep = selConcesion[c.id];
  if (!sep) return;
  savingConcesion[c.id] = true;
  try {
    await api.put(`/api/cementerio/concesiones/${c.id}/asignar-sepultura`, { sepultura_id: sep.id });
    savedConcesiones.value.add(c.id);
    concesionesTotal.value = Math.max(0, concesionesTotal.value - 1);
  } catch (e) {
    alert(e?.response?.data?.message ?? 'Error al asignar la sepultura.');
  } finally {
    savingConcesion[c.id] = false;
  }
}

function concesionario(c) {
  const t = c.terceros?.find(t => t.rol === 'concesionario') ?? c.terceros?.[0];
  return t?.nombre_original ?? null;
}

onMounted(() => {
  loadDifuntos();
  loadConcesiones();
});
</script>

<style scoped>
.page { display: grid; gap: 16px; }

.page__header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
.title { font-size: 20px; font-weight: 900; color: var(--c2-text, #17231f); margin: 0; }
.subtitle { font-size: 13px; color: rgba(23,35,31,.60); margin-top: 2px; }

/* ── Tabs ───────────────────────────────────────── */
.tabs { display: flex; gap: 4px; border-bottom: 2px solid #e8eceb; }
.tab {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 16px; background: none; border: none; cursor: pointer;
  font-size: 13px; font-weight: 600; color: #6b7a77;
  border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: color .12s, border-color .12s;
}
.tab:hover { color: var(--c2-primary, #118652); }
.tab--active { color: var(--c2-primary, #118652); border-bottom-color: var(--c2-primary, #118652); }
.tab-badge {
  font-size: 10px; font-weight: 800; padding: 1px 7px;
  background: var(--c2-danger, #A61B1B); color: #fff; border-radius: 999px;
}

/* ── Panel ──────────────────────────────────────── */
.panel { display: grid; gap: 12px; }
.panel__toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.search-inp {
  flex: 1; min-width: 200px; max-width: 340px;
  padding: 7px 12px; border: 1px solid #d4dbd9; border-radius: 8px;
  font-size: 13px; outline: none;
}
.search-inp:focus { border-color: var(--c2-primary, #118652); box-shadow: 0 0 0 3px rgba(17,134,82,.1); }
.count-hint { font-size: 12px; color: #888; }

.loading, .empty {
  padding: 32px; text-align: center;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  color: #888; font-size: 14px;
}

/* ── Table ──────────────────────────────────────── */
.table-wrap { overflow-x: auto; border: 1px solid #e0e4e3; border-radius: 10px; }
.reg-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.reg-table th {
  background: #f5f7f4; padding: 8px 12px; text-align: left;
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .04em; color: rgba(23,35,31,.55);
  border-bottom: 1px solid #e0e4e3;
}
.reg-table td { padding: 8px 12px; border-bottom: 1px solid #f0f2f1; vertical-align: middle; }
.reg-table tr:last-child td { border-bottom: none; }
.reg-table tr.row--saved td { background: #f0fdf4; opacity: .65; }

.id-cell   { width: 60px; font-variant-numeric: tabular-nums; color: #999; font-size: 12px; }
.nombre-cell { font-weight: 600; }

/* ── Badges estado ──────────────────────────────── */
.badge-estado { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; }
.badge-estado--vigente   { background: #dcfce7; color: #166534; }
.badge-estado--vencida   { background: #fee2e2; color: #b91c1c; }
.badge-estado--renovada  { background: #ffedd5; color: #9a3412; }
.badge-estado--cancelada { background: #f0f2f1; color: #374240; }

/* ── Botones asignar ────────────────────────────── */
.btn-asig {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 7px; border: none;
  font-size: 12.5px; font-weight: 600; cursor: pointer;
  transition: background .12s, opacity .12s;
}
.btn-asig--primary { background: var(--c2-primary, #118652); color: #fff; }
.btn-asig--primary:hover:not(:disabled) { filter: brightness(1.08); }
.btn-asig--primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-asig--saved { background: #dcfce7; color: #166534; cursor: default; }

/* ── Botones genéricos ──────────────────────────── */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; transition: background .12s; }
.btn--ghost { background: #eef1f0; color: #374240; }
.btn--ghost:hover { background: #e3e9e7; }

.load-more { padding: 12px; text-align: center; }
</style>
