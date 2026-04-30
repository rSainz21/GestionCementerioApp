<template>
  <div class="c2-card">
    <div class="c2-card__header">
      <div class="c2-card__title">Asignación de sepultura</div>
      <div class="c2-card__subtitle">
        Elige zona y bloque; después haz clic en una sepultura libre o arrastra un registro desde el panel derecho.
      </div>
    </div>

    <div class="c2-card__body">
      <section class="picker">
        <div class="picker__step">
          <span class="picker__badge" aria-hidden="true">1</span>
          <div class="picker__content">
            <div class="picker__head">
              <span class="picker__label">Zona del cementerio</span>
              <span v-if="zonas.length" class="picker__hint">{{ zonas.length }} disponibles</span>
            </div>
            <div class="zone-segment" role="tablist" aria-label="Seleccionar zona">
              <button
                v-for="z in zonas"
                :key="z.id"
                type="button"
                role="tab"
                class="zone-segment__btn"
                :class="{ 'zone-segment__btn--active': zonaId === z.id }"
                :aria-selected="zonaId === z.id"
                @click="zonaId = z.id"
              >
                <span class="zone-segment__text">{{ displayText(z.nombre) }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="picker__step">
          <span class="picker__badge" aria-hidden="true">2</span>
          <div class="picker__content">
            <div class="picker__head">
              <span class="picker__label">Bloque</span>
              <span class="picker__hint">
                <template v-if="zonaId && bloquesFiltrados.length">
                  {{ bloquesFiltrados.length }} en esta zona
                </template>
                <template v-else-if="!zonaId">Selecciona una zona arriba</template>
                <template v-else>Sin bloques</template>
              </span>
            </div>

            <div v-if="zonaId && bloquesFiltrados.length" class="block-grid">
              <button
                v-for="b in bloquesFiltrados"
                :key="b.id"
                type="button"
                class="block-card"
                :class="{ 'block-card--active': bloqueId === b.id }"
                @click="bloqueId = b.id"
              >
                <span class="block-card__code">{{ b.codigo }}</span>
                <span class="block-card__name">{{ displayText(b.nombre) }}</span>
                <span class="block-card__dims">{{ b.filas }}×{{ b.columnas }}</span>
              </button>
            </div>
            <div v-else-if="zonaId" class="picker__empty muted">
              No hay bloques en esta zona.
            </div>
            <div v-else class="picker__empty muted">
              Primero elige una zona para listar sus bloques.
            </div>
          </div>
        </div>

        <div class="picker__toolbar">
          <div class="legend">
            <span class="legend__item"><span class="dot dot--libre" /> Libre</span>
            <span class="legend__item"><span class="dot dot--ocupada" /> Ocupada</span>
          </div>
        </div>
      </section>

      <div v-if="!bloqueSeleccionado" class="empty">
        Elige un bloque para ver la cuadrícula de sepulturas.
      </div>

      <div v-else class="grid-wrap">
        <div class="grid-meta">
          <div class="grid-meta__left">
            <strong>{{ displayText(bloqueSeleccionado.nombre) }}</strong>
            <span class="muted">({{ bloqueSeleccionado.codigo }})</span>
          </div>
          <div class="grid-meta__right muted">
            {{ bloqueSeleccionado.filas }} filas · {{ bloqueSeleccionado.columnas }} columnas
          </div>
        </div>

        <div
          class="nichos-grid"
          :style="{
            gridTemplateColumns: `repeat(${bloqueSeleccionado.columnas}, minmax(30px, 1fr))`,
          }"
        >
          <button
            v-for="cell in celdas"
            :key="cell.key"
            type="button"
            class="celda"
            :class="[
              `celda--${cell.estado}`,
              selectedSepulturaId === cell.sepultura?.id ? 'celda--selected' : null,
              draggingDifunto && cell.sepultura?.id ? 'celda--droppable' : null,
              dragOverCellKey === cell.key && draggingDifunto ? 'celda--drag-over' : null,
            ]"
            :disabled="!cell.seleccionable && !draggingDifunto"
            :title="cell.tooltip"
            @click="onSelect(cell)"
            @dragover.prevent="onDragOver(cell)"
            @dragleave="onDragLeave(cell)"
            @drop.prevent="onDrop(cell)"
          >
            <span class="celda__pos">{{ cell.label }}</span>
          </button>
        </div>

        <div v-if="seleccionActual" class="selection">
          <div class="selection__title">Sepultura seleccionada</div>
          <div class="selection__body">
            <div>
              <strong>Nicho</strong>:
              {{ seleccionActual.numero ?? '—' }}
            </div>
            <div class="muted">
              Código: {{ seleccionActual.codigo ?? '—' }}
            </div>
          </div>
        </div>

        <div v-if="loading" class="loading">
          Cargando sepulturas…
        </div>
        <div v-else-if="error" class="error">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import api from '@/services/api';
