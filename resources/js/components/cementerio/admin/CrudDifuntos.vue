<template>
  <div class="wrap">
    <div class="toolbar">
      <div class="toolbar__left">
        <span class="title">Difuntos</span>
        <span class="count" v-if="!loading">{{ filtered.length }} registros</span>
      </div>
      <div class="toolbar__right">
        <InputText v-model="q" placeholder="Buscar nombre…" class="search" />
        <Button label="Refrescar" icon="pi pi-refresh" severity="secondary" @click="load" />
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <DataTable :value="filtered" stripedRows :loading="loading" paginator :rows="20">
      <Column field="id" header="ID" style="width:70px" />
      <Column field="nombre_completo" header="Nombre completo" />
      <Column header="F. Fallecimiento" style="width:150px">
        <template #body="{ data }">{{ data.fecha_fallecimiento ?? '—' }}</template>
      </Column>
      <Column header="F. Inhumación" style="width:140px">
        <template #body="{ data }">{{ data.fecha_inhumacion ?? '—' }}</template>
      </Column>
      <Column header="Unidad" style="width:130px">
        <template #body="{ data }">
          <span v-if="data.sepultura_codigo" class="badge-codigo">{{ data.sepultura_codigo }}</span>
          <span v-else class="muted">Sin asignar</span>
        </template>
      </Column>
      <Column header="Expediente" style="width:140px">
        <template #body="{ data }">
          <span v-if="data.expediente" class="muted small">{{ data.expediente }}</span>
          <span v-else class="muted">—</span>
        </template>
      </Column>
      <Column header="Rol" style="width:110px">
        <template #body="{ data }">
          <Tag v-if="data.es_titular" value="Titular" severity="success" />
          <span v-else class="muted small">{{ data.parentesco ?? 'Otro' }}</span>
        </template>
      </Column>
      <Column field="notas" header="Notas">
        <template #body="{ data }">
          <span class="muted small">{{ data.notas ?? '' }}</span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import api from '@/services/api';
import { toApiErrorMessage } from './crudUi';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';

const items = ref([]);
const loading = ref(false);
const error = ref(null);
const q = ref('');

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase();
  if (!s) return items.value;
  return items.value.filter(d =>
    (d.nombre_completo ?? '').toLowerCase().includes(s)
  );
});

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await api.get('/api/cementerio/admin/difuntos');
    items.value = res.data?.items ?? [];
  } catch (e) {
    error.value = toApiErrorMessage(e, 'No se pudieron cargar los difuntos.');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.wrap { display: grid; gap: 12px; padding: 12px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.toolbar__left { display: flex; align-items: baseline; gap: 10px; }
.toolbar__right { display: flex; align-items: center; gap: 8px; }
.title { font-weight: 900; }
.count { font-size: 13px; color: #888; }
.search { width: 240px; }
.error { color: var(--c2-danger, #A61B1B); font-size: 13px; }
.muted { color: #999; }
.small { font-size: 12px; }
.badge-codigo {
  background: var(--c2-primary, #118652);
  color: white;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
}
</style>
