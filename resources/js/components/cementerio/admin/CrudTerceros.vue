<template>
  <div class="wrap">
    <div class="toolbar">
      <div class="toolbar__left">
        <span class="title">Concesionarios / Terceros</span>
        <span class="count" v-if="!loading">{{ filtered.length }} registros</span>
      </div>
      <div class="toolbar__right">
        <InputText v-model="q" placeholder="Buscar nombre, DNI, CIF…" class="search" />
        <Button label="Refrescar" icon="pi pi-refresh" severity="secondary" @click="load" />
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <DataTable :value="filtered" stripedRows :loading="loading" paginator :rows="20">
      <Column field="id" header="ID" style="width:70px" />
      <Column header="Tipo" style="width:100px">
        <template #body="{ data }">
          <Tag :value="data.es_empresa ? 'Empresa' : 'Persona'"
               :severity="data.es_empresa ? 'warn' : 'info'" />
        </template>
      </Column>
      <Column field="nombre_original" header="Nombre / Razón social" />
      <Column header="DNI / CIF" style="width:140px">
        <template #body="{ data }">{{ data.es_empresa ? (data.cif ?? '—') : (data.dni ?? '—') }}</template>
      </Column>
      <Column header="Concesiones" style="width:130px;text-align:center">
        <template #body="{ data }">
          <Button v-if="data.concesiones_count > 0"
                  :label="`Ver ${data.concesiones_count}`"
                  icon="pi pi-file"
                  size="small"
                  severity="success"
                  text
                  @click="verConcesiones(data)" />
          <span v-else class="muted">—</span>
        </template>
      </Column>
      <Column field="notas" header="Notas">
        <template #body="{ data }">
          <span class="muted small">{{ data.notas ?? '' }}</span>
        </template>
      </Column>
    </DataTable>

    <!-- Panel lateral de concesiones del tercero -->
    <Dialog v-model:visible="panelVisible"
            :header="panelTercero ? `Concesiones de ${panelTercero.nombre_original}` : 'Concesiones'"
            modal :style="{ width: '720px', maxWidth: '96vw' }" :draggable="false">

      <div v-if="panelLoading" class="loading-msg">Cargando…</div>
      <div v-else-if="panelError" class="error">{{ panelError }}</div>
      <div v-else-if="panelConcesiones.length === 0" class="muted">No hay concesiones registradas.</div>

      <div v-else class="lista-concesiones">
        <div v-for="c in panelConcesiones" :key="c.id" class="concesion-card"
             @click="abrirDetalle(c)">
          <div class="concesion-card__header">
            <span class="exp">{{ c.numero_expediente ?? `#${c.id}` }}</span>
            <div class="chips">
              <Tag :value="c.tipo === 'perpetua' ? 'Perpetua' : 'Temporal'"
                   :severity="c.tipo === 'perpetua' ? 'warn' : 'info'" />
              <Tag :value="estadoLabel(c.estado)" :severity="estadoSeverity(c.estado)" />
            </div>
          </div>
          <div class="concesion-card__body">
            <span v-if="c.sepultura_codigo" class="badge-codigo">{{ c.sepultura_codigo }}</span>
            <span v-if="c.zona_nombre" class="muted">{{ c.zona_nombre }}</span>
            <span v-if="c.fecha_concesion" class="muted">{{ c.fecha_concesion }}</span>
            <span v-if="c.difuntos?.length" class="difuntos-mini">
              <i class="pi pi-user" style="font-size:11px" />
              {{ c.difuntos.map(d => d.nombre_completo).join(', ') }}
            </span>
          </div>
          <div class="ver-detalle">Ver detalle <i class="pi pi-chevron-right" /></div>
        </div>
      </div>

      <template #footer>
        <Button label="Cerrar" severity="secondary" @click="panelVisible = false" />
      </template>
    </Dialog>

    <!-- Modal detalle de concesión individual -->
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
import Dialog from 'primevue/dialog';
import ConcesionDetalleModal from './ConcesionDetalleModal.vue';

const items = ref([]);
const loading = ref(false);
const error = ref(null);
const q = ref('');

// Panel concesiones del tercero
const panelVisible = ref(false);
const panelLoading = ref(false);
const panelError = ref(null);
const panelTercero = ref(null);
const panelConcesiones = ref([]);

// Modal detalle
const detalleVisible = ref(false);
const concesionSeleccionada = ref(null);

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase();
  if (!s) return items.value;
  return items.value.filter(t =>
    (t.nombre_original ?? '').toLowerCase().includes(s) ||
    (t.dni ?? '').toLowerCase().includes(s) ||
    (t.cif ?? '').toLowerCase().includes(s) ||
    (t.razon_social ?? '').toLowerCase().includes(s)
  );
});

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await api.get('/api/cementerio/admin/terceros');
    items.value = res.data?.items ?? [];
  } catch (e) {
    error.value = toApiErrorMessage(e, 'No se pudieron cargar los terceros.');
  } finally {
    loading.value = false;
  }
}

async function verConcesiones(tercero) {
  panelTercero.value = tercero;
  panelConcesiones.value = [];
  panelError.value = null;
  panelVisible.value = true;
  panelLoading.value = true;
  try {
    const res = await api.get(`/api/cementerio/admin/terceros/${tercero.id}/concesiones`);
    panelConcesiones.value = res.data?.items ?? [];
  } catch (e) {
    panelError.value = toApiErrorMessage(e, 'No se pudieron cargar las concesiones.');
  } finally {
    panelLoading.value = false;
  }
}

function abrirDetalle(concesion) {
  concesionSeleccionada.value = concesion;
  detalleVisible.value = true;
}

function estadoLabel(estado) {
  const map = { vigente: 'Vigente', vencida: 'Vencida', renovada: 'Renovada', cancelada: 'Cancelada' };
  return map[estado] ?? estado;
}
function estadoSeverity(estado) {
  const map = { vigente: 'success', vencida: 'danger', renovada: 'warn', cancelada: 'secondary' };
  return map[estado] ?? 'info';
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
.small { font-size: 12px; }

.loading-msg { color: #888; text-align: center; padding: 20px; }

.lista-concesiones { display: grid; gap: 10px; }

.concesion-card {
  border: 1px solid #e5e7e6;
  border-radius: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: box-shadow .15s, border-color .15s;
  display: grid;
  gap: 6px;
}
.concesion-card:hover {
  border-color: var(--c2-primary, #118652);
  box-shadow: 0 2px 10px rgba(17,134,82,.1);
}
.concesion-card__header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.exp { font-weight: 700; font-size: 15px; }
.chips { display: flex; gap: 6px; }

.concesion-card__body { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.badge-codigo {
  background: var(--c2-primary, #118652);
  color: white;
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 700;
}
.difuntos-mini { font-size: 12px; color: #666; }

.ver-detalle {
  font-size: 12px;
  color: var(--c2-primary, #118652);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}
</style>
