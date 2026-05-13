<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="header"
    :style="{ width: 'min(1000px, 96vw)' }"
    :draggable="false"
    @show="onShow"
  >
    <div class="grid-dlg">
      <div v-if="loading" class="grid-dlg__msg">Cargando sepulturas…</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <template v-else>
        <div class="grid-dlg__legend">
          <span class="legend-item"><span class="dot dot--libre" />Libre ({{ stats.libre }})</span>
          <span class="legend-item"><span class="dot dot--ocupada" />Ocupada ({{ stats.ocupada }})</span>
          <span v-if="stats.otros" class="legend-item"><span class="dot dot--otros" />Otros ({{ stats.otros }})</span>
          <span class="legend-item legend-item--muted">Clic en una celda para ver detalle</span>
        </div>

        <div
          class="grid-dlg__nichos"
          :style="{ gridTemplateColumns: `repeat(${bloque?.columnas ?? 1}, minmax(36px, 1fr))` }"
        >
          <button
            v-for="cell in celdas"
            :key="cell.key"
            type="button"
            class="gc"
            :class="`gc--${cell.estado}`"
            :title="cell.tooltip"
            :disabled="!cell.sepultura?.id"
            @click="openSepDetalle(cell.sepultura?.id)"
          >
            <span class="gc__num">{{ cell.label }}</span>
          </button>
        </div>
      </template>
    </div>

    <Dialog v-model:visible="sepDialog" modal header="Detalle de sepultura" :style="{ width: 'min(1400px, 96vw)' }">
      <SepulturaInfoPanel :sepulturaId="sepId" @navigate="id => sepId = id" @changed="onSepChanged" />
      <template #footer>
        <Button label="Cerrar" severity="secondary" @click="sepDialog = false" />
      </template>
    </Dialog>

    <template #footer>
      <Button label="Cerrar" severity="secondary" @click="visible = false" />
    </template>
  </Dialog>
</template>

<script setup>
import { computed, ref } from 'vue';
import api from '@/services/api';
import { toApiErrorMessage } from '@/components/cementerio/admin/crudUi';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import SepulturaInfoPanel from '@/components/cementerio/SepulturaInfoPanel.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  bloque: { type: Object, default: null }, // { id, nombre, codigo, filas, columnas }
});
const emit = defineEmits(['update:modelValue']);

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const loading = ref(false);
const error = ref(null);
const sepulturas = ref([]);

const sepDialog = ref(false);
const sepId = ref(null);

const header = computed(() => {
  const b = props.bloque;
  if (!b) return 'Cuadrícula';
  return `${b.nombre}  ·  ${b.filas}×${b.columnas} (${b.codigo})`;
});

const index = computed(() => {
  const map = new Map();
  for (const s of sepulturas.value) {
    if (s?.fila != null && s?.columna != null) map.set(`${s.fila}-${s.columna}`, s);
  }
  return map;
});

const celdas = computed(() => {
  const b = props.bloque;
  if (!b) return [];
  const out = [];
  for (let fila = 1; fila <= Number(b.filas); fila++) {
    for (let col = 1; col <= Number(b.columnas); col++) {
      const key = `${fila}-${col}`;
      const sep = index.value.get(key) ?? null;
      const estado = (sep?.estado ?? 'libre').toLowerCase();
      const nombre = sep?.tooltip_nombre
        ?? sep?.difunto_titular?.nombre_completo
        ?? sep?.difuntoTitular?.nombre_completo
        ?? null;
      out.push({
        key,
        sepultura: sep,
        label: sep?.numero ?? '',
        estado,
        tooltip: estado !== 'libre' ? (nombre ? `${estado} · ${nombre}` : estado) : 'Libre',
      });
    }
  }
  return out;
});

const stats = computed(() => {
  const s = { libre: 0, ocupada: 0, otros: 0 };
  for (const c of celdas.value) {
    if (c.estado === 'libre') s.libre++;
    else if (c.estado === 'ocupada') s.ocupada++;
    else s.otros++;
  }
  return s;
});

async function onShow() {
  const id = Number(props.bloque?.id);
  if (!Number.isFinite(id) || id <= 0) return;
  loading.value = true;
  error.value = null;
  sepulturas.value = [];
  try {
    const res = await api.get(`/api/cementerio/bloques/${id}/sepulturas`);
    sepulturas.value = res.data?.items ?? res.data?.data ?? [];
  } catch (e) {
    error.value = toApiErrorMessage(e, 'No se pudieron cargar las sepulturas.');
  } finally {
    loading.value = false;
  }
}

function openSepDetalle(id) {
  if (!id) return;
  sepId.value = id;
  sepDialog.value = true;
}

function onSepChanged({ id, estado, nombre }) {
  const sep = sepulturas.value.find(s => s.id === id);
  if (sep) {
    sep.estado = estado;
    sep.tooltip_nombre = nombre;
  }
}
</script>

<style scoped>
.error { color: var(--c2-danger, #A61B1B); font-size: 13px; }
.grid-dlg { display: grid; gap: 12px; }
.grid-dlg__msg { color: #888; text-align: center; padding: 20px; }

.grid-dlg__legend {
  display: flex; gap: 14px; flex-wrap: wrap; align-items: center;
  padding: 8px 12px; border-radius: 10px;
  background: rgba(23,35,31,.03); border: 1px solid rgba(23,35,31,.07);
}
.legend-item { display: inline-flex; gap: 7px; align-items: center; font-size: 12px; font-weight: 600; color: rgba(23,35,31,.72); }
.legend-item--muted { color: rgba(23,35,31,.40); font-weight: 400; margin-left: auto; }
.dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; flex-shrink: 0; }
.dot--libre { background: var(--c2-success, #0F7A4A); }
.dot--ocupada { background: var(--c2-danger, #A61B1B); }
.dot--otros { background: #C9A227; }

.grid-dlg__nichos {
  display: grid; gap: 5px;
  padding: 10px; border-radius: 14px;
  border: 1px solid rgba(23,35,31,.10);
  background: rgba(245,247,244,.65);
  overflow: auto; max-height: 560px;
}
.gc {
  border: none; border-radius: 8px; min-height: 36px; padding: 2px;
  display: grid; place-items: center; cursor: pointer;
  transition: background-color 400ms ease, transform 80ms, box-shadow 80ms, opacity 80ms;
}
.gc:disabled { cursor: default; opacity: .75; }
.gc:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(23,35,31,.18); }
.gc__num { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.92); text-shadow: 0 1px 2px rgba(0,0,0,.28); line-height: 1; }
.gc--libre   { background: var(--c2-success, #0F7A4A); }
.gc--ocupada { background: var(--c2-danger, #A61B1B); }
.gc--reservada { background: #C9A227; }
.gc--clausurada { background: #9a9a9a; }
</style>
