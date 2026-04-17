<template>
  <div class="wrap">
    <div class="toolbar">
      <div class="toolbar__left">
        <span class="title">Concesiones</span>
      </div>
      <div class="toolbar__right">
        <Button label="Refrescar" icon="pi pi-refresh" severity="secondary" @click="load" />
      </div>
    </div>

    <DataTable :value="items" stripedRows :loading="loading" paginator :rows="15">
      <Column field="id" header="ID" style="width:90px" />
      <Column field="sepultura_codigo" header="Unidad" style="width:170px" />
      <Column field="zona_nombre" header="Zona" />
      <Column field="bloque_nombre" header="Bloque" />
      <Column field="concesionario" header="Concesionario" />
      <Column field="concesionario_dni" header="DNI" style="width:140px" />
      <Column field="tipo" header="Tipo" style="width:140px" />
      <Column field="fecha_concesion" header="Concesión" style="width:140px" />
      <Column field="fecha_vencimiento" header="Vencimiento" style="width:140px" />
      <Column field="duracion_anos" header="Duración" style="width:120px">
        <template #body="{ data }">{{ data.duracion_anos != null ? `${data.duracion_anos} años` : '—' }}</template>
      </Column>
      <Column field="estado" header="Estado" style="width:140px" />
    </DataTable>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import api from '@/services/api';

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';

const items = ref([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const res = await api.get('/api/cementerio/admin/concesiones');
    items.value = res.data?.items ?? [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.wrap { display: grid; gap: 12px; padding: 12px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.title { font-weight: 900; }
</style>

