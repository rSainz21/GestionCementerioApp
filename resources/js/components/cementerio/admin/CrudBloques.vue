<template>
  <div class="wrap">
    <div class="toolbar">
      <div class="toolbar__left">
        <span class="title">Bloques</span>
      </div>
      <div class="toolbar__right">
        <Button label="Nuevo" icon="pi pi-plus" @click="openNew" />
      </div>
    </div>

    <div v-if="loadError" class="error">{{ loadError }}</div>

    <DataTable
      :value="items"
      filterDisplay="row"
      v-model:filters="filters"
      stripedRows
      :loading="loading"
    >
      <Column field="id" header="ID" style="width:70px" />
      <Column field="zona_nombre" header="Zona" :showFilterMenu="false">
        <template #filter="{ filterModel, filterCallback }">
          <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Filtrar zona…" class="col-filter" />
        </template>
        <template #body="{ data }">
          <button v-if="data.zona_nombre" type="button" class="nav-link" @click.stop="goToZonas()">
            {{ data.zona_nombre }}
          </button>
          <span v-else class="muted">—</span>
        </template>
      </Column>
      <Column field="codigo" header="Código" style="width:130px" :showFilterMenu="false">
        <template #filter="{ filterModel, filterCallback }">
          <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Filtrar…" class="col-filter" />
        </template>
      </Column>
      <Column field="nombre" header="Nombre" :showFilterMenu="false">
        <template #filter="{ filterModel, filterCallback }">
          <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Filtrar…" class="col-filter" />
        </template>
        <template #body="{ data }">
          <button type="button" class="nav-link nav-link--nombre" @click.stop="openGrid(data)" :title="'Ver cuadrícula de ' + data.nombre">
            <i class="pi pi-th-large" style="font-size:11px;margin-right:4px;opacity:.6" />{{ data.nombre }}
          </button>
        </template>
      </Column>
      <Column field="tipo" header="Tipo" style="width:130px" :showFilterMenu="false">
        <template #filter="{ filterModel, filterCallback }">
          <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Filtrar…" class="col-filter" />
        </template>
      </Column>
      <Column header="Grid" style="width:90px">
        <template #filter><span /></template>
        <template #body="{ data }">{{ data.filas }}×{{ data.columnas }}</template>
      </Column>
      <Column header="Acciones" style="width:180px">
        <template #filter><span /></template>
        <template #body="{ data }">
          <div class="row-actions">
            <Button icon="pi pi-th-large" size="small" severity="info" text v-tooltip.left="'Ver cuadrícula'" @click="openGrid(data)" />
            <Button label="Editar" size="small" severity="secondary" @click="openEdit(data)" />
            <Button label="Borrar" size="small" severity="danger" @click="remove(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- CRUD form Dialog -->
    <Dialog v-model:visible="dialog" modal header="Crear bloque" :style="{ width: '680px' }">
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
          <MapaPicker
            v-model:lat="form.lat"
            v-model:lon="form.lon"
            :defaultLat="43.248730"
            :defaultLon="-4.057985"
            :defaultZoom="17"
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
        <Button label="Cancelar" severity="secondary" @click="dialog=false" />
        <Button label="Guardar" :loading="saving" @click="save" />
      </template>
    </Dialog>

    <!-- Grid del bloque (reutilizable) -->
    <BloqueGridView v-model="gridDialog" :bloque="gridBloque" />
  </div>
</template>

<script setup>
import { computed, inject, onMounted, reactive, ref } from 'vue';
import api from '@/services/api';
import { toApiErrorMessage } from './crudUi';
import BloqueGridView from '@/components/cementerio/BloqueGridView.vue';

import DataTable from 'primevue/datatable';
import { FilterMatchMode } from '@primevue/core/api';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import MapaPicker from '@/components/cementerio/MapaPicker.vue';

const navigateToTab = inject('navigateToTab', null);

// ── CRUD state ────────────────────────────────────────────────────────────────
const items = ref([]);
const zonas = ref([]);
const tipos = ['nichos', 'columbarios', 'fosas', 'panteones', 'otros'];
const loading = ref(false);
const loadError = ref(null);
const dialog = ref(false);
const saving = ref(false);
const error = ref(null);

// ── Column filters ─────────────────────────────────────────────────────────
const filters = ref({
  zona_nombre: { value: null, matchMode: FilterMatchMode.CONTAINS },
  codigo:      { value: null, matchMode: FilterMatchMode.CONTAINS },
  nombre:      { value: null, matchMode: FilterMatchMode.CONTAINS },
  tipo:        { value: null, matchMode: FilterMatchMode.CONTAINS },
});

