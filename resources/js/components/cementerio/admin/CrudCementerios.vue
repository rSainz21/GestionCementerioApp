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

    <DataTable :value="items" stripedRows :loading="loading">
      <Column field="id" header="ID" style="width:90px" />
      <Column field="nombre" header="Nombre" />
      <Column field="municipio" header="Municipio" />
      <Column header="Acciones" style="width:170px">
        <template #body="{ data }">
          <div class="row-actions">
            <Button label="Editar" size="small" severity="secondary" @click="openEdit(data)" />
            <Button label="Borrar" size="small" severity="danger" @click="remove(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="dialog" modal header="Cementerio" :style="{ width: '520px' }">
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

const items = ref([]);
const loading = ref(false);
const loadError = ref(null);
const dialog = ref(false);
const saving = ref(false);
const error = ref(null);

const form = reactive({
  id: null,
  nombre: '',
  municipio: '',
  direccion: '',
  notas: '',
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
  Object.assign(form, { id: null, nombre: '', municipio: '', direccion: '', notas: '' });
  error.value = null;
  dialog.value = true;
}

function openEdit(row) {
  Object.assign(form, row);
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
</style>

