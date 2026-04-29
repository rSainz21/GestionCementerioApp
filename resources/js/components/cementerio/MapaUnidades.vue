<template>
  <div class="mapa-wrap">
    <div class="grid-top">
      <SelectorNichosGrid
        :zonas="zonas"
        :bloques="bloques"
        selectionMode="todas"
        :selectedSepulturaId="selectedId"
        :draggingDifunto="draggingEntity"
        @update:selectedSepulturaId="(v) => (selectedId = v)"
        @selected="onSelected"
        @drop-difunto="onDropDifunto"
      />

      <div class="asign-panel">
        <div class="asign-panel__head">
          <div class="asign-tabs">
            <button
              type="button"
              class="asign-tab"
              :class="{ 'asign-tab--active': panelMode === 'difuntos' }"
              @click="setPanelMode('difuntos')"
            >
              DIFUNTOS
            </button>
            <button
              type="button"
              class="asign-tab"
              :class="{ 'asign-tab--active': panelMode === 'concesiones' }"
              @click="setPanelMode('concesiones')"
            >
              CONCESIONES
            </button>
          </div>

          <div class="asign-panel__title">
            <i class="pi pi-users" />
            {{ panelMode === 'difuntos' ? 'Difuntos sin asignar' : 'Concesiones sin asignar' }}
            <span v-if="activeItems.length" class="badge">{{ activeItems.length }}</span>
          </div>
          <div class="asign-panel__sub">
            Arrastra un elemento sobre un nicho libre del mapa para asignarlo.
          </div>
          <input
            v-model="busqueda"
            type="text"
            class="search-input"
            placeholder="Buscar por nombre…"
            @input="fetchPanelItems"
          />
        </div>

        <div v-if="loadingPanel" class="asign-empty muted">Cargando…</div>
        <div v-else-if="!activeItems.length" class="asign-empty muted">
          {{ busqueda ? 'Sin resultados.' : 'No hay elementos pendientes de asignar.' }}
        </div>

        <div v-else class="asign-list">
          <div
            v-for="item in activeItems"
            :key="`${panelMode}-${item.id}`"
            class="asign-card"
            draggable="true"
            :class="{ 'asign-card--dragging': draggingEntity?.id === item.id }"
            @dragstart="onDragStart(item)"
            @dragend="onDragEnd"
          >
            <div class="asign-card__icon">
              <i :class="panelMode === 'difuntos' ? 'pi pi-user' : 'pi pi-file'" />
            </div>
            <div class="asign-card__body">
              <div class="asign-card__nombre">{{ item.nombre }}</div>
              <div class="asign-card__meta muted">{{ item.meta }}</div>
            </div>
            <div class="asign-card__drag">
              <i class="pi pi-arrows-alt" />
            </div>
          </div>
        </div>

        <div v-if="asignMsg" :class="['asign-toast', asignMsg.ok ? 'asign-toast--ok' : 'asign-toast--err']">
          <i :class="asignMsg.ok ? 'pi pi-check-circle' : 'pi pi-times-circle'" />
          {{ asignMsg.text }}
        </div>
      </div>
    </div>

    <div class="mapa-row">
      <section class="mapa-card">
        <div class="mapa-card__head">
          <div class="mapa-card__title">Mapa del cementerio</div>
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
          @select="onMapSelect"
        />

        <div class="mapa-foot muted">Cementerio de Somahoz</div>
      </section>

      <section class="sep-panel">
        <div class="sep-panel__head">
          <div class="sep-panel__title">Sepulturas</div>
          <input
            v-model="sepSearch"
            class="search-input"
            placeholder="Buscar código o número…"
          />
        </div>
        <div v-if="sepLoading" class="asign-empty muted">Cargando…</div>
        <div v-else-if="!sepFiltradas.length" class="asign-empty muted">Sin resultados.</div>
        <div v-else class="sep-list">
          <button
            v-for="s in sepFiltradas"
            :key="s.id"
            type="button"
            class="sep-item"
            :class="{ 'sep-item--active': selectedId === s.id }"
            @click="openDetail(s.id)"
          >
            <span class="sep-dot" :class="`sep-dot--${(s.estado || 'libre').toLowerCase()}`" />
            <span class="sep-code">{{ s.codigo || s.id }}</span>
          </button>
        </div>
      </section>
    </div>

    <Dialog v-model:visible="detailDialog" modal header="Detalle de unidad" :style="{ width: 'min(1400px, 96vw)' }">
      <SepulturaInfoPanel
        :sepulturaId="detailSepulturaId"
        @navigate="onNavegate"
      />
      <template #footer>
        <Button label="Cerrar" severity="secondary" @click="detailDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';
