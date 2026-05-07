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
      </Column>
      <Column header="Acciones" style="width:170px">
        <template #filter><span /></template>
        <template #body="{ data }">
          <div class="row-actions">
            <Button label="Editar" size="small" severity="secondary" @click="openEdit(data)" />
            <Button label="Borrar" size="small" severity="danger" @click="remove(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="dialog" modal header="Zona" :style="{ width: '560px' }">
      <div class="form">
        <div class="field">
          <label>Cementerio</label>
          <Dropdown v-model="form.cementerio_id" :options="cementerios" optionLabel="nombre" optionValue="id" placeholder="Selecciona…" />
        </div>
        <div class="field">
          <label>Código</label>
          <InputText v-model="form.codigo" />
        </div>
        <div class="field">
          <label>Nombre</label>
          <InputText v-model="form.nombre" />
        </div>
        <div class="field">
          <label>Descripción</label>
          <InputText v-model="form.descripcion" />
        </div>

        <div class="field">
          <label class="label-map">
            <i class="pi pi-map-marker" style="color:var(--c2-primary,#118652)" />
            Área de la zona en el mapa
            <span class="label-map__hint">Obligatorio para mostrar la zona en el mapa · marca 4 puntos</span>
          </label>
          <ZonaAreaPicker
            v-model="form.polygon"
            :defaultLat="43.248730"
            :defaultLon="-4.057985"
            :defaultZoom="17"
          />
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
import { inject, onMounted, reactive, ref } from 'vue';
import api from '@/services/api';
import { toApiErrorMessage } from './crudUi';

import DataTable from 'primevue/datatable';
import { FilterMatchMode } from '@primevue/core/api';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import ZonaAreaPicker from '@/components/cementerio/ZonaAreaPicker.vue';

const navigateToTab = inject('navigateToTab', null);

const items = ref([]);
const cementerios = ref([]);
const loading = ref(false);
const loadError = ref(null);
const dialog = ref(false);
const saving = ref(false);
const error = ref(null);

const filters = ref({
  cementerio_nombre: { value: null, matchMode: FilterMatchMode.CONTAINS },
  codigo:            { value: null, matchMode: FilterMatchMode.CONTAINS },
  nombre:            { value: null, matchMode: FilterMatchMode.CONTAINS },
});

const form = reactive({
  id: null,
  cementerio_id: null,
  codigo: '',
  nombre: '',
  descripcion: '',
  lat: null,
  lon: null,
  polygon: [],
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
  loading.value = true;
  loadError.value = null;
  try {
    const res = await api.get('/api/cementerio/admin/zonas');
    items.value = res.data?.items ?? [];
  } catch (e) {
    loadError.value = toApiErrorMessage(e, 'No se pudieron cargar las zonas (¿permisos?).');
  } finally {
    loading.value = false;
  }
}

function openNew() {
  Object.assign(form, { id: null, cementerio_id: cementerios.value[0]?.id ?? null, codigo: '', nombre: '', descripcion: '', lat: null, lon: null, polygon: [] });
  error.value = null;
  dialog.value = true;
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    cementerio_id: row.cementerio_id,
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion,
    lat: row.lat ?? null,
    lon: row.lon ?? null,
    polygon: row.polygon ?? [],
  });
  error.value = null;
  dialog.value = true;
}

async function save() {
  saving.value = true;
  error.value = null;
  try {
    if (form.id) {
      await api.put(`/api/cementerio/admin/zonas/${form.id}`, form);
    } else {
      await api.post('/api/cementerio/admin/zonas', form);
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
  if (!confirm(`¿Borrar zona "${row.nombre}"?`)) return;
  await api.delete(`/api/cementerio/admin/zonas/${row.id}`);
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
.error { color: var(--c2-danger, #A61B1B); font-size: 13px; }
.muted { color: #999; font-size: 13px; }
.col-filter { width: 100%; font-size: 12px; }
.nav-link {
  background: none; border: none; padding: 2px 6px; border-radius: 6px;
  cursor: pointer; font-size: 13px; color: var(--c2-tertiary, #1266A3);
  font-weight: 600; transition: background .12s;
}
.nav-link:hover { background: rgba(18,102,163,.08); text-decoration: underline; }
.label-map { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; }
.label-map__hint { font-size: 11px; color: rgba(23,35,31,.50); font-weight: 400; }
</style>
