<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="titulo"
    :style="{ width: '680px', maxWidth: '96vw' }"
    :draggable="false"
    @show="onShow"
  >
    <!-- Loading -->
    <div v-if="loading" class="estado-msg">
      <i class="pi pi-spin pi-spinner" /> Cargando…
    </div>
    <div v-else-if="loadError" class="estado-msg error">{{ loadError }}</div>

    <div v-else-if="data" class="detalle">

      <!-- Cabecera: foto + identidad -->
      <div class="ident">
        <div v-if="data.foto_url" class="ident__foto">
          <img :src="data.foto_url" alt="Foto" />
        </div>
        <div v-else class="ident__foto ident__foto--empty">
          <i class="pi pi-user" />
        </div>
        <div class="ident__info">
          <div class="ident__nombre">{{ data.nombre_completo }}</div>
          <div class="ident__chips">
            <Tag v-if="data.es_titular" value="Titular" severity="success" />
            <span v-else-if="data.parentesco" class="chip-muted">{{ data.parentesco }}</span>
          </div>
        </div>
      </div>

      <!-- Fechas -->
      <section class="section">
        <h4 class="section__title">Fechas</h4>
        <div class="grid2">
          <div class="field-row">
            <span class="label">Fallecimiento</span>
            <span>{{ data.fecha_fallecimiento ?? '—' }}</span>
          </div>
          <div class="field-row">
            <span class="label">Inhumación</span>
            <span>{{ data.fecha_inhumacion ?? '—' }}</span>
          </div>
        </div>
      </section>

      <!-- Sepultura -->
      <section class="section">
        <h4 class="section__title">Sepultura asignada</h4>
        <div v-if="data.sepultura" class="sep-card">
          <span class="badge-codigo">{{ data.sepultura.codigo }}</span>
          <div class="sep-card__info">
            <span v-if="data.sepultura.zona_nombre" class="muted">{{ data.sepultura.zona_nombre }}</span>
            <span v-if="data.sepultura.bloque_nombre" class="muted">{{ data.sepultura.bloque_nombre }}</span>
          </div>
          <button type="button" class="btn-ver-sep" @click="verSepultura">
            <i class="pi pi-eye" /> Ver sepultura
          </button>
        </div>
        <p v-else class="muted small">Sin sepultura asignada.</p>
      </section>

      <!-- Concesión -->
      <section class="section" v-if="data.concesion">
        <h4 class="section__title">Concesión vinculada</h4>
        <div class="grid2">
          <div class="field-row" v-if="data.concesion.numero_expediente">
            <span class="label">Expediente</span>
            <span>{{ data.concesion.numero_expediente }}</span>
          </div>
          <div class="field-row">
            <span class="label">Tipo</span>
            <Tag :value="data.concesion.tipo === 'perpetua' ? 'Perpetua' : 'Temporal'"
                 :severity="data.concesion.tipo === 'perpetua' ? 'warn' : 'info'" />
          </div>
          <div class="field-row">
            <span class="label">Estado</span>
            <Tag :value="estadoLabel(data.concesion.estado)" :severity="estadoSeverity(data.concesion.estado)" />
          </div>
          <div class="field-row" v-if="data.concesion.fecha_concesion">
            <span class="label">Fecha concesión</span>
            <span>{{ data.concesion.fecha_concesion }}</span>
          </div>
          <div class="field-row" v-if="data.concesion.fecha_vencimiento">
            <span class="label">Vencimiento</span>
            <span>{{ data.concesion.fecha_vencimiento }}</span>
          </div>
          <div class="field-row" v-if="data.concesion.importe != null">
            <span class="label">Importe</span>
            <span>{{ data.concesion.importe }} {{ data.concesion.moneda ?? '' }}</span>
          </div>
        </div>
        <div v-if="data.concesion.concesionarios?.length" class="concesionarios">
          <span class="label">Concesionario(s)</span>
          <div class="lista-personas">
            <div v-for="t in data.concesion.concesionarios" :key="t.id" class="persona-row">
              <span class="persona-nombre">{{ t.nombre_original }}</span>
              <span v-if="t.dni" class="muted">{{ t.dni }}</span>
            </div>
          </div>
        </div>
      </section>
      <section class="section" v-else>
        <h4 class="section__title">Concesión vinculada</h4>
        <p class="muted small">Sin concesión asociada.</p>
      </section>

      <!-- Tercero vinculado -->
      <section class="section" v-if="data.tercero">
        <h4 class="section__title">Registro civil / tercero</h4>
        <div class="persona-row">
          <span class="persona-nombre">{{ data.tercero.nombre_original }}</span>
          <span v-if="data.tercero.dni" class="muted">{{ data.tercero.dni }}</span>
        </div>
      </section>

      <!-- Notas -->
      <section class="section" v-if="data.notas">
        <h4 class="section__title">Notas</h4>
        <p class="notas">{{ data.notas }}</p>
      </section>
    </div>

    <!-- Dialog: sepultura -->
    <Dialog v-model:visible="sepDialog" modal header="Detalle de sepultura" :style="{ width: 'min(1400px,96vw)' }">
      <SepulturaInfoPanel :sepulturaId="sepId" />
      <template #footer>
        <Button label="Cerrar" severity="secondary" @click="sepDialog = false" />
      </template>
    </Dialog>

    <template #footer>
      <Button label="Cerrar" severity="secondary" @click="visible = false" />
    </template>
  </Dialog>
