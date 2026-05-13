<template>
  <div class="wrap">
    <div class="toolbar">
      <div class="toolbar__left">
        <span class="title">Zonas</span>
      </div>
      <div class="toolbar__right">
        <Button label="Nuevo" icon="pi pi-plus" @click="openNew" />
      </div>
    </div>

    <div v-if="loadError" class="error">{{ loadError }}</div>

    <DataTable :value="items" filterDisplay="row" v-model:filters="filters" stripedRows :loading="loading">
      <Column field="id" header="ID" style="width:70px" />
      <Column field="cementerio_nombre" header="Cementerio" :showFilterMenu="false">
        <template #filter="{ filterModel, filterCallback }">
          <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Filtrar…" class="col-filter" />
        </template>
        <template #body="{ data }">
          <button v-if="data.cementerio_nombre" type="button" class="nav-link" @click.stop="goToCementerios()">
            {{ data.cementerio_nombre }}
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
          <button type="button" class="nav-link nav-link--nombre" @click.stop="abrirDetalle(data)">
            {{ data.nombre }}
          </button>
        </template>
      </Column>
      <Column header="Acciones" style="width:200px">
        <template #filter><span /></template>
        <template #body="{ data }">
          <div class="row-actions">
            <Button icon="pi pi-eye" size="small" severity="info" text v-tooltip.left="'Ver detalle'" @click="abrirDetalle(data)" />
            <Button label="Editar" size="small" severity="secondary" @click="openEdit(data)" />
            <Button label="Borrar" size="small" severity="danger" @click="remove(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <ZonaDetalleModal v-model="detalleVisible" :zonaId="zonaDetalleId" />

    <ZonaFormDialog
      v-model="dialog"
      :cementerios="cementerios"
      :editData="editRow"
      @saved="load"
    />
  </div>
</template>

<script setup>
import { inject, onMounted, ref, watch, computed } from 'vue';
import api from '@/services/api';
import { useCementerioStore } from '@/stores/cementerio';
import { toApiErrorMessage } from './crudUi';

import DataTable from 'primevue/datatable';
import { FilterMatchMode } from '@primevue/core/api';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ZonaDetalleModal from './ZonaDetalleModal.vue';
import ZonaFormDialog from './ZonaFormDialog.vue';

const navigateToTab = inject('navigateToTab', null);
const cemStore = useCementerioStore();
const cid = computed(() => cemStore.activoId);

const detalleVisible = ref(false);
const zonaDetalleId  = ref(null);
const dialog         = ref(false);
const editRow        = ref(null);

function abrirDetalle(row) {
  zonaDetalleId.value  = row.id;
  detalleVisible.value = true;
}

function openNew() {
  editRow.value = null;
  dialog.value  = true;
}

function openEdit(row) {
  editRow.value = row;
  dialog.value  = true;
}

const items     = ref([]);
const cementerios = ref([]);
const loading   = ref(false);
const loadError = ref(null);

const filters = ref({
  cementerio_nombre: { value: null, matchMode: FilterMatchMode.CONTAINS },
  codigo:            { value: null, matchMode: FilterMatchMode.CONTAINS },
  nombre:            { value: null, matchMode: FilterMatchMode.CONTAINS },
});

function goToCementerios() {
  navigateToTab?.(0);
}

async function loadCatalogos() {
  try {
    const res = await api.get('/api/cementerio/admin/cementerios');
    cementerios.value = res.data?.items ?? [];
  } catch (e) {
    loadError.value = toApiErrorMessage(e, 'No se pudieron cargar los catálogos (¿permisos?).');
  }
}

async function load() {
  loading.value   = true;
  loadError.value = null;
  try {
    const res = await api.get('/api/cementerio/admin/zonas', { params: { cementerio_id: cid.value } });
    items.value = res.data?.items ?? [];
  } catch (e) {
    loadError.value = toApiErrorMessage(e, 'No se pudieron cargar las zonas (¿permisos?).');
  } finally {
    loading.value = false;
  }
}

async function remove(row) {
  if (!confirm(`¿Borrar zona "${row.nombre}"?`)) return;
  await api.delete(`/api/cementerio/admin/zonas/${row.id}`);
  await load();
}

watch(cid, async (v, old) => { if (v && v !== old) await load(); });
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
.error { color: var(--c2-danger, #A61B1B); font-size: 13px; }
.muted { color: #999; font-size: 13px; }
.col-filter { width: 100%; font-size: 12px; }
.nav-link {
  background: none; border: none; padding: 2px 6px; border-radius: 6px;
  cursor: pointer; font-size: 13px; color: var(--c2-tertiary, #1266A3);
  font-weight: 600; transition: background .12s;
}
.nav-link:hover { background: rgba(18,102,163,.08); text-decoration: underline; }
.nav-link--nombre { color: var(--c2-primary, #118652); }
.label-map { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; }
.label-map__hint { font-size: 11px; color: rgba(23,35,31,.50); font-weight: 400; }
</style>
