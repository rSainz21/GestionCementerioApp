<template>
  <div class="wrap">
    <div class="toolbar">
      <div class="toolbar__left">
        <span class="title">Difuntos</span>
        <span class="count" v-if="!loading">{{ filtered.length }} registros</span>
      </div>
      <div class="toolbar__right">
        <InputText v-model="q" placeholder="Buscar nombre…" class="search" />
        <Button label="Exportar CSV" icon="pi pi-download" severity="secondary" @click="exportCsv" />
        <Button label="Refrescar" icon="pi pi-refresh" severity="secondary" @click="load" />
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <DataTable :value="filtered" filterDisplay="row" v-model:filters="colFilters" stripedRows :loading="loading" paginator :rows="20">
      <Column field="id" header="ID" style="width:70px" />
      <Column field="nombre_completo" header="Nombre completo" :showFilterMenu="false">
        <template #filter="{ filterModel, filterCallback }">
          <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Filtrar nombre…" class="col-filter" />
        </template>
        <template #body="{ data }">
          <button type="button" class="nombre-link" @click="abrirDetalle(data)">
            {{ data.nombre_completo }}
          </button>
        </template>
      </Column>
      <Column header="F. Fallecimiento" style="width:150px">
        <template #filter><span /></template>
        <template #body="{ data }">{{ data.fecha_fallecimiento ?? '—' }}</template>
      </Column>
      <Column header="F. Inhumación" style="width:140px">
        <template #filter><span /></template>
        <template #body="{ data }">{{ data.fecha_inhumacion ?? '—' }}</template>
      </Column>
      <Column field="sepultura_codigo" header="Sepultura" style="width:130px" :showFilterMenu="false">
        <template #filter="{ filterModel, filterCallback }">
          <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Filtrar…" class="col-filter" />
        </template>
        <template #body="{ data }">
          <span v-if="data.sepultura_codigo" class="badge-codigo">{{ data.sepultura_codigo }}</span>
          <span v-else class="muted">Sin asignar</span>
        </template>
      </Column>
      <Column field="expediente" header="Expediente" style="width:140px" :showFilterMenu="false">
        <template #filter="{ filterModel, filterCallback }">
          <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Filtrar…" class="col-filter" />
        </template>
        <template #body="{ data }">
          <span v-if="data.expediente" class="muted small">{{ data.expediente }}</span>
          <span v-else class="muted">—</span>
        </template>
      </Column>
      <Column header="Rol" style="width:110px">
        <template #filter><span /></template>
        <template #body="{ data }">
          <Tag v-if="data.es_principal" value="Titular" severity="success" />
          <span v-else class="muted small">{{ data.parentesco ?? 'Otro' }}</span>
        </template>
      </Column>
      <Column field="notas" header="Notas">
        <template #filter><span /></template>
        <template #body="{ data }">
          <span class="muted small">{{ data.notas ?? '' }}</span>
        </template>
      </Column>
      <Column style="width:52px">
        <template #filter><span /></template>
        <template #body="{ data }">
          <Button icon="pi pi-eye" size="small" text severity="success"
                  v-tooltip.left="'Ver detalle'" @click="abrirDetalle(data)" />
        </template>
      </Column>
    </DataTable>

    <DifuntoDetalleModal v-model="detalleVisible" :difuntoId="difuntoId" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import api from '@/services/api';
import { toApiErrorMessage } from './crudUi';
import DataTable from 'primevue/datatable';
import { FilterMatchMode } from '@primevue/core/api';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import DifuntoDetalleModal from './DifuntoDetalleModal.vue';

const items = ref([]);
const loading = ref(false);
const error = ref(null);
const q = ref('');

const detalleVisible = ref(false);
const difuntoId = ref(null);

function abrirDetalle(row) {
  difuntoId.value = row.id;
  detalleVisible.value = true;
}

const colFilters = ref({
  nombre_completo:  { value: null, matchMode: FilterMatchMode.CONTAINS },
  sepultura_codigo: { value: null, matchMode: FilterMatchMode.CONTAINS },
  expediente:       { value: null, matchMode: FilterMatchMode.CONTAINS },
});

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
    const res = await api.get('/api/cementerio/admin/personas', { params: { tipo: 'difunto' } });
    items.value = res.data?.items ?? [];
  } catch (e) {
    error.value = toApiErrorMessage(e, 'No se pudieron cargar los difuntos.');
  } finally {
    loading.value = false;
  }
}

function exportCsv() {
  const headers = ['ID', 'Nombre completo', 'F. Fallecimiento', 'F. Inhumación', 'Sepultura', 'Titular', 'Parentesco', 'Notas'];
  const rows = filtered.value.map((r) => [
    r.id, r.nombre_completo, r.fecha_fallecimiento ?? '', r.fecha_inhumacion ?? '',
    r.sepultura_codigo ?? '', r.es_principal ? 'Sí' : 'No', r.parentesco ?? '', r.notas ?? '',
  ]);
  downloadCsv('difuntos.csv', headers, rows);
}

function downloadCsv(filename, headers, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
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
.col-filter { width: 100%; font-size: 12px; }
.badge-codigo {
  background: var(--c2-primary, #118652); color: white;
  border-radius: 6px; padding: 2px 8px; font-size: 12px; font-weight: 600;
}
.nombre-link {
  background: none; border: none; padding: 0; cursor: pointer;
  font-size: 13px; font-weight: 600; color: rgba(23,35,31,.88);
  text-align: left;
}
.nombre-link:hover { color: var(--c2-primary,#118652); text-decoration: underline; }
</style>
