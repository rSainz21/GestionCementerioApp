<template>
  <Dialog v-model:visible="visible" modal header="Crear bloque" :style="{ width: '680px' }">
    <div class="form">
      <div class="hint">
        Define la disposición y previsualízala antes de guardar.
      </div>

      <div class="grid2">
        <div class="field">
          <label>Zona</label>
          <Dropdown v-model="form.zona_id" :options="zonas" optionLabel="nombre" optionValue="id" placeholder="Selecciona…" />
          <div class="zona-pill-row" v-if="zonasPills.length">
            <button
              v-for="z in zonasPills"
              :key="z.id"
              type="button"
              class="zona-pill"
              :class="form.zona_id === z.id ? 'zona-pill--active' : ''"
              @click="form.zona_id = z.id"
            >
              {{ z.codigo }}
            </button>
          </div>
        </div>

        <div class="field">
          <label>Código</label>
          <InputText v-model="form.codigo" placeholder="B-C" />
        </div>
      </div>

      <div class="grid2">
        <div class="field">
          <label>Nombre</label>
          <InputText v-model="form.nombre" placeholder="Ampliación 2020" />
        </div>

        <div class="field">
          <label>Tipo</label>
          <Dropdown v-model="form.tipo" :options="tipos" placeholder="Selecciona…" />
        </div>
      </div>

      <div class="dimensiones">
        <div class="dimensiones__title">Dimensiones</div>
        <div class="dimensiones__grid">
          <div class="dim-box">
            <div class="dim-box__label">Filas</div>
            <div class="stepper">
              <Button icon="pi pi-minus" severity="secondary" text class="stepper__btn" @click="dec('filas')" />
              <div class="stepper__value">{{ form.filas }}</div>
              <Button icon="pi pi-plus" severity="secondary" text class="stepper__btn" @click="inc('filas')" />
            </div>
          </div>

          <div class="dim-box">
            <div class="dim-box__label">Columnas</div>
            <div class="stepper">
              <Button icon="pi pi-minus" severity="secondary" text class="stepper__btn" @click="dec('columnas')" />
              <div class="stepper__value">{{ form.columnas }}</div>
              <Button icon="pi pi-plus" severity="secondary" text class="stepper__btn" @click="inc('columnas')" />
            </div>
          </div>
        </div>
      </div>

      <div class="grid2">
        <div class="field">
          <label>Nº primer nicho / sepultura del bloque</label>
          <InputText v-model.number="form.numero_inicio" placeholder="(auto)" />
          <div class="muted-mini">Si lo dejas vacío, se asigna automáticamente (max+1).</div>
        </div>
        <div class="field">
          <label>Sentido de numeración</label>
          <div class="dir-wrap">
            <div class="dir-row">
              <button
                type="button"
                class="dir-btn"
                :class="form.numeracion_horizontal === '->' ? 'dir-btn--active' : ''"
                @click="form.numeracion_horizontal = '->'"
              >
                Horiz. →
              </button>
              <button
                type="button"
                class="dir-btn"
                :class="form.numeracion_horizontal === '<-' ? 'dir-btn--active' : ''"
                @click="form.numeracion_horizontal = '<-'"
              >
                Horiz. ←
              </button>
            </div>
            <div class="dir-row">
              <button
                type="button"
                class="dir-btn"
                :class="form.numeracion_vertical === 'down' ? 'dir-btn--active' : ''"
                @click="form.numeracion_vertical = 'down'"
              >
                Vert. ↓
              </button>
              <button
                type="button"
                class="dir-btn"
                :class="form.numeracion_vertical === 'up' ? 'dir-btn--active' : ''"
                @click="form.numeracion_vertical = 'up'"
              >
                Vert. ↑
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="field">
        <label>Descripción</label>
        <InputText v-model="form.descripcion" />
      </div>

      <div class="field">
        <label class="label-map">
          <i class="pi pi-map-marker" style="color:var(--c2-primary,#118652)" />
          Ubicación en el mapa
          <span class="label-map__hint">Opcional — clic en el mapa para marcar</span>
        </label>
        <div v-if="fueraDeZona" class="zona-warning">
          <i class="pi pi-exclamation-triangle" />
          El punto marcado está fuera del polígono de la zona seleccionada. Puedes continuar igualmente.
        </div>
        <MapaPicker
          v-model:lat="form.lat"
          v-model:lon="form.lon"
          :defaultLat="43.248730"
          :defaultLon="-4.057985"
          :defaultZoom="17"
          :zones="zonas"
          :activeZoneId="form.zona_id"
          @outside-zone="fueraDeZona = true"
          @inside-zone="fueraDeZona = false"
        />
      </div>

      <div class="preview">
        <div class="preview__head">
          <div class="preview__title">
            Previsualización · <strong>{{ totalCeldas }}</strong> sepulturas
          </div>
          <div class="muted-mini">
            Muestra el número de nicho que se guardará en BD (campo <code>numero</code>).
          </div>
        </div>

        <div
          class="preview-grid"
          :style="{ gridTemplateColumns: `repeat(${form.columnas}, minmax(38px, 1fr))` }"
        >
          <div v-for="cell in previewCells" :key="cell.key" class="preview-cell">
            <div class="preview-cell__num">{{ cell.numero }}</div>
          </div>
        </div>
      </div>

      <div v-if="error" class="error">{{ error }}</div>
    </div>

    <template #footer>
      <Button label="Cancelar" severity="secondary" @click="visible = false" />
      <Button label="Guardar" :loading="saving" @click="save" />
    </template>
  </Dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import api from '@/services/api';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import MapaPicker from '@/components/cementerio/MapaPicker.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  zonas:      { type: Array, default: () => [] },
  editData:   { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'saved']);

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const tipos = ['nichos', 'columbarios', 'fosas', 'panteones', 'otros'];
const saving      = ref(false);
const error       = ref(null);
const fueraDeZona = ref(false);

