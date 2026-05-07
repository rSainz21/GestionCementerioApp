<template>
  <div class="wrap">
    <div class="toolbar">
      <div class="toolbar__left">
        <span class="title">Cementerios</span>
      </div>
      <div class="toolbar__right">
        <Button label="Nuevo" icon="pi pi-plus" @click="openNew" />
      </div>
    </div>

    <div v-if="loadError" class="error">{{ loadError }}</div>

    <DataTable :value="items" filterDisplay="row" v-model:filters="filters" stripedRows :loading="loading">
      <Column field="id" header="ID" style="width:70px" />
      <Column field="nombre" header="Nombre" :showFilterMenu="false">
        <template #filter="{ filterModel, filterCallback }">
          <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Filtrar…" class="col-filter" />
        </template>
      </Column>
      <Column field="municipio" header="Municipio" :showFilterMenu="false">
        <template #filter="{ filterModel, filterCallback }">
          <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Filtrar…" class="col-filter" />
        </template>
      </Column>
      <Column header="Coordenadas" style="width:160px">
        <template #filter><span /></template>
        <template #body="{ data }">
          <span v-if="data.lat && data.lon" class="coords-badge">
            <i class="pi pi-map-marker" /> {{ Number(data.lat).toFixed(4) }}, {{ Number(data.lon).toFixed(4) }}
          </span>
          <span v-else class="muted">Sin ubicación</span>
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

    <Dialog v-model:visible="dialog" modal header="Cementerio" :style="{ width: '660px' }">
      <div class="form">
        <div class="field">
          <label>Nombre</label>
          <InputText v-model="form.nombre" />
        </div>
        <div class="field">
          <label>Municipio</label>
          <InputText v-model="form.municipio" />
        </div>
        <div class="field">
          <label>Dirección</label>
          <InputText v-model="form.direccion" />
        </div>
        <div class="field">
          <label>Notas</label>
          <InputText v-model="form.notas" />
        </div>

        <div class="field">
          <label class="label-map">
            <i class="pi pi-map-marker" style="color:var(--c2-primary,#118652)" />
            Ubicación en el mapa
            <span class="label-map__hint">Opcional — clic en el mapa para marcar la entrada del cementerio</span>
          </label>
          <MapaPicker
            v-model:lat="form.lat"
            v-model:lon="form.lon"
            :defaultLat="43.248730"
            :defaultLon="-4.057985"
            :defaultZoom="16"
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
import { onMounted, reactive, ref } from 'vue';
import api from '@/services/api';
import { toApiErrorMessage } from './crudUi';

import DataTable from 'primevue/datatable';
import { FilterMatchMode } from '@primevue/core/api';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import MapaPicker from '@/components/cementerio/MapaPicker.vue';

const items    = ref([]);
const loading  = ref(false);
const loadError = ref(null);
const dialog   = ref(false);
const saving   = ref(false);
const error    = ref(null);

const filters = ref({
  nombre:    { value: null, matchMode: FilterMatchMode.CONTAINS },
  municipio: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

const form = reactive({
  id: null,
  nombre: '',
  municipio: '',
  direccion: '',
  notas: '',
  lat: null,
  lon: null,
});

async function load() {
  loading.value = true;
  loadError.value = null;
  try {
    const res = await api.get('/api/cementerio/admin/cementerios');
    items.value = res.data?.items ?? [];
  } catch (e) {
    loadError.value = toApiErrorMessage(e, 'No se pudieron cargar los cementerios (¿permisos?).');
  } finally {
    loading.value = false;
  }
}

function openNew() {
  Object.assign(form, { id: null, nombre: '', municipio: '', direccion: '', notas: '', lat: null, lon: null });
  error.value = null;
  dialog.value = true;
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    nombre: row.nombre,
    municipio: row.municipio ?? '',
    direccion: row.direccion ?? '',
    notas: row.notas ?? '',
    lat: row.lat ? Number(row.lat) : null,
    lon: row.lon ? Number(row.lon) : null,
  });
  error.value = null;
  dialog.value = true;
}

async function save() {
  saving.value = true;
  error.value = null;
  try {
    if (form.id) {
      await api.put(`/api/cementerio/admin/cementerios/${form.id}`, form);
    } else {
      await api.post('/api/cementerio/admin/cementerios', form);
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
  if (!confirm(`¿Borrar cementerio "${row.nombre}"?`)) return;
  await api.delete(`/api/cementerio/admin/cementerios/${row.id}`);
  await load();
}

onMounted(load);
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

.coords-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600;
  color: var(--c2-primary, #118652);
  background: rgba(17,134,82,.08);
  border: 1px solid rgba(17,134,82,.2);
  border-radius: 6px; padding: 2px 7px;
}
.coords-badge .pi { font-size: 10px; }

.label-map { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; }
.label-map__hint { font-size: 11px; color: rgba(23,35,31,.50); font-weight: 400; }
</style>