import { fixDisplayText } from '@/utils/textEncoding';

const props = defineProps({
  zonas: { type: Array, required: true },
  bloques: { type: Array, required: true },
  selectedSepulturaId: { type: Number, default: null },
  endpointSepulturasByBloque: { type: String, default: '/api/cementerio/bloques' },
  selectionMode: { type: String, default: 'libres' },
  initialZonaId: { type: Number, default: null },
  initialBloqueId: { type: Number, default: null },
  draggingDifunto: { type: Object, default: null },
});

const emit = defineEmits(['update:selectedSepulturaId', 'selected', 'drop-difunto']);

function displayText(v) {
  return fixDisplayText(v);
}

const zonaId = ref(null);
const bloqueId = ref(null);

const loading = ref(false);
const error = ref(null);

const sepulturas = ref([]);
let triedBloques = new Set();

const bloquesFiltrados = computed(() => {
  const list = props.bloques.filter((b) => (zonaId.value ? b.zona_id === zonaId.value : false));
  return [...list].sort((a, b) => {
    const ca = String(a.codigo || '').localeCompare(String(b.codigo || ''), undefined, { numeric: true });
    if (ca !== 0) return ca;
    return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
  });
});

const bloqueSeleccionado = computed(() =>
  props.bloques.find((b) => b.id === bloqueId.value) ?? null
);

async function cargarSepulturasDelBloque(id) {
  loading.value = true;
  error.value = null;
  sepulturas.value = [];
  try {
    const res = await api.get(`${props.endpointSepulturasByBloque}/${id}/sepulturas`);
    const payload = res?.data?.items ?? res?.data?.data ?? res?.data ?? [];
    sepulturas.value = Array.isArray(payload) ? payload : [];
  } catch (e) {
    error.value = e?.response?.data?.message ?? 'No se pudieron cargar las unidades del bloque.';
  } finally {
    loading.value = false;
  }
}

watch(bloqueId, async (newId) => {
  if (!newId) return;
  triedBloques.add(newId);
  await cargarSepulturasDelBloque(newId);

  // Si estamos en modo "libres" y este bloque no tiene huecos, probar el siguiente bloque de la zona.
  if (props.selectionMode === 'libres' && zonaId.value) {
    const hasLibre = sepulturas.value.some((s) => String(s?.estado ?? 'libre').toLowerCase() === 'libre');
    if (!hasLibre) {
      const next = bloquesFiltrados.value.find((b) => !triedBloques.has(b.id));
      if (next && next.id !== newId) {
        bloqueId.value = next.id;
      }
    }
  }
});

watch(zonaId, () => {
  bloqueId.value = null;
  sepulturas.value = [];
  error.value = null;
  triedBloques = new Set();

  // Auto-seleccionar primer bloque de la zona para no obligar a hacer 2 clics (y permitir auto-búsqueda de libres).
  const first = bloquesFiltrados.value[0] ?? null;
  if (first?.id) bloqueId.value = first.id;
});

watch(
  () => props.zonas,
  (list) => {
    if (!Array.isArray(list) || !list.length) return;
    if (props.initialZonaId != null) return;
    if (zonaId.value == null) {
      zonaId.value = list[0].id;
    }
  },
  { immediate: true }
);

watch(
  () => [props.initialZonaId, props.initialBloqueId],
  ([z, b]) => {
    if (z != null && zonaId.value !== z) zonaId.value = z;
    if (b != null && bloqueId.value !== b) bloqueId.value = b;
  },
  { immediate: true }
);

const sepulturaIndex = computed(() => {
  const map = new Map();
  for (const s of sepulturas.value) {
    if (s?.fila == null || s?.columna == null) continue;
    map.set(`${s.fila}-${s.columna}`, s);
  }
  return map;
});

