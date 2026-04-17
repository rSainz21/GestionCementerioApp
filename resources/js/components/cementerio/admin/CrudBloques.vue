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

    <Dialog v-model:visible="dialog" modal header="Bloque" :style="{ width: '640px' }">
      <div class="form">
        <div class="grid2">
          <div class="field">
            <label>Zona</label>
            <Dropdown v-model="form.zona_id" :options="zonas" optionLabel="nombre" optionValue="id" placeholder="Selecciona…" />
          </div>
          <div class="field">
            <label>Tipo</label>
            <Dropdown v-model="form.tipo" :options="tipos" placeholder="Selecciona…" />
          </div>
        </div>

        <div class="grid2">
          <div class="field">
            <label>Código</label>
            <InputText v-model="form.codigo" />
          </div>
          <div class="field">
            <label>Nombre</label>
            <InputText v-model="form.nombre" />
          </div>
        </div>

        <div class="grid2">
          <div class="field">
            <label>Filas</label>
            <InputText v-model.number="form.filas" />
          </div>
          <div class="field">
            <label>Columnas</label>
            <InputText v-model.number="form.columnas" />
          </div>
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
const zonas = ref([]);
const tipos = ['nichos', 'columbarios', 'fosas', 'panteones', 'otros'];
const loading = ref(false);
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
  descripcion: '',
});

async function loadCatalogos() {
  const res = await api.get('/api/cementerio/admin/zonas');
  zonas.value = res.data?.items?.map((z) => ({ id: z.id, nombre: z.nombre })) ?? [];
}

async function load() {
  loading.value = true;
  try {
    const res = await api.get('/api/cementerio/admin/bloques');
    items.value = res.data?.items ?? [];
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
@media (max-width: 900px) { .grid2 { grid-template-columns: 1fr; } }
</style>