const form = reactive({
  id: null, zona_id: null, codigo: '', nombre: '', tipo: 'nichos',
  filas: 1, columnas: 1, numero_inicio: null,
  numeracion_horizontal: '->', numeracion_vertical: 'down',
  descripcion: '', lat: null, lon: null,
});

watch(visible, (v) => {
  if (v) {
    error.value      = null;
    fueraDeZona.value = false;
    if (props.editData) {
      Object.assign(form, {
        id: props.editData.id,
        zona_id: props.editData.zona_id,
        codigo: props.editData.codigo ?? '',
        nombre: props.editData.nombre ?? '',
        tipo: props.editData.tipo ?? 'nichos',
        filas: props.editData.filas ?? 1,
        columnas: props.editData.columnas ?? 1,
        numero_inicio: props.editData.numero_inicio ?? null,
        numeracion_horizontal: props.editData.numeracion_horizontal ?? '->',
        numeracion_vertical: props.editData.numeracion_vertical ?? 'down',
        descripcion: props.editData.descripcion ?? '',
        lat: props.editData.lat ?? null,
        lon: props.editData.lon ?? null,
      });
    } else {
      Object.assign(form, {
        id: null, zona_id: props.zonas[0]?.id ?? null,
        codigo: '', nombre: '', tipo: 'nichos',
        filas: 1, columnas: 1, numero_inicio: null,
        numeracion_horizontal: '->', numeracion_vertical: 'down',
        descripcion: '', lat: null, lon: null,
      });
    }
  }
});

const zonasPills = computed(() =>
  (props.zonas ?? []).filter((z) => z?.codigo).map((z) => ({ id: z.id, codigo: z.codigo }))
);

const totalCeldas = computed(() => Number(form.filas || 0) * Number(form.columnas || 0));

