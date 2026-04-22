<template>
  <div class="c2-card">
    <div class="c2-card__header">
      <div class="c2-card__title">Asignación de unidad</div>
      <div class="c2-card__subtitle">
        Selecciona una zona, un bloque y luego haz clic en un nicho libre.
      </div>
    </div>

    <div class="c2-card__body">
      <div class="controls">
        <div class="field">
          <label class="label">Zona</label>
          <select v-model="zonaId" class="select">
            <option :value="null">— Selecciona —</option>
            <option v-for="z in zonas" :key="z.id" :value="z.id">
              {{ z.nombre }}
            </option>
          </select>
        </div>

        <div class="field">
          <label class="label">Bloque</label>
          <select v-model="bloqueId" class="select" :disabled="!zonaId">
            <option :value="null">— Selecciona —</option>
            <option v-for="b in bloquesFiltrados" :key="b.id" :value="b.id">
              {{ b.nombre }} ({{ b.codigo }}) — {{ b.filas }}×{{ b.columnas }}
            </option>
          </select>
        </div>

        <div class="legend">
          <div class="legend__item">
            <span class="dot dot--libre" /> Libre
          </div>
          <div class="legend__item">
            <span class="dot dot--ocupada" /> Ocupada
          </div>
          <div class="legend__item">
            <span class="dot dot--reservada" /> Reservada
          </div>
          <div class="legend__item">
            <span class="dot dot--clausurada" /> Clausurada
          </div>
        </div>
      </div>

      <div v-if="!bloqueSeleccionado" class="empty">
        Elige un bloque para ver la cuadrícula.
      </div>

      <div v-else class="grid-wrap">
        <div class="grid-meta">
          <div class="grid-meta__left">
            <strong>{{ bloqueSeleccionado.nombre }}</strong>
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
            ]"
            :disabled="!cell.seleccionable"
            :title="cell.tooltip"
            @click="onSelect(cell)"
          >
            <span class="celda__pos">{{ cell.fila }}-{{ cell.columna }}</span>
          </button>
        </div>

        <div v-if="seleccionActual" class="selection">
          <div class="selection__title">Unidad seleccionada</div>
          <div class="selection__body">
            <div>
              <strong>Bloque</strong>:
              {{ bloqueSeleccionado.codigo }} · F{{ seleccionActual.fila }} · C{{ seleccionActual.columna }}
            </div>
            <div class="muted">
              Código: {{ seleccionActual.codigo ?? '—' }}
            </div>
          </div>
        </div>

        <div v-if="loading" class="loading">
          Cargando unidades…
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

const props = defineProps({
  zonas: { type: Array, required: true },
  bloques: { type: Array, required: true },
  /**
   * Si se pasa, el componente funcionará en modo “controlado”.
   * En caso contrario, emitirá el objeto seleccionado igualmente.
   */
  selectedSepulturaId: { type: Number, default: null },
  /**
   * Endpoint base para cargar sepulturas por bloque.
   * Debe responder un JSON con { data: [...] } o directamente [...].
   */
  endpointSepulturasByBloque: { type: String, default: '/api/cementerio/bloques' },
  /**
   * Modo de selección:
   * - 'libres': solo permite seleccionar unidades libres (modo wizard “nuevo caso”).
   * - 'todas': permite seleccionar cualquier unidad existente para ver detalle.
   */
  selectionMode: { type: String, default: 'libres' },
});

const emit = defineEmits(['update:selectedSepulturaId', 'selected']);

const zonaId = ref(null);
const bloqueId = ref(null);

const loading = ref(false);
const error = ref(null);

const sepulturas = ref([]);

const bloquesFiltrados = computed(() =>
  props.bloques.filter((b) => (zonaId.value ? b.zona_id === zonaId.value : true))
);

const bloqueSeleccionado = computed(() =>
  props.bloques.find((b) => b.id === bloqueId.value) ?? null
);

async function cargarSepulturasDelBloque(id) {
  loading.value = true;
  error.value = null;
  sepulturas.value = [];
  try {
    const res = await api.get(`${props.endpointSepulturasByBloque}/${id}/sepulturas`);
    const payload = res?.data?.data ?? res?.data ?? [];
    sepulturas.value = Array.isArray(payload) ? payload : [];
  } catch (e) {
    error.value = e?.response?.data?.message ?? 'No se pudieron cargar las unidades del bloque.';
  } finally {
    loading.value = false;
  }
}

watch(bloqueId, async (newId) => {
  if (!newId) return;
  await cargarSepulturasDelBloque(newId);
});

watch(zonaId, () => {
  bloqueId.value = null;
  sepulturas.value = [];
  error.value = null;
});

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
      const difunto = sepultura?.difunto_titular?.nombre_completo
        ?? sepultura?.difuntoTitular?.nombre_completo
        ?? sepultura?.difunto_titular_nombre
        ?? null;

      const tooltip =
        estado === 'ocupada'
          ? difunto
            ? `Ocupada: ${difunto}`
            : 'Ocupada'
          : estado === 'reservada'
            ? 'Reservada'
            : estado === 'clausurada'
              ? 'Clausurada'
              : 'Libre';

      const seleccionable = props.selectionMode === 'todas'
        ? !!sepultura?.id
        : (estado === 'libre' && !!sepultura?.id);

      out.push({
        key,
        fila,
        columna,
        sepultura,
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

function onSelect(cell) {
  if (!cell.seleccionable) return;
  emit('update:selectedSepulturaId', cell.sepultura.id);
  emit('selected', cell.sepultura);
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
  padding: 16px 18px 10px;
  border-bottom: 1px solid rgba(23, 35, 31, 0.08);
}

.c2-card__title {
  font-weight: 700;
  color: var(--c2-text, #17231F);
}

.c2-card__subtitle {
  margin-top: 4px;
  color: rgba(23, 35, 31, 0.65);
  font-size: 13px;
}

.c2-card__body {
  padding: 14px 18px 18px;
}

.controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 14px;
  align-items: end;
}

.field {
  display: grid;
  gap: 6px;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(23, 35, 31, 0.75);
}

.select {
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(23, 35, 31, 0.18);
  padding: 0 10px;
  outline: none;
}

.select:focus {
  border-color: var(--c2-primary, #118652);
  box-shadow: 0 0 0 4px rgba(17, 134, 82, 0.12);
}

.legend {
  grid-column: 1 / -1;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  padding-top: 4px;
}

.legend__item {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: rgba(23, 35, 31, 0.75);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.dot--libre { background: var(--c2-success, #0F7A4A); }
.dot--ocupada { background: var(--c2-danger, #A61B1B); }
.dot--reservada { background: var(--c2-secondary, #C9A227); }
.dot--clausurada { background: rgba(23, 35, 31, 0.35); }

.empty {
  margin-top: 14px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(18, 102, 163, 0.06);
  color: rgba(23, 35, 31, 0.75);
  font-size: 13px;
}

.grid-wrap {
  margin-top: 14px;
}

.grid-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  margin-bottom: 10px;
}

.muted {
  color: rgba(23, 35, 31, 0.60);
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
.celda--reservada { background: var(--c2-secondary, #C9A227); }
.celda--clausurada { background: rgba(23, 35, 31, 0.40); }

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

@media (max-width: 900px) {
  .controls {
    grid-template-columns: 1fr;
  }
}
</style>

