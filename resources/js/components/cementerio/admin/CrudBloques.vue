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

    <BloqueFormDialog
      v-model="dialog"
      :zonas="zonas"
      :editData="editRow"
      @saved="load"
    />

    <!-- Grid del bloque (reutilizable) -->
    <BloqueGridView v-model="gridDialog" :bloque="gridBloque" />
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue';
import api from '@/services/api';
import { useCementerioStore } from '@/stores/cementerio';
import { toApiErrorMessage } from './crudUi';
import BloqueGridView from '@/components/cementerio/BloqueGridView.vue';
import BloqueFormDialog from './BloqueFormDialog.vue';

import DataTable from 'primevue/datatable';
import { FilterMatchMode } from '@primevue/core/api';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

const navigateToTab = inject('navigateToTab', null);
const cemStore = useCementerioStore();
const cid = computed(() => cemStore.activoId);

const items     = ref([]);
const zonas     = ref([]);
const loading   = ref(false);
const loadError = ref(null);
const dialog    = ref(false);
const editRow   = ref(null);

const filters = ref({
  zona_nombre: { value: null, matchMode: FilterMatchMode.CONTAINS },
  codigo:      { value: null, matchMode: FilterMatchMode.CONTAINS },
  nombre:      { value: null, matchMode: FilterMatchMode.CONTAINS },
  tipo:        { value: null, matchMode: FilterMatchMode.CONTAINS },
});

const gridDialog = ref(false);
const gridBloque = ref(null);

function goToZonas() { navigateToTab?.(1); }

function openGrid(bloque) {
  gridBloque.value = bloque;
  gridDialog.value = true;
}

function openNew() {
  editRow.value = null;
  dialog.value  = true;
}

function openEdit(row) {
  editRow.value = row;
  dialog.value  = true;
}

async function loadCatalogos() {
  try {
    const res = await api.get('/api/cementerio/admin/zonas', { params: { cementerio_id: cid.value } });
    zonas.value = res.data?.items?.map((z) => ({
      id:      z.id,
      nombre:  z.nombre,
      codigo:  z.codigo,
      lat:     z.lat,
      lon:     z.lon,
      polygon: typeof z.polygon === 'string' ? JSON.parse(z.polygon) : (z.polygon ?? null),
    })) ?? [];
  } catch (e) {
    loadError.value = toApiErrorMessage(e, 'No se pudieron cargar los catálogos (¿permisos?).');
  }
}

async function load() {
  loading.value   = true;
  loadError.value = null;
  try {
    const res = await api.get('/api/cementerio/admin/bloques', { params: { cementerio_id: cid.value } });
    items.value = res.data?.items ?? [];
  } catch (e) {
    loadError.value = toApiErrorMessage(e, 'No se pudieron cargar los bloques (¿permisos?).');
  } finally {
    loading.value = false;
  }
}

async function remove(row) {
  if (!confirm(`¿Borrar bloque "${row.nombre}"?`)) return;
  await api.delete(`/api/cementerio/admin/bloques/${row.id}`);
  await load();
}

watch(cid, async (v, old) => { if (v && v !== old) { await loadCatalogos(); await load(); } });
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

.zona-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 8px;
  background: rgba(201, 162, 39, 0.10);
  border: 1px solid rgba(201, 162, 39, 0.40);
  color: #7a5c00;
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.4;
}
.zona-warning .pi { color: #C9A227; font-size: 13px; flex-shrink: 0; margin-top: 1px; }
</style>
