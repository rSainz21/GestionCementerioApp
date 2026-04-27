<template>
  <div class="mapa-wrap">

    <!-- Fila superior: nichos + lista difuntos -->
    <div class="grid-top">
      <SelectorNichosGrid
        :zonas="zonas"
        :bloques="bloques"
        selectionMode="todas"
        :selectedSepulturaId="selectedId"
        :draggingDifunto="draggingDifunto"
        @update:selectedSepulturaId="(v) => (selectedId = v)"
        @selected="onSelected"
        @drop-difunto="onDropDifunto"
      />

      <!-- Panel: difuntos sin asignar ──────────────────────────────────── -->
    <div class="asign-panel">
      <div class="asign-panel__head">
        <div>
          <div class="asign-panel__title">
            <i class="pi pi-users" />
            Difuntos sin asignar
            <span v-if="sinAsignar.length" class="badge">{{ sinAsignar.length }}</span>
          </div>
          <div class="asign-panel__sub">
            Arrastra un difunto sobre un nicho del mapa para asignarlo.
          </div>
        </div>
        <div class="asign-panel__search">
          <input
            v-model="busqueda"
            type="text"
            class="search-input"
            placeholder="Buscar por nombre…"
            @input="fetchSinAsignar"
          />
        </div>
      </div>

      <div v-if="loadingSin" class="asign-empty muted">Cargando…</div>
      <div v-else-if="!sinAsignar.length" class="asign-empty muted">
        {{ busqueda ? 'Sin resultados.' : 'Todos los difuntos están asignados a un nicho.' }}
      </div>

      <div v-else class="asign-list">
        <div
          v-for="d in sinAsignar"
          :key="d.id"
          class="asign-card"
          draggable="true"
          :class="{ 'asign-card--dragging': draggingDifunto?.id === d.id }"
          @dragstart="onDragStart(d)"
          @dragend="onDragEnd"
        >
          <div class="asign-card__icon">
            <i class="pi pi-user" />
          </div>
          <div class="asign-card__body">
            <div class="asign-card__nombre">{{ d.nombre_completo }}</div>
            <div class="asign-card__meta muted">
              <span v-if="d.fecha_fallecimiento">† {{ d.fecha_fallecimiento }}</span>
              <span v-if="d.parentesco"> · {{ d.parentesco }}</span>
            </div>
          </div>
          <div class="asign-card__drag">
            <i class="pi pi-arrows-alt" />
          </div>
        </div>
      </div>

      <!-- Toast de asignación -->
      <div v-if="asignMsg" :class="['asign-toast', asignMsg.ok ? 'asign-toast--ok' : 'asign-toast--err']">
        <i :class="asignMsg.ok ? 'pi pi-check-circle' : 'pi pi-times-circle'" />
        {{ asignMsg.text }}
      </div>
    </div>
    </div><!-- /grid-top -->

    <!-- Fila inferior: mapa GPS -->
    <div class="mapa-gps">
      <div class="mapa-gps__inner">
        <MapaGpsSomahoz />
        <div class="mapa-gps__btn">
          <button class="btn" type="button" :disabled="!selectedId" @click="openDetail(selectedId)">
            <i class="pi pi-eye" /> Ver expediente
          </button>
        </div>
      </div>
    </div>

    <!-- Dialog detalle ───────────────────────────────────────────────────── -->
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
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';
import SelectorNichosGrid from '@/components/cementerio/SelectorNichosGrid.vue';
import SepulturaInfoPanel from '@/components/cementerio/SepulturaInfoPanel.vue';
import MapaGpsSomahoz from '@/components/cementerio/MapaGpsSomahoz.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';

// ── Catálogo ─────────────────────────────────────────────────────────────────
const zonas = ref([]);
const bloques = ref([]);

async function loadCatalogo() {
  const res = await api.get('/api/cementerio/catalogo');
  zonas.value = res.data?.zonas ?? [];
  bloques.value = res.data?.bloques ?? [];
}

// ── Selección en grid ────────────────────────────────────────────────────────
const selectedId = ref(null);
const route = useRoute();

function onSelected(sepultura) {
  selectedId.value = sepultura?.id ?? null;
  if (selectedId.value) openDetail(selectedId.value);
}

// ── Dialog detalle ────────────────────────────────────────────────────────────
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

// ── Difuntos sin asignar ──────────────────────────────────────────────────────
const sinAsignar = ref([]);
const loadingSin = ref(false);
const busqueda = ref('');

let fetchTimer = null;
function fetchSinAsignar() {
  clearTimeout(fetchTimer);
  fetchTimer = setTimeout(_doFetch, 280);
}

async function _doFetch() {
  loadingSin.value = true;
  try {
    const res = await api.get('/api/cementerio/difuntos/sin-asignar', {
      params: { q: busqueda.value || undefined },
    });
    sinAsignar.value = res.data?.items ?? [];
  } catch {
    sinAsignar.value = [];
  } finally {
    loadingSin.value = false;
  }
}

// ── Drag & drop ───────────────────────────────────────────────────────────────
const draggingDifunto = ref(null);
const asignMsg = ref(null);
let msgTimer = null;

function onDragStart(difunto) {
  draggingDifunto.value = difunto;
}

function onDragEnd() {
  draggingDifunto.value = null;
}

async function onDropDifunto({ difunto, sepultura }) {
  draggingDifunto.value = null;
  clearTimeout(msgTimer);

  try {
    await api.put(`/api/cementerio/difuntos/${difunto.id}/asignar-sepultura`, {
      sepultura_id: sepultura.id,
    });

    // Quitar de la lista sin asignar
    sinAsignar.value = sinAsignar.value.filter((d) => d.id !== difunto.id);

    // Refrescar grid reponiendo el bloque activo (la sepultura cambia a ocupada)
    // SelectorNichosGrid lo gestionará en su próximo cambio de bloque o manualmente.
    // Forzamos un reset del selectedId para que el grid recargue el bloque.
    const prevSelected = selectedId.value;
    selectedId.value = null;
    await loadCatalogo();
    selectedId.value = prevSelected;

    showMsg(true, `${difunto.nombre_completo} asignado a ${sepultura.codigo}`);
  } catch (e) {
    showMsg(false, e?.response?.data?.message ?? 'Error al asignar el difunto.');
  }
}

function showMsg(ok, text) {
  asignMsg.value = { ok, text };
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => { asignMsg.value = null; }, 4000);
}

// ── Init ──────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await loadCatalogo();
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

/* Fila superior: grid nichos + panel difuntos */
.grid-top {
  display: grid;
  grid-template-columns: minmax(380px, 1fr) 320px;
  gap: 14px;
  align-items: start;
}
@media (max-width: 1100px) { .grid-top { grid-template-columns: 1fr; } }

/* Fila inferior: mapa GPS */
.mapa-gps { }
.mapa-gps__inner { position: relative; }
.mapa-gps__btn { position: absolute; top: 12px; right: 12px; }

.btn { height: 36px; padding: 0 12px; border-radius: 12px; border: 1px solid rgba(23,35,31,0.14); background: rgba(255,255,255,0.92); cursor: pointer; font-weight: 900; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 10px 24px rgba(23,35,31,0.12); backdrop-filter: blur(6px); }
.btn:hover { background: white; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }

/* Panel sin asignar */
.asign-panel {
  background: white;
  border-radius: 14px;
  border: 1px solid rgba(23,35,31,0.10);
  box-shadow: 0 6px 18px rgba(23,35,31,0.06);
  overflow: hidden;
  position: relative;
}

.asign-panel__head {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(23,35,31,0.08);
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

/* Lista de difuntos */
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

/* Toast */
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
</style>