import SelectorNichosGrid from '@/components/cementerio/SelectorNichosGrid.vue';
import SepulturaInfoPanel from '@/components/cementerio/SepulturaInfoPanel.vue';
import MapaCementerioSomahoz from '@/components/cementerio/MapaCementerioSomahoz.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';

const zonas = ref([]);
const bloques = ref([]);

async function loadCatalogo() {
  const res = await api.get('/api/cementerio/catalogo');
  zonas.value = res.data?.zonas ?? [];
  bloques.value = res.data?.bloques ?? [];
}

const selectedId = ref(null);
const route = useRoute();

function onSelected(sepultura) {
  selectedId.value = sepultura?.id ?? null;
  if (selectedId.value) openDetail(selectedId.value);
}

const detailDialog = ref(false);
const detailSepulturaId = ref(null);

function openDetail(id) {
  const v = Number(id);
  if (!Number.isFinite(v) || v <= 0) return;
  detailSepulturaId.value = v;
  detailDialog.value = true;
}

function onNavegate(id) {
  const v = Number(id);
  if (!Number.isFinite(v) || v <= 0) return;
  detailSepulturaId.value = v;
  selectedId.value = v;
}

const panelMode = ref('difuntos');
const difuntosSinAsignar = ref([]);
const concesionesSinAsignar = ref([]);
const loadingPanel = ref(false);
const busqueda = ref('');

let fetchTimer = null;
function fetchPanelItems() {
  clearTimeout(fetchTimer);
  fetchTimer = setTimeout(_doFetch, 280);
}

async function _doFetch() {
  loadingPanel.value = true;
  try {
    const endpoint = panelMode.value === 'difuntos'
      ? '/api/cementerio/difuntos/sin-asignar'
      : '/api/cementerio/concesiones/sin-asignar';
    const res = await api.get(endpoint, {
      params: { q: busqueda.value || undefined },
    });
    const items = res.data?.items ?? [];
    if (panelMode.value === 'difuntos') {
      difuntosSinAsignar.value = items;
    } else {
      concesionesSinAsignar.value = items;
    }
  } catch {
    if (panelMode.value === 'difuntos') {
      difuntosSinAsignar.value = [];
    } else {
      concesionesSinAsignar.value = [];
    }
  } finally {
    loadingPanel.value = false;
  }
}

const activeItems = computed(() => {
  if (panelMode.value === 'difuntos') {
    return difuntosSinAsignar.value.map((d) => ({
      id: d.id,
      nombre: d.nombre_completo,
      meta: [d.fecha_fallecimiento ? `† ${d.fecha_fallecimiento}` : null, d.parentesco].filter(Boolean).join(' · '),
      raw: d,
    }));
  }

  return concesionesSinAsignar.value.map((c) => ({
    id: c.id,
    nombre: c.concesionario || `Concesión #${c.id}`,
    meta: [c.numero_expediente ? `Exp. ${c.numero_expediente}` : null, c.tipo, c.estado].filter(Boolean).join(' · '),
    raw: c,
  }));
});

function setPanelMode(mode) {
  panelMode.value = mode;
  busqueda.value = '';
  _doFetch();
}

const draggingEntity = ref(null);
const asignMsg = ref(null);
let msgTimer = null;

function onDragStart(entity) {
  draggingEntity.value = {
    ...entity,
    mode: panelMode.value,
  };
}

