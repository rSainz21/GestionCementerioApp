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

    <DataTable :value="items" stripedRows :loading="loading">
      <Column field="id" header="ID" style="width:90px" />
      <Column field="zona_nombre" header="Zona" />
      <Column field="codigo" header="Código" style="width:140px" />
      <Column field="nombre" header="Nombre" />
      <Column field="tipo" header="Tipo" style="width:140px" />
      <Column header="Grid" style="width:120px">
        <template #body="{ data }">{{ data.filas }}×{{ data.columnas }}</template>
      </Column>
      <Column header="Acciones" style="width:170px">
        <template #body="{ data }">
          <div class="row-actions">
            <Button label="Editar" size="small" severity="secondary" @click="openEdit(data)" />
            <Button label="Borrar" size="small" severity="danger" @click="remove(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

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
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '@/services/api';
import { toApiErrorMessage } from './crudUi';

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';

const items = ref([]);
const zonas = ref([]);
const tipos = ['nichos', 'columbarios', 'fosas', 'panteones', 'otros'];
const loading = ref(false);
const loadError = ref(null);
const dialog = ref(false);
const saving = ref(false);
const error = ref(null);

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
.row-actions { display: flex; gap: 8px; }
.form { display: grid; gap: 10px; }
.field { display: grid; gap: 6px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.error { color: var(--c2-danger, #A61B1B); font-size: 13px; }
.hint {
  font-size: 13px;
  color: rgba(23, 35, 31, 0.70);
  margin-top: -4px;
}

.muted-mini {
  font-size: 12px;
  color: rgba(23, 35, 31, 0.60);
}

.zona-pill-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.zona-pill {
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(23, 35, 31, 0.16);
  background: rgba(245, 247, 244, 0.75);
  font-weight: 800;
  cursor: pointer;
}

.zona-pill--active {
  background: rgba(17, 134, 82, 0.10);
  border-color: rgba(17, 134, 82, 0.40);
  color: var(--c2-primary, #118652);
}

.dimensiones {
  border: 1px solid rgba(23, 35, 31, 0.10);
  border-radius: 14px;
  padding: 12px;
  background: rgba(245, 247, 244, 0.55);
}

.dimensiones__title {
  font-weight: 900;
  margin-bottom: 10px;
}

.dimensiones__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.dim-box {
  display: grid;
  gap: 8px;
}

.dim-box__label {
  font-size: 12px;
  font-weight: 800;
  color: rgba(23, 35, 31, 0.70);
}

.stepper {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  border: 1px solid rgba(23, 35, 31, 0.14);
  border-radius: 12px;
  background: white;
  overflow: hidden;
  height: 44px;
}

.stepper__btn {
  width: 44px;
  height: 44px;
}

.stepper__value {
  text-align: center;
  font-weight: 900;
}

.dir-wrap {
  display: grid;
  gap: 10px;
}

.dir-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.dir-btn {
  height: 42px;
  border-radius: 12px;
  border: 1px solid rgba(23, 35, 31, 0.14);
  background: white;
  font-weight: 900;
  cursor: pointer;
}

.dir-btn--active {
  background: rgba(23, 35, 31, 0.92);
  border-color: rgba(23, 35, 31, 0.92);
  color: white;
}

.preview {
  border: 1px solid rgba(23, 35, 31, 0.10);
  border-radius: 14px;
  padding: 12px;
  background: rgba(245, 247, 244, 0.55);
}

.preview__head {
  display: grid;
  gap: 2px;
  margin-bottom: 10px;
}

.preview__title {
  font-weight: 900;
}

.preview-grid {
  display: grid;
  gap: 8px;
  padding: 10px;
  border-radius: 14px;
  background: white;
  border: 1px solid rgba(23, 35, 31, 0.10);
  overflow: auto;
  max-height: 360px;
}

.preview-cell {
  border: 1px solid rgba(23, 35, 31, 0.10);
  border-radius: 10px;
  background: rgba(245, 247, 244, 0.75);
  min-height: 38px;
  display: grid;
  place-items: center;
}

.preview-cell__num {
  font-weight: 900;
  color: rgba(23, 35, 31, 0.82);
  font-size: 12px;
}

@media (max-width: 900px) { .grid2 { grid-template-columns: 1fr; } }
@media (max-width: 900px) { .dimensiones__grid { grid-template-columns: 1fr; } }
</style>

