<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="titulo"
    :style="{ width: '740px', maxWidth: '96vw' }"
    :draggable="false"
    @show="onShow"
  >
    <div v-if="loading" class="estado-msg">
      <i class="pi pi-spin pi-spinner" /> Cargando…
    </div>
    <div v-else-if="loadError" class="estado-msg error">{{ loadError }}</div>

    <div v-else-if="tercero" class="detalle">

      <!-- Identidad -->
      <div class="ident">
        <div class="ident__avatar">
          <i :class="tercero.es_empresa ? 'pi pi-building' : 'pi pi-user'" />
        </div>
        <div class="ident__info">
          <div class="ident__nombre">{{ tercero.nombre_original }}</div>
          <Tag :value="tercero.es_empresa ? 'Empresa' : 'Persona'"
               :severity="tercero.es_empresa ? 'warn' : 'info'" class="ident__tag" />
        </div>
      </div>

      <!-- Identificación -->
      <section class="section">
        <h4 class="section__title">Identificación</h4>
        <div class="grid2">
          <div v-if="!tercero.es_empresa && tercero.dni" class="field-row">
            <span class="label">DNI / NIF</span>
            <span class="mono">{{ tercero.dni }}</span>
          </div>
          <div v-if="tercero.es_empresa && tercero.cif" class="field-row">
            <span class="label">CIF</span>
            <span class="mono">{{ tercero.cif }}</span>
          </div>
          <div v-if="tercero.nombre && !tercero.es_empresa" class="field-row">
            <span class="label">Nombre</span>
            <span>{{ [tercero.nombre, tercero.apellido1, tercero.apellido2].filter(Boolean).join(' ') }}</span>
          </div>
          <div v-if="tercero.es_empresa && tercero.razon_social" class="field-row">
            <span class="label">Razón social</span>
            <span>{{ tercero.razon_social }}</span>
          </div>
        </div>
      </section>

      <!-- Contacto -->
      <section class="section" v-if="tercero.telefono || tercero.email || tercero.direccion || tercero.municipio">
        <h4 class="section__title">Contacto</h4>
        <div class="grid2">
          <div v-if="tercero.telefono" class="field-row">
            <span class="label">Teléfono</span>
            <a :href="'tel:' + tercero.telefono" class="link-contact">{{ tercero.telefono }}</a>
          </div>
          <div v-if="tercero.email" class="field-row">
            <span class="label">Email</span>
            <a :href="'mailto:' + tercero.email" class="link-contact">{{ tercero.email }}</a>
          </div>
          <div v-if="tercero.direccion" class="field-row">
            <span class="label">Dirección</span>
            <span>{{ tercero.direccion }}</span>
          </div>
          <div v-if="tercero.municipio" class="field-row">
            <span class="label">Municipio</span>
            <span>{{ [tercero.municipio, tercero.provincia, tercero.cp].filter(Boolean).join(', ') }}</span>
          </div>
        </div>
      </section>

      <!-- Notas -->
      <section class="section" v-if="tercero.notas">
        <h4 class="section__title">Notas</h4>
        <p class="notas">{{ tercero.notas }}</p>
      </section>

      <!-- Concesiones -->
      <section class="section">
        <h4 class="section__title">
          Concesiones
          <span class="badge-count" v-if="concesiones.length">{{ concesiones.length }}</span>
        </h4>

        <div v-if="loadingConc" class="muted small">Cargando concesiones…</div>
        <div v-else-if="!concesiones.length" class="muted small">Sin concesiones registradas.</div>

        <div v-else class="lista-concesiones">
          <div
            v-for="c in concesiones"
            :key="c.id"
            class="concesion-card"
            @click="abrirConcesion(c)"
          >
            <div class="concesion-card__head">
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
              <span v-if="c.bloque_nombre" class="muted">{{ c.bloque_nombre }}</span>
              <span v-if="c.fecha_concesion" class="muted">{{ c.fecha_concesion }}</span>
              <span v-if="c.difuntos?.length" class="difuntos-mini">
                <i class="pi pi-users" style="font-size:11px" />
                {{ c.difuntos.map(d => d.nombre_completo).join(', ') }}
              </span>
            </div>
            <div class="ver-mas">Ver detalle <i class="pi pi-chevron-right" /></div>
          </div>
        </div>
      </section>
    </div>

    <ConcesionDetalleModal v-model="concDialog" :concesion="concSeleccionada" />

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
import ConcesionDetalleModal from './ConcesionDetalleModal.vue';

