<template>
  <div class="wrap">
    <div class="toolbar">
      <div class="toolbar__left">
        <span class="title">Concesiones</span>
        <span class="count" v-if="!loading">{{ filtered.length }} registros</span>
      </div>
      <div class="toolbar__right">
        <InputText v-model="q" placeholder="Buscar expediente, concesionario…" class="search" />
        <Button label="Exportar CSV" icon="pi pi-download" severity="secondary" @click="exportCsv" />
        <Button label="Refrescar" icon="pi pi-refresh" severity="secondary" @click="load" />
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <DataTable :value="filtered" stripedRows :loading="loading" paginator :rows="15">
      <Column field="id" header="ID" style="width:70px" />
      <Column field="sepultura_codigo" header="Sepultura" style="width:150px">
        <template #body="{ data }">
          <span v-if="data.sepultura_codigo" class="badge-codigo">{{ data.sepultura_codigo }}</span>
          <span v-else class="muted">—</span>
        </template>
      </Column>
      <Column field="zona_nombre" header="Zona" />
      <Column header="Concesionario">
        <template #body="{ data }">
          <span v-if="concesionario(data)">{{ concesionario(data) }}</span>
          <span v-else class="muted">—</span>
        </template>
      </Column>
      <Column field="numero_expediente" header="Expediente" style="width:150px" />
      <Column header="Tipo" style="width:110px">
        <template #body="{ data }">
          <Tag :value="data.tipo === 'perpetua' ? 'Perpetua' : 'Temporal'"
               :severity="data.tipo === 'perpetua' ? 'warn' : 'info'" />
        </template>
      </Column>
      <Column field="fecha_concesion" header="Concesión" style="width:130px" />
      <Column field="fecha_vencimiento" header="Vencimiento" style="width:130px">
        <template #body="{ data }">{{ data.fecha_vencimiento ?? '—' }}</template>
      </Column>
      <Column header="Estado" style="width:120px">
        <template #body="{ data }">
          <Tag :value="estadoLabel(data.estado)" :severity="estadoSeverity(data.estado)" />
        </template>
      </Column>
      <Column header="Difuntos" style="width:90px;text-align:center">
        <template #body="{ data }">
          <span v-if="data.difuntos?.length" class="muted">{{ data.difuntos.length }}</span>
          <span v-else class="muted">—</span>
        </template>
      </Column>
      <Column style="width:90px">
        <template #body="{ data }">
          <Button icon="pi pi-eye" size="small" text severity="success"
                  v-tooltip.left="'Ver detalle'"
                  @click="abrirDetalle(data)" />
        </template>
      </Column>
    </DataTable>

    <ConcesionDetalleModal v-model="detalleVisible" :concesion="concesionSeleccionada" />
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
import ConcesionDetalleModal from './ConcesionDetalleModal.vue';

const items = ref([]);
const loading = ref(false);
const error = ref(null);
const q = ref('');

const detalleVisible = ref(false);
const concesionSeleccionada = ref(null);

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase();
  if (!s) return items.value;
  return items.value.filter(c =>
    (c.numero_expediente ?? '').toLowerCase().includes(s) ||
    (concesionario(c) ?? '').toLowerCase().includes(s) ||
    (c.sepultura_codigo ?? '').toLowerCase().includes(s) ||
    (c.zona_nombre ?? '').toLowerCase().includes(s)
  );
});

function concesionario(c) {
  const t = c.terceros?.find(t => t.rol === 'concesionario') ?? c.terceros?.[0];
  return t?.nombre_original ?? null;
}

function estadoLabel(estado) {
  const map = { vigente: 'Vigente', vencida: 'Vencida', renovada: 'Renovada', cancelada: 'Cancelada' };
  return map[estado] ?? estado;
}
function estadoSeverity(estado) {
  const map = { vigente: 'success', vencida: 'danger', renovada: 'warn', cancelada: 'secondary' };
  return map[estado] ?? 'info';
}

function abrirDetalle(concesion) {
  concesionSeleccionada.value = concesion;
  detalleVisible.value = true;
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await api.get('/api/cementerio/admin/concesiones');
    items.value = res.data?.items ?? [];
  } catch (e) {
    error.value = toApiErrorMessage(e, 'No se pudieron cargar las concesiones (¿permisos?).');
  } finally {
    loading.value = false;
  }
}

function exportCsv() {
  const headers = ['ID', 'Sepultura', 'Zona', 'Concesionario', 'Expediente', 'Tipo', 'Estado', 'F. Concesión', 'F. Vencimiento', 'Importe', 'Moneda'];
  const rows = filtered.value.map((r) => [
    r.id, r.sepultura_codigo ?? '', r.zona_nombre ?? '',
    concesionario(r) ?? '', r.numero_expediente ?? '',
    r.tipo ?? '', r.estado ?? '',
    r.fecha_concesion ?? '', r.fecha_vencimiento ?? '',
    r.importe ?? '', r.moneda ?? '',
  ]);
  downloadCsv('concesiones.csv', headers, rows);
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
.muted { color: #999; font-size: 13px; }
.badge-codigo {
  background: var(--c2-primary, #118652);
  color: white;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 700;
}
</style>