// ── Grid dialog state ─────────────────────────────────────────────────────
const gridDialog = ref(false);
const gridBloque = ref(null);

// ── Form ──────────────────────────────────────────────────────────────────
const form = reactive({
  id: null,
  zona_id: null,
  codigo: '',
  nombre: '',
  tipo: 'nichos',
  filas: 1,
  columnas: 1,
  numero_inicio: null,
  numeracion_horizontal: '->',
  numeracion_vertical: 'down',
  descripcion: '',
  lat: null,
  lon: null,
});

const zonasPills = computed(() =>
  (zonas.value ?? [])
    .filter((z) => z?.codigo)
    .map((z) => ({ id: z.id, codigo: z.codigo }))
);

const totalCeldas = computed(() => Number(form.filas || 0) * Number(form.columnas || 0));

function clampInt(v, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function inc(field) {
  form[field] = clampInt(form[field], 1, 200) + 1;
  form[field] = clampInt(form[field], 1, 200);
}

function dec(field) {
  form[field] = clampInt(form[field], 1, 200) - 1;
  form[field] = clampInt(form[field], 1, 200);
}

const previewCells = computed(() => {
  const filas = clampInt(form.filas, 1, 200);
  const cols = clampInt(form.columnas, 1, 200);
  const start = form.numero_inicio != null && String(form.numero_inicio).trim() !== ''
    ? clampInt(form.numero_inicio, 1, 1000000)
    : 1;

  const colOrder = Array.from({ length: cols }, (_, i) => i + 1);
  const rowOrder = Array.from({ length: filas }, (_, i) => i + 1);
  if (form.numeracion_horizontal === '<-') colOrder.reverse();
  if (form.numeracion_vertical === 'up') rowOrder.reverse();

  const byPos = new Map();
  let num = start;
  for (const c of colOrder) {
    for (const r of rowOrder) {
      byPos.set(`${r}-${c}`, num++);
    }
  }

  const out = [];
  for (let r = 1; r <= filas; r++) {
    for (let c = 1; c <= cols; c++) {
      out.push({ key: `${r}-${c}`, fila: r, columna: c, numero: byPos.get(`${r}-${c}`) });
    }
  }
  return out;
});

// ── Actions ───────────────────────────────────────────────────────────────
function goToZonas() {
  navigateToTab?.(1);
}

function openGrid(bloque) {
  gridBloque.value = bloque;
  gridDialog.value = true;
}

async function loadCatalogos() {
  try {
    const res = await api.get('/api/cementerio/admin/zonas');
    zonas.value = res.data?.items?.map((z) => ({ id: z.id, nombre: z.nombre, codigo: z.codigo })) ?? [];
  } catch (e) {
    loadError.value = toApiErrorMessage(e, 'No se pudieron cargar los catálogos (¿permisos?).');
  }
}

async function load() {
  loading.value = true;
  loadError.value = null;
  try {
    const res = await api.get('/api/cementerio/admin/bloques');
    items.value = res.data?.items ?? [];
  } catch (e) {
    loadError.value = toApiErrorMessage(e, 'No se pudieron cargar los bloques (¿permisos?).');
  } finally {
    loading.value = false;
  }
}

function openNew() {
  Object.assign(form, {
    id: null,
    zona_id: zonas.value[0]?.id ?? null,
    codigo: '',
    nombre: '',
    tipo: 'nichos',
    filas: 1,
    columnas: 1,
    numero_inicio: null,
    numeracion_horizontal: '->',
    numeracion_vertical: 'down',
    descripcion: '',
    lat: null,
    lon: null,
  });
  error.value = null;
  dialog.value = true;
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    zona_id: row.zona_id,
    codigo: row.codigo,
    nombre: row.nombre,
    tipo: row.tipo,
    filas: row.filas,
    columnas: row.columnas,
    numero_inicio: row.numero_inicio ?? null,
    numeracion_horizontal: row.numeracion_horizontal ?? '->',
    numeracion_vertical: row.numeracion_vertical ?? 'down',
    descripcion: row.descripcion,
    lat: row.lat ?? null,
    lon: row.lon ?? null,
  });
  error.value = null;
  dialog.value = true;
}

async function save() {
  saving.value = true;
  error.value = null;
  try {
    if (form.id) {
      await api.put(`/api/cementerio/admin/bloques/${form.id}`, form);
    } else {
      await api.post('/api/cementerio/admin/bloques', form);
    }
    dialog.value = false;
    await load();
  } catch (e) {
    error.value = toApiErrorMessage(e);
  } finally {
    saving.value = false;
  }
}