const props = defineProps({
  tercero: { type: Object, default: null },
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const loading     = ref(false);
const loadingConc = ref(false);
const loadError   = ref(null);
const concesiones = ref([]);

const concDialog       = ref(false);
const concSeleccionada = ref(null);

const titulo = computed(() => props.tercero?.nombre_original ?? 'Detalle tercero');

async function onShow() {
  if (!props.tercero?.id) return;
  concesiones.value = [];
  loadError.value   = null;
  loadingConc.value = true;
  try {
    const res = await api.get(`/api/cementerio/admin/personas/${props.tercero.id}/concesiones`);
    concesiones.value = res.data?.items ?? [];
  } catch (e) {
    loadError.value = e?.response?.data?.message ?? 'Error al cargar las concesiones.';
  } finally {
    loadingConc.value = false;
  }
}

function abrirConcesion(c) {
  concSeleccionada.value = c;
  concDialog.value = true;
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
.ident { display: flex; align-items: center; gap: 14px; }
.ident__avatar {
  width: 60px; height: 60px; border-radius: 14px; flex-shrink: 0;
  background: rgba(17,134,82,.1); border: 1px solid rgba(17,134,82,.2);
  display: grid; place-items: center;
  color: var(--c2-primary,#118652); font-size: 24px;
}
.ident__info { display: flex; flex-direction: column; gap: 6px; }
.ident__nombre { font-size: 17px; font-weight: 900; color: rgba(23,35,31,.92); }
.ident__tag { width: fit-content; }

/* ── Secciones ─────────────────────────────────────────── */
.section { border-top: 1px solid #eee; padding-top: 12px; }
.section__title {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: var(--c2-primary,#118652);
  margin: 0 0 10px; display: flex; align-items: center; gap: 8px;
}
.badge-count {
  background: var(--c2-primary,#118652); color: white;
  border-radius: 999px; min-width: 20px; height: 20px;
  padding: 0 6px; font-size: 11px; display: inline-flex;
  align-items: center; justify-content: center;
}

.grid2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.field-row { display: flex; flex-direction: column; gap: 3px; }
.label { font-size: 11px; color: #999; }
.mono { font-family: monospace; font-size: 14px; font-weight: 700; }

.link-contact { color: var(--c2-tertiary,#1266A3); font-size: 13px; text-decoration: none; }
.link-contact:hover { text-decoration: underline; }

/* ── Concesiones ───────────────────────────────────────── */
.lista-concesiones { display: grid; gap: 8px; }
.concesion-card {
  border: 1px solid #e5e7e6; border-radius: 10px; padding: 11px 14px;
  cursor: pointer; transition: box-shadow .15s, border-color .15s; display: grid; gap: 5px;
}
.concesion-card:hover { border-color: var(--c2-primary,#118652); box-shadow: 0 2px 10px rgba(17,134,82,.1); }
.concesion-card__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.exp { font-weight: 700; font-size: 14px; }
.chips { display: flex; gap: 5px; flex-wrap: wrap; }
.concesion-card__body { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.badge-codigo { background: var(--c2-primary,#118652); color: white; border-radius: 6px; padding: 2px 8px; font-size: 12px; font-weight: 700; }
.difuntos-mini { font-size: 12px; color: #666; display: flex; align-items: center; gap: 4px; }
.ver-mas { font-size: 12px; color: var(--c2-primary,#118652); font-weight: 600; display: flex; align-items: center; gap: 4px; justify-content: flex-end; }

.notas { font-size: 13px; color: #555; line-height: 1.5; white-space: pre-wrap; }
.muted { color: #999; font-size: 13px; }
.small { font-size: 12px; }
</style>