const celdas = computed(() => {
  const b = bloqueSeleccionado.value;
  if (!b) return [];

  const out = [];
  for (let fila = 1; fila <= Number(b.filas); fila++) {
    for (let columna = 1; columna <= Number(b.columnas); columna++) {
      const key = `${fila}-${columna}`;
      const sepultura = sepulturaIndex.value.get(key) ?? null;

      const estado = (sepultura?.estado ?? 'libre').toLowerCase();
      const nombre = sepultura?.tooltip_nombre
        ?? sepultura?.difunto_titular?.nombre_completo
        ?? sepultura?.difuntoTitular?.nombre_completo
        ?? sepultura?.concesion?.concesionario
        ?? null;

      const tooltip =
        estado !== 'libre'
          ? (nombre ? `Ocupada · ${nombre}` : 'Ocupada')
          : 'Libre';

      const seleccionable = props.selectionMode === 'todas'
        ? !!sepultura?.id
        : (estado === 'libre' && !!sepultura?.id);

      out.push({
        key,
        fila,
        columna,
        sepultura,
        label: sepultura?.numero ?? '',
        estado,
        tooltip,
        seleccionable,
      });
    }
  }
  return out;
});

const seleccionActual = computed(() => {
  if (!props.selectedSepulturaId) return null;
  return sepulturas.value.find((s) => s.id === props.selectedSepulturaId) ?? null;
});

const dragOverCellKey = ref(null);

function onSelect(cell) {
  if (!cell.seleccionable) return;
  emit('update:selectedSepulturaId', cell.sepultura.id);
  emit('selected', cell.sepultura);
}

function onDragOver(cell) {
  if (!props.draggingDifunto) return;
  if (!cell.sepultura?.id) return;
  dragOverCellKey.value = cell.key;
}

function onDragLeave(cell) {
  if (dragOverCellKey.value === cell.key) dragOverCellKey.value = null;
}

function onDrop(cell) {
  dragOverCellKey.value = null;
  if (!props.draggingDifunto || !cell.sepultura?.id) return;
  emit('drop-difunto', { difunto: props.draggingDifunto, sepultura: cell.sepultura });
}
</script>

<style scoped>
.c2-card {
  background: white;
  border-radius: 14px;
  border: 1px solid rgba(23, 35, 31, 0.10);
  box-shadow: 0 6px 18px rgba(23, 35, 31, 0.06);
}

.c2-card__header {
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(23, 35, 31, 0.08);
}