async function remove(row) {
  if (!confirm(`¿Borrar bloque "${row.nombre}"?`)) return;
  await api.delete(`/api/cementerio/admin/bloques/${row.id}`);
  await load();
}

onMounted(async () => {
  await loadCatalogos();
  await load();
});
</script>

<style scoped>
.wrap { display: grid; gap: 12px; padding: 12px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.title { font-weight: 900; }
.row-actions { display: flex; gap: 6px; align-items: center; }
.form { display: grid; gap: 10px; }
.field { display: grid; gap: 6px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.error { color: var(--c2-danger, #A61B1B); font-size: 13px; }
.muted { color: #999; font-size: 13px; }
.hint { font-size: 13px; color: rgba(23, 35, 31, 0.70); margin-top: -4px; }
.muted-mini { font-size: 12px; color: rgba(23, 35, 31, 0.60); }

/* ── Column filter inputs ─────────────────────────────────── */
.col-filter { width: 100%; font-size: 12px; }

/* ── Navigation links in cells ───────────────────────────── */
.nav-link {
  background: none;
  border: none;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--c2-tertiary, #1266A3);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  transition: background .12s;
}
.nav-link:hover {
  background: rgba(18, 102, 163, 0.08);
  text-decoration: underline;
}
.nav-link--nombre { color: var(--c2-primary, #118652); }
.nav-link--nombre:hover { background: rgba(17, 134, 82, 0.08); }
.label-map { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; }
.label-map__hint { font-size: 11px; color: rgba(23,35,31,.50); font-weight: 400; }

/* ── Zona pills ───────────────────────────────────────────── */
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

/* ── Dimensiones ─────────────────────────────────────────── */
.dimensiones { border: 1px solid rgba(23,35,31,.10); border-radius: 14px; padding: 12px; background: rgba(245,247,244,.55); }
.dimensiones__title { font-weight: 900; margin-bottom: 10px; }
.dimensiones__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.dim-box { display: grid; gap: 8px; }
.dim-box__label { font-size: 12px; font-weight: 800; color: rgba(23,35,31,.70); }
.stepper { display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; border: 1px solid rgba(23,35,31,.14); border-radius: 12px; background: white; overflow: hidden; height: 44px; }
.stepper__btn { width: 44px; height: 44px; }
.stepper__value { text-align: center; font-weight: 900; }

/* ── Direction buttons ───────────────────────────────────── */
.dir-wrap { display: grid; gap: 10px; }
.dir-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.dir-btn { height: 42px; border-radius: 12px; border: 1px solid rgba(23,35,31,.14); background: white; font-weight: 900; cursor: pointer; }
.dir-btn--active { background: rgba(23,35,31,.92); border-color: rgba(23,35,31,.92); color: white; }

/* ── Preview grid ────────────────────────────────────────── */
.preview { border: 1px solid rgba(23,35,31,.10); border-radius: 14px; padding: 12px; background: rgba(245,247,244,.55); }
.preview__head { display: grid; gap: 2px; margin-bottom: 10px; }
.preview__title { font-weight: 900; }
.preview-grid { display: grid; gap: 8px; padding: 10px; border-radius: 14px; background: white; border: 1px solid rgba(23,35,31,.10); overflow: auto; max-height: 360px; }
.preview-cell { border: 1px solid rgba(23,35,31,.10); border-radius: 10px; background: rgba(245,247,244,.75); min-height: 38px; display: grid; place-items: center; }
.preview-cell__num { font-weight: 900; color: rgba(23,35,31,.82); font-size: 12px; }

/* ── Grid Dialog ─────────────────────────────────────────── */
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

/* ── Grid cells ──────────────────────────────────────────── */
.gc {
  border: none; border-radius: 8px; min-height: 36px; padding: 2px;
  display: grid; place-items: center; cursor: pointer;
  transition: transform 80ms, box-shadow 80ms, opacity 80ms;
}
.gc:disabled { cursor: default; opacity: .75; }
.gc:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(23,35,31,.18); }
.gc__num { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.92); text-shadow: 0 1px 2px rgba(0,0,0,.28); line-height: 1; }
.gc--libre   { background: var(--c2-success, #0F7A4A); }
.gc--ocupada { background: var(--c2-danger, #A61B1B); }
.gc--reservada { background: #C9A227; }
.gc--clausurada { background: #9a9a9a; }

@media (max-width: 900px) {
  .grid2 { grid-template-columns: 1fr; }
  .dimensiones__grid { grid-template-columns: 1fr; }
}
</style>
