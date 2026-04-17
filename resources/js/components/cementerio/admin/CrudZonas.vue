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

    <DataTable :value="items" stripedRows :loading="loading">
      <Column field="id" header="ID" style="width:90px" />
      <Column field="cementerio_nombre" header="Cementerio" />
      <Column field="codigo" header="Código" style="width:140px" />
      <Column field="nombre" header="Nombre" />
      <Column header="Acciones" style="width:170px">
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
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';

const items = ref([]);
const cementerios = ref([]);
const loading = ref(false);
const dialog = ref(false);
const saving = ref(false);
const error = ref(null);

const form = reactive({
  id: null,
  cementerio_id: null,
  codigo: '',
  nombre: '',
  descripcion: '',
});

async function loadCatalogos() {
  const res = await api.get('/api/cementerio/admin/cementerios');
  cementerios.value = res.data?.items ?? [];
}

async function load() {
  loading.value = true;
  try {
    const res = await api.get('/api/cementerio/admin/zonas');
    items.value = res.data?.items ?? [];
  } finally {
    loading.value = false;
  }
}

function openNew() {
  Object.assign(form, { id: null, cementerio_id: cementerios.value[0]?.id ?? null, codigo: '', nombre: '', descripcion: '' });
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
</style>

