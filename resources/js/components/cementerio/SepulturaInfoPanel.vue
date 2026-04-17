<template>
  <div class="panel">
    <div class="panel__head">
      <div class="panel__title">Detalle de unidad</div>
      <div class="panel__subtitle" v-if="item">
        <strong>{{ item.codigo || `#${item.id}` }}</strong>
        <span class="muted">· {{ item.estado }}</span>
      </div>
    </div>

    <div v-if="loading" class="panel__body muted">Cargando…</div>
    <div v-else-if="error" class="panel__body error">{{ error }}</div>
    <div v-else-if="!item" class="panel__body muted">Selecciona una unidad para ver su información.</div>

    <div v-else class="panel__body">
      <div class="grid2">
        <div>
          <div class="label">Ubicación</div>
          <div>
            {{ item?.zona?.nombre || '—' }} · {{ item?.bloque?.nombre || '—' }}
          </div>
          <div class="muted" v-if="item.fila && item.columna">
            F{{ item.fila }} · C{{ item.columna }}
          </div>
        </div>
        <div>
          <div class="label">Tipo</div>
          <div>{{ item.tipo || '—' }}</div>
        </div>
      </div>

      <div class="section">
        <div class="section__title">Concesión vigente</div>
        <div v-if="!item.concesion_vigente" class="muted">—</div>
        <div v-else class="kv">
          <div><span class="k">Expediente</span> <span class="v">{{ item.concesion_vigente.numero_expediente || '—' }}</span></div>
          <div><span class="k">Tipo</span> <span class="v">{{ item.concesion_vigente.tipo || '—' }}</span></div>
          <div><span class="k">Fecha concesión</span> <span class="v">{{ item.concesion_vigente.fecha_concesion || '—' }}</span></div>
          <div><span class="k">Vencimiento</span> <span class="v">{{ item.concesion_vigente.fecha_vencimiento || '—' }}</span></div>
          <div><span class="k">Duración</span> <span class="v">{{ item.concesion_vigente.duracion_anos != null ? `${item.concesion_vigente.duracion_anos} años` : '—' }}</span></div>
          <div><span class="k">Estado</span> <span class="v">{{ item.concesion_vigente.estado || '—' }}</span></div>
        </div>

        <div v-if="item.concesion_vigente?.terceros?.length" class="subsection">
          <div class="section__title">Titulares / terceros</div>
          <ul class="list">
            <li v-for="t in item.concesion_vigente.terceros" :key="t.id">
              <strong>{{ formatNombre(t) }}</strong>
              <span class="muted" v-if="t.dni">· {{ t.dni }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="section">
        <div class="section__title">Difunto titular</div>
        <div v-if="!item.difunto_titular" class="muted">—</div>
        <div v-else class="kv">
          <div><span class="k">Nombre</span> <span class="v">{{ item.difunto_titular.nombre_completo || '—' }}</span></div>
          <div><span class="k">Fallecimiento</span> <span class="v">{{ item.difunto_titular.fecha_fallecimiento || '—' }}</span></div>
          <div><span class="k">Inhumación</span> <span class="v">{{ item.difunto_titular.fecha_inhumacion || '—' }}</span></div>
        </div>
      </div>

      <div class="section" v-if="Array.isArray(item.difuntos) && item.difuntos.length > 1">
        <div class="section__title">Otros difuntos</div>
        <ul class="list">
          <li v-for="d in item.difuntos.filter((x) => !x.es_titular)" :key="d.id">
            <strong>{{ d.nombre_completo || '—' }}</strong>
            <span class="muted" v-if="d.fecha_inhumacion">· Inhumación {{ d.fecha_inhumacion }}</span>
          </li>
        </ul>
      </div>

      <div class="section" v-if="item.notas">
        <div class="section__title">Notas</div>
        <div class="muted">{{ item.notas }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import api from '@/services/api';

const props = defineProps({
  sepulturaId: { type: Number, default: null },
});

const emit = defineEmits(['loaded', 'error']);

const loading = ref(false);
const error = ref(null);
const item = ref(null);

function formatNombre(t) {
  const parts = [t?.nombre, t?.apellido1, t?.apellido2].filter(Boolean);
  return parts.join(' ') || '—';
}

async function load(id) {
  if (!id) {
    item.value = null;
    error.value = null;
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const res = await api.get(`/api/cementerio/sepulturas/${id}`);
    item.value = res.data?.item ?? null;
    emit('loaded', item.value);
  } catch (e) {
    error.value = e?.response?.data?.message ?? 'No se pudo cargar el detalle de la unidad.';
    emit('error', error.value);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.sepulturaId,
  (id) => load(id),
  { immediate: true }
);
</script>

<style scoped>
.panel {
  background: white;
  border: 1px solid rgba(23, 35, 31, 0.10);
  border-radius: 14px;
  overflow: hidden;
}
.panel__head {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(23, 35, 31, 0.08);
}
.panel__title { font-weight: 900; }
.panel__subtitle { margin-top: 4px; font-size: 13px; }
.panel__body { padding: 12px 14px; display: grid; gap: 12px; font-size: 13px; }
.muted { color: rgba(23, 35, 31, 0.62); }
.error { color: var(--c2-danger, #A61B1B); }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.label { font-size: 12px; font-weight: 800; color: rgba(23, 35, 31, 0.7); margin-bottom: 4px; }
.section { display: grid; gap: 8px; }
.section__title { font-weight: 900; }
.kv { display: grid; gap: 6px; }
.k { display: inline-block; width: 120px; color: rgba(23, 35, 31, 0.7); font-weight: 800; }
.v { color: rgba(23, 35, 31, 0.92); }
.list { margin: 0; padding-left: 16px; display: grid; gap: 4px; }
@media (max-width: 900px) { .grid2 { grid-template-columns: 1fr; } .k { width: 110px; } }
</style>