function onDragEnd() {
  draggingEntity.value = null;
}

async function onDropDifunto({ difunto, sepultura }) {
  const mode = difunto?.mode ?? panelMode.value;
  draggingEntity.value = null;
  clearTimeout(msgTimer);

  try {
    if (mode === 'concesiones') {
      await api.put(`/api/cementerio/concesiones/${difunto.id}/asignar-sepultura`, {
        sepultura_id: sepultura.id,
      });
      concesionesSinAsignar.value = concesionesSinAsignar.value.filter((c) => c.id !== difunto.id);
      showMsg(true, `Concesión #${difunto.id} asignada a ${sepultura.codigo}`);
    } else {
      await api.put(`/api/cementerio/difuntos/${difunto.id}/asignar-sepultura`, {
        sepultura_id: sepultura.id,
      });
      difuntosSinAsignar.value = difuntosSinAsignar.value.filter((d) => d.id !== difunto.id);
      showMsg(true, `${difunto.nombre} asignado a ${sepultura.codigo}`);
    }
    await Promise.all([loadGeo(), loadSepulturas()]);
  } catch (e) {
    showMsg(false, e?.response?.data?.message ?? 'Error al asignar.');
  }
}

function showMsg(ok, text) {
  asignMsg.value = { ok, text };
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => { asignMsg.value = null; }, 4000);
}

const LAT = 43.25445;
const LON = -4.0492;
const capas = [
  { key: 'nicho', label: 'Nichos' },
  { key: 'fosa', label: 'Fosas' },
  { key: 'columbario', label: 'Columbarios' },
  { key: 'panteon', label: 'Panteones' },
];
const capasActivas = ref(capas.map((c) => c.key));
const geoItems = ref([]);
const allSepulturas = ref([]);
const sepLoading = ref(false);
const sepSearch = ref('');

const sepFiltradas = computed(() => {
  const q = sepSearch.value.trim().toLowerCase();
  return allSepulturas.value.filter((s) => {
    const tipo = (s.tipo || '').toLowerCase();
    const capaOk = capasActivas.value.includes(tipo);
    const textOk = !q || String(s.codigo || '').toLowerCase().includes(q) || String(s.numero || '').includes(q);
    return capaOk && textOk;
  });
});

async function loadGeo() {
  const res = await api.get('/api/cementerio/sepulturas/geo', { params: { limit: 5000 } });
  geoItems.value = res.data?.items ?? [];
}

async function loadSepulturas() {
  sepLoading.value = true;
  try {
    const res = await api.get('/api/cementerio/admin/sepulturas');
    allSepulturas.value = res.data?.items ?? [];
  } finally {
    sepLoading.value = false;
  }
}

function onMapSelect(it) {
  if (it?.id) {
    selectedId.value = Number(it.id);
    openDetail(it.id);
  }
}

onMounted(async () => {
  await Promise.all([loadCatalogo(), loadGeo(), loadSepulturas()]);
  _doFetch();
});

watch(
  () => route.query?.sepultura,
  (v) => {
    const id = Number(v);
    if (Number.isFinite(id) && id > 0) selectedId.value = id;
  },
  { immediate: true }
);
</script>

<style scoped>
.mapa-wrap { display: flex; flex-direction: column; gap: 14px; padding: 12px; }
.grid-top {
  display: grid;
  grid-template-columns: minmax(380px, 1fr) 320px;
  gap: 14px;
  align-items: start;
}
@media (max-width: 1100px) { .grid-top { grid-template-columns: 1fr; } }

.asign-panel {
  background: white;
  border-radius: 14px;
  border: 1px solid rgba(23,35,31,0.10);
  box-shadow: 0 6px 18px rgba(23,35,31,0.06);
  overflow: hidden;
  position: relative;
  min-height: 300px;
}