</template>

<script setup>
import { computed, ref } from 'vue';
import api from '@/services/api';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import SepulturaInfoPanel from '@/components/cementerio/SepulturaInfoPanel.vue';

const props = defineProps({
  difuntoId: { type: Number, default: null },
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const data      = ref(null);
const loading   = ref(false);
const loadError = ref(null);

const sepDialog = ref(false);
const sepId     = ref(null);

const titulo = computed(() => {
  if (!data.value) return 'Detalle difunto';
  return data.value.nombre_completo ?? `Difunto #${props.difuntoId}`;
});

async function onShow() {
  if (!props.difuntoId) return;
  data.value      = null;
  loadError.value = null;
  loading.value   = true;
  try {
    const res = await api.get(`/api/cementerio/difuntos/${props.difuntoId}`);
    data.value = res.data?.item ?? null;
  } catch (e) {
    loadError.value = e?.response?.data?.message ?? 'Error al cargar el difunto.';
  } finally {
    loading.value = false;
  }
}

function verSepultura() {
  if (!data.value?.sepultura?.id) return;
  sepId.value    = data.value.sepultura.id;
  sepDialog.value = true;
}

function estadoLabel(estado) {
  return { vigente: 'Vigente', vencida: 'Vencida', renovada: 'Renovada', cancelada: 'Cancelada' }[estado] ?? estado;
}
function estadoSeverity(estado) {
  return { vigente: 'success', vencida: 'danger', renovada: 'warn', cancelada: 'secondary' }[estado] ?? 'info';
}
</script>

<style scoped>
.estado-msg { padding: 24px; text-align: center; color: #888; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.error { color: var(--c2-danger, #A61B1B); }

.detalle { display: grid; gap: 16px; }

/* ── Identidad ─────────────────────────────────────────── */
.ident { display: flex; align-items: center; gap: 16px; }
.ident__foto {
  width: 72px; height: 72px; border-radius: 14px; overflow: hidden; flex-shrink: 0;
  border: 1px solid rgba(23,35,31,.12);
  display: grid; place-items: center;
  background: rgba(245,247,244,.8);
}
.ident__foto img { width: 100%; height: 100%; object-fit: cover; }
.ident__foto--empty { color: rgba(23,35,31,.35); font-size: 28px; }
.ident__info { display: grid; gap: 6px; }
.ident__nombre { font-size: 18px; font-weight: 900; color: rgba(23,35,31,.92); }
.ident__chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip-muted { font-size: 12px; color: #888; background: #f0f0f0; border-radius: 6px; padding: 2px 8px; }

/* ── Secciones ─────────────────────────────────────────── */
.section { border-top: 1px solid #eee; padding-top: 12px; }
.section__title {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: var(--c2-primary, #118652); margin: 0 0 10px;
}

.grid2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
.field-row { display: flex; flex-direction: column; gap: 3px; }
.label { font-size: 11px; color: #999; }

/* ── Sepultura ─────────────────────────────────────────── */
.sep-card { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 12px; background: #f8f9f8; border-radius: 10px; }
.sep-card__info { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }
.badge-codigo { background: var(--c2-primary,#118652); color: white; border-radius: 6px; padding: 3px 10px; font-size: 13px; font-weight: 700; white-space: nowrap; }
.btn-ver-sep {
  margin-left: auto; border: 1px solid rgba(17,134,82,.35); background: rgba(17,134,82,.06);
  color: var(--c2-primary,#118652); border-radius: 8px; padding: 4px 12px;
  font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;
}
.btn-ver-sep:hover { background: rgba(17,134,82,.12); }

/* ── Concesionarios / personas ────────────────────────── */
.concesionarios { margin-top: 10px; display: grid; gap: 6px; }
.lista-personas { display: grid; gap: 6px; margin-top: 4px; }
.persona-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 6px 10px; background: #f8f9f8; border-radius: 8px; }
.persona-nombre { font-weight: 600; font-size: 13px; }

.notas { font-size: 13px; color: #555; line-height: 1.5; white-space: pre-wrap; }
.muted { color: #999; font-size: 13px; }
.small { font-size: 12px; }
</style>