function clampInt(v, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
function inc(field) { form[field] = clampInt(form[field], 1, 200) + 1; }
function dec(field) { form[field] = Math.max(1, clampInt(form[field], 1, 200) - 1); }

const previewCells = computed(() => {
  const filas = clampInt(form.filas, 1, 200);
  const cols  = clampInt(form.columnas, 1, 200);
  const start = form.numero_inicio != null && String(form.numero_inicio).trim() !== ''
    ? clampInt(form.numero_inicio, 1, 1000000) : 1;

  const colOrder = Array.from({ length: cols }, (_, i) => i + 1);
  const rowOrder = Array.from({ length: filas }, (_, i) => i + 1);
  if (form.numeracion_horizontal === '<-') colOrder.reverse();
  if (form.numeracion_vertical === 'up') rowOrder.reverse();

  const byPos = new Map();
  let num = start;
  for (const c of colOrder) for (const r of rowOrder) byPos.set(`${r}-${c}`, num++);

  const out = [];
  for (let r = 1; r <= filas; r++)
    for (let c = 1; c <= cols; c++)
      out.push({ key: `${r}-${c}`, numero: byPos.get(`${r}-${c}`) });
  return out;
});

async function save() {
  saving.value = true;
  error.value  = null;
  try {
    if (form.id) {
      await api.put(`/api/cementerio/admin/bloques/${form.id}`, form);
    } else {
      await api.post('/api/cementerio/admin/bloques', form);
    }
    visible.value = false;
    emit('saved');
  } catch (e) {
    error.value = e?.response?.data?.message
      ?? Object.values(e?.response?.data?.errors ?? {}).flat().join(' ')
      ?? 'Error al guardar el bloque.';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.form { display: grid; gap: 10px; }
.field { display: grid; gap: 6px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.error { color: var(--c2-danger, #A61B1B); font-size: 13px; }
.hint { font-size: 13px; color: rgba(23, 35, 31, 0.70); margin-top: -4px; }
.muted-mini { font-size: 12px; color: rgba(23, 35, 31, 0.60); }
.label-map { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; }
.label-map__hint { font-size: 11px; color: rgba(23,35,31,.50); font-weight: 400; }

.zona-pill-row { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.zona-pill {
  height: 34px; padding: 0 14px; border-radius: 999px;
  border: 1px solid rgba(23,35,31,.16); background: rgba(245,247,244,.75);
  font-weight: 800; cursor: pointer;
}
.zona-pill--active {
  background: rgba(17,134,82,.10); border-color: rgba(17,134,82,.40);
  color: var(--c2-primary, #118652);
}

.dimensiones { border: 1px solid rgba(23,35,31,.10); border-radius: 14px; padding: 12px; background: rgba(245,247,244,.55); }
.dimensiones__title { font-weight: 900; margin-bottom: 10px; }
.dimensiones__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.dim-box { display: grid; gap: 8px; }
.dim-box__label { font-size: 12px; font-weight: 800; color: rgba(23,35,31,.70); }
.stepper { display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; border: 1px solid rgba(23,35,31,.14); border-radius: 12px; background: white; overflow: hidden; height: 44px; }
.stepper__btn { width: 44px; height: 44px; }
.stepper__value { text-align: center; font-weight: 900; }

.dir-wrap { display: grid; gap: 10px; }
.dir-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.dir-btn { height: 42px; border-radius: 12px; border: 1px solid rgba(23,35,31,.14); background: white; font-weight: 900; cursor: pointer; }
.dir-btn--active { background: rgba(23,35,31,.92); border-color: rgba(23,35,31,.92); color: white; }

.preview { border: 1px solid rgba(23,35,31,.10); border-radius: 14px; padding: 12px; background: rgba(245,247,244,.55); }
.preview__head { display: grid; gap: 2px; margin-bottom: 10px; }
.preview__title { font-weight: 900; }
.preview-grid { display: grid; gap: 8px; padding: 10px; border-radius: 14px; background: white; border: 1px solid rgba(23,35,31,.10); overflow: auto; max-height: 360px; }
.preview-cell { border: 1px solid rgba(23,35,31,.10); border-radius: 10px; background: rgba(245,247,244,.75); min-height: 38px; display: grid; place-items: center; }
.preview-cell__num { font-weight: 900; color: rgba(23,35,31,.82); font-size: 12px; }

.zona-warning {
  display: flex; align-items: flex-start; gap: 8px; padding: 9px 12px;
  border-radius: 8px; background: rgba(201,162,39,.10); border: 1px solid rgba(201,162,39,.40);
  color: #7a5c00; font-size: 12.5px; font-weight: 500; line-height: 1.4;
}
.zona-warning .pi { color: #C9A227; font-size: 13px; flex-shrink: 0; margin-top: 1px; }

@media (max-width: 900px) {
  .grid2 { grid-template-columns: 1fr; }
  .dimensiones__grid { grid-template-columns: 1fr; }
}
</style>