.c2-card__title {
  font-weight: 800;
  font-size: 15px;
  color: var(--c2-text, #17231F);
}

.c2-card__subtitle {
  margin-top: 6px;
  color: rgba(23, 35, 31, 0.62);
  font-size: 13px;
  line-height: 1.45;
}

.c2-card__body {
  padding: 16px 18px 18px;
}

/* ── Selector zona / bloque ─────────────────────────────────────────────── */
.picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.picker__step {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 12px;
  align-items: start;
}

.picker__badge {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(145deg, rgba(17, 134, 82, 0.18), rgba(17, 134, 82, 0.08));
  border: 1px solid rgba(17, 134, 82, 0.35);
  color: var(--c2-primary, #118652);
  font-weight: 900;
  font-size: 14px;
  display: grid;
  place-items: center;
  margin-top: 22px;
}

.picker__content {
  min-width: 0;
}

.picker__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.picker__label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(23, 35, 31, 0.55);
}

.picker__hint {
  font-size: 11px;
  color: rgba(23, 35, 31, 0.45);
  white-space: nowrap;
}

.zone-segment {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  padding: 4px;
  border-radius: 12px;
  background: rgba(23, 35, 31, 0.05);
  border: 1px solid rgba(23, 35, 31, 0.08);
}

.zone-segment__btn {
  flex: 1 1 auto;
  min-width: min(140px, 100%);
  border: 0;
  border-radius: 9px;
  padding: 10px 14px;
  background: transparent;
  color: rgba(23, 35, 31, 0.78);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.zone-segment__btn:hover {
  background: rgba(255, 255, 255, 0.65);
}

.zone-segment__btn--active {
  background: white;
  color: var(--c2-primary, #118652);
  box-shadow: 0 2px 8px rgba(23, 35, 31, 0.08);
}

.zone-segment__text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.block-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 10px;
  max-height: 220px;
  overflow-y: auto;
  padding: 2px 4px 6px 2px;
}

.block-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  min-height: 76px;
  padding: 10px 10px 8px;
  border-radius: 12px;
  border: 1px solid rgba(23, 35, 31, 0.12);
  background: rgba(245, 247, 244, 0.85);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease;
}

.block-card:hover {
  border-color: rgba(17, 134, 82, 0.45);
  box-shadow: 0 4px 14px rgba(17, 134, 82, 0.12);
  transform: translateY(-1px);
}

.block-card--active {
  border-color: var(--c2-primary, #118652);
  background: rgba(17, 134, 82, 0.1);
  box-shadow: 0 0 0 2px rgba(17, 134, 82, 0.2);
}

.block-card__code {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(23, 35, 31, 0.5);
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(23, 35, 31, 0.08);
  padding: 2px 6px;
  border-radius: 6px;
}

.block-card__name {
  font-size: 12px;
  font-weight: 700;
  color: rgba(23, 35, 31, 0.92);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.block-card__dims {
  margin-top: auto;
  font-size: 10px;
  font-weight: 700;
  color: var(--c2-primary, #118652);
  opacity: 0.9;
}

.picker__toolbar {
  display: flex;
  justify-content: flex-end;
  padding-top: 2px;
}

.picker__empty {
  padding: 14px 12px;
  font-size: 13px;
  border-radius: 12px;
  background: rgba(23, 35, 31, 0.04);
  border: 1px dashed rgba(23, 35, 31, 0.12);
}

.legend {
  display: inline-flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(23, 35, 31, 0.03);
  border: 1px solid rgba(23, 35, 31, 0.06);
}

.legend__item {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: rgba(23, 35, 31, 0.72);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
  flex-shrink: 0;
}

.dot--libre { background: var(--c2-success, #0F7A4A); }
.dot--ocupada { background: var(--c2-danger, #A61B1B); }

.muted {
  color: rgba(23, 35, 31, 0.60);
}

.empty {
  margin-top: 16px;
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(18, 102, 163, 0.06);
  border: 1px solid rgba(18, 102, 163, 0.12);
  color: rgba(23, 35, 31, 0.78);
  font-size: 13px;
  text-align: center;
}

.grid-wrap {
  margin-top: 16px;
}

.grid-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  margin-bottom: 10px;
}

.nichos-grid {
  display: grid;
  gap: 6px;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid rgba(23, 35, 31, 0.10);
  background: rgba(245, 247, 244, 0.65);
  overflow: auto;
  max-height: 520px;
}

.celda {
  border: 1px solid rgba(23, 35, 31, 0.10);
  border-radius: 10px;
  min-height: 38px;
  padding: 0;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform 80ms ease, box-shadow 80ms ease, opacity 80ms ease;
}

.celda:disabled {
  cursor: not-allowed;
  opacity: 0.78;
}

.celda:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(23, 35, 31, 0.12);
}

.celda__pos {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 2px rgba(0,0,0,0.25);
}

.celda--libre { background: var(--c2-success, #0F7A4A); }
.celda--ocupada { background: var(--c2-danger, #A61B1B); }

.celda--droppable { cursor: copy; }
.celda--drag-over {
  outline: 3px solid #fff !important;
  outline-offset: 2px;
  transform: scale(1.12) translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.35);
  z-index: 10;
  position: relative;
}

.celda--selected {
  outline: 3px solid rgba(18, 102, 163, 0.55);
  outline-offset: 2px;
}

.selection {
  margin-top: 12px;
  border-radius: 12px;
  border: 1px solid rgba(23, 35, 31, 0.10);
  background: white;
}

.selection__title {
  padding: 10px 12px;
  font-weight: 700;
  border-bottom: 1px solid rgba(23, 35, 31, 0.08);
}

.selection__body {
  padding: 12px;
  display: grid;
  gap: 6px;
  font-size: 13px;
}

.loading, .error {
  margin-top: 10px;
  font-size: 13px;
}

.error {
  color: var(--c2-danger, #A61B1B);
}

@media (max-width: 640px) {
  .picker__step {
    grid-template-columns: 1fr;
  }
  .picker__badge {
    margin-top: 0;
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
}
</style>
