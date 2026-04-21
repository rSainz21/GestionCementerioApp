<template>
  <div class="wrap">
    <div class="toolbar">
      <div class="toolbar__left">
        <span class="title">Unidades (sepulturas)</span>
      </div>
      <div class="toolbar__right">
        <Button label="Nueva" icon="pi pi-plus" @click="openNew" />
      </div>
    </div>

    <div v-if="loadError" class="error">{{ loadError }}</div>

    <DataTable :value="items" stripedRows :loading="loading" paginator :rows="15">
      <Column field="id" header="ID" style="width:90px" />
      <Column field="codigo" header="Código" style="width:160px" />
      <Column field="zona_nombre" header="Zona" />
      <Column field="bloque_nombre" header="Bloque" />
      <Column field="fila" header="F" style="width:80px" />
      <Column field="columna" header="C" style="width:80px" />
      <Column field="estado" header="Estado" style="width:140px" />
      <Column header="Acciones" style="width:170px">
        <template #body="{ data }">
          <div class="row-actions">
            <Button label="Ver" size="small" severity="info" @click="openView(data)" />
            <Button label="Editar" size="small" severity="secondary" @click="openEdit(data)" />
            <Button label="Borrar" size="small" severity="danger" @click="remove(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="viewDialog" modal header="Detalle de unidad" :style="{ width: 'min(1400px, 96vw)' }">
      <SepulturaInfoPanel :sepulturaId="viewSepulturaId" />
      <template #footer>
        <Button label="Cerrar" severity="secondary" @click="viewDialog=false" />
      </template>
    </Dialog>

    <Dialog v-model:visible="dialog" modal header="Unidad" :style="{ width: '700px' }">
      <div class="form">
        <div class="grid2">
          <div class="field">
            <label>Zona</label>
            <Dropdown v-model="form.zona_id" :options="zonas" optionLabel="nombre" optionValue="id" placeholder="Selecciona…" />
          </div>
          <div class="field">
            <label>Bloque</label>
            <Dropdown v-model="form.bloque_id" :options="bloquesFiltrados" optionLabel="nombre" optionValue="id" placeholder="Selecciona…" />
          </div>
        </div>

        <div class="grid3">
          <div class="field">
            <label>Fila</label>
            <InputText v-model.number="form.fila" />
          </div>
          <div class="field">
            <label>Columna</label>
            <InputText v-model.number="form.columna" />
          </div>
          <div class="field">
            <label>Estado</label>
            <Dropdown v-model="form.estado" :options="estados" />
          </div>
        </div>

        <div class="grid2">
          <div class="field">
            <label>Código</label>
            <InputText v-model="form.codigo" placeholder="Opcional (si se deja vacío, se mantiene/auto)" />
          </div>
          <div class="field">
            <label>Tipo</label>
            <InputText v-model="form.tipo" placeholder="nicho/columbario/..." />
          </div>
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
import { computed, onMounted, reactive, ref, watch } from 'vue';
import api from '@/services/api';
import { toApiErrorMessage } from './crudUi';

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import SepulturaInfoPanel from '@/components/cementerio/SepulturaInfoPanel.vue';

const items = ref([]);
const zonas = ref([]);
const bloques = ref([]);
const estados = ['libre', 'ocupada', 'reservada', 'clausurada'];

const loading = ref(false);
const loadError = ref(null);
const dialog = ref(false);
const saving = ref(false);
const error = ref(null);
const viewDialog = ref(false);
const viewSepulturaId = ref(null);

const form = reactive({
  id: null,
  zona_id: null,
  bloque_id: null,
  fila: 1,
  columna: 1,
  codigo: '',
  tipo: 'nicho',
  estado: 'libre',
  notas: '',
});

const bloquesFiltrados = computed(() => bloques.value.filter((b) => b.zona_id === form.zona_id));

watch(
  () => form.zona_id,
  () => {
    const first = bloquesFiltrados.value[0]?.id ?? null;
    if (first && !bloquesFiltrados.value.some((b) => b.id === form.bloque_id)) {
      form.bloque_id = first;
    }
  }
);

async function loadCatalogos() {
  try {
    const [rz, rb] = await Promise.all([
      api.get('/api/cementerio/admin/zonas'),
      api.get('/api/cementerio/admin/bloques'),
    ]);
    zonas.value = rz.data?.items?.map((z) => ({ id: z.id, nombre: z.nombre })) ?? [];
    bloques.value = rb.data?.items?.map((b) => ({ id: b.id, nombre: b.nombre, zona_id: b.zona_id })) ?? [];
  } catch (e) {
    loadError.value = toApiErrorMessage(e, 'No se pudieron cargar los catálogos (¿permisos?).');
  }
}

async function load() {
  loading.value = true;
  loadError.value = null;
  try {
    const res = await api.get('/api/cementerio/admin/sepulturas');
    items.value = res.data?.items ?? [];
  } catch (e) {
    loadError.value = toApiErrorMessage(e, 'No se pudieron cargar las unidades (¿permisos?).');
  } finally {
    loading.value = false;
  }
}

function openNew() {
  Object.assign(form, {
    id: null,
    zona_id: zonas.value[0]?.id ?? null,
    bloque_id: null,
    fila: 1,
    columna: 1,
    codigo: '',
    tipo: 'nicho',
    estado: 'libre',
    notas: '',
  });
  error.value = null;
  dialog.value = true;
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    zona_id: row.zona_id,
    bloque_id: row.bloque_id,
    fila: row.fila,
    columna: row.columna,
    codigo: row.codigo ?? '',
    tipo: row.tipo ?? 'nicho',
    estado: row.estado ?? 'libre',
    notas: row.notas ?? '',
  });
  error.value = null;
  dialog.value = true;
}

function openView(row) {
  viewSepulturaId.value = row?.id ?? null;
  viewDialog.value = true;
}

async function save() {
  saving.value = true;
  error.value = null;
  try {
    if (form.id) {
      await api.put(`/api/cementerio/admin/sepulturas/${form.id}`, form);
    } else {
      await api.post('/api/cementerio/admin/sepulturas', form);
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
  if (!confirm(`¿Borrar unidad "${row.codigo || row.id}"?`)) return;
  await api.delete(`/api/cementerio/admin/sepulturas/${row.id}`);
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
.grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.error { color: var(--c2-danger, #A61B1B); font-size: 13px; }
@media (max-width: 900px) {
  .grid2, .grid3 { grid-template-columns: 1fr; }
}
</style>