.asign-panel__head {
  gap: 10px;
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(23,35,31,0.08);
}
.asign-tabs { display: inline-flex; border: 1px solid rgba(23,35,31,0.18); border-radius: 10px; overflow: hidden; width: fit-content; }
.asign-tab {
  border: 0;
  background: white;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
}
.asign-tab--active {
  background: rgba(17,134,82,0.12);
  color: var(--c2-primary,#118652);
}

.asign-panel__title {
  font-weight: 900;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(23,35,31,0.92);
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--c2-primary, #118652);
  color: white;
  font-size: 11px;
  font-weight: 900;
}

.asign-panel__sub { font-size: 12px; color: rgba(23,35,31,0.60); margin-top: 3px; }

.asign-panel__search { width: 100%; }
.search-input { width: 100%; height: 36px; border-radius: 10px; border: 1px solid rgba(23,35,31,0.18); padding: 0 12px; font-size: 13px; outline: none; box-sizing: border-box; }
.search-input:focus { border-color: var(--c2-primary,#118652); box-shadow: 0 0 0 3px rgba(17,134,82,0.12); }

.asign-empty { padding: 20px 16px; font-size: 13px; }
.asign-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  max-height: 520px;
  overflow-y: auto;
}

.asign-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(23,35,31,0.12);
  background: rgba(245,247,244,0.6);
  cursor: grab;
  user-select: none;
  transition: box-shadow 120ms, transform 120ms, border-color 120ms;
}
.asign-card:hover {
  border-color: var(--c2-primary,#118652);
  box-shadow: 0 4px 14px rgba(17,134,82,0.12);
}
.asign-card--dragging {
  opacity: 0.45;
  cursor: grabbing;
}
.asign-card__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(17,134,82,0.10);
  border: 1px solid rgba(17,134,82,0.18);
  display: grid;
  place-items: center;
  color: var(--c2-primary,#118652);
  flex-shrink: 0;
}
.asign-card__body { flex: 1; min-width: 0; }
.asign-card__nombre { font-weight: 700; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.asign-card__meta { font-size: 11px; }
.asign-card__drag { color: rgba(23,35,31,0.35); font-size: 13px; flex-shrink: 0; }

.muted { color: rgba(23,35,31,0.60); }

.asign-toast {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  white-space: nowrap;
  animation: fadeIn 200ms ease;
}
.asign-toast--ok { background: var(--c2-primary,#118652); color: white; }
.asign-toast--err { background: var(--c2-danger,#A61B1B); color: white; }
@keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

.mapa-row {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 12px;
}
@media (max-width: 1100px) {
  .mapa-row { grid-template-columns: 1fr; }
}

.mapa-card, .sep-panel {
  background: white;
  border-radius: 14px;
  border: 1px solid rgba(23,35,31,0.10);
  box-shadow: 0 6px 18px rgba(23,35,31,0.06);
  overflow: hidden;
}
.mapa-card__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(23,35,31,0.08);
}
.mapa-card__title {
  font-weight: 900;
}
.capas { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.capas__label { font-size: 11px; font-weight: 800; color: rgba(23,35,31,0.55); text-transform: uppercase; }
.capa-check { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; cursor: pointer; }
.capa-check input { accent-color: var(--c2-primary,#118652); }
.mapa-foot { padding: 8px 14px; border-top: 1px solid rgba(23,35,31,0.08); font-size: 12px; }

.sep-panel__head { padding: 12px; border-bottom: 1px solid rgba(23,35,31,0.08); display: grid; gap: 8px; }
.sep-panel__title { font-weight: 900; }
.sep-list { max-height: 420px; overflow-y: auto; padding: 8px; display: grid; gap: 4px; }
.sep-item {
  border: 1px solid transparent;
  background: transparent;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}
.sep-item:hover, .sep-item--active { background: rgba(17,134,82,0.08); border-color: rgba(17,134,82,0.25); }
.sep-dot { width: 8px; height: 8px; border-radius: 999px; }
.sep-dot--libre { background: var(--c2-success,#0F7A4A); }
.sep-dot--ocupada { background: var(--c2-danger,#A61B1B); }
.sep-code { font-weight: 700; font-size: 13px; }
</style>
