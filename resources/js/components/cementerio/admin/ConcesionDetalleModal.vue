<template>
  <Dialog v-model:visible="visible" :header="titulo" modal :style="{ width: '680px', maxWidth: '96vw' }"
          :draggable="false" @hide="$emit('close')">

    <div v-if="concesion" class="detalle">

      <!-- Estado + tipo -->
      <div class="chips">
        <Tag :value="concesion.tipo === 'perpetua' ? 'Perpetua' : 'Temporal'"
             :severity="concesion.tipo === 'perpetua' ? 'warn' : 'info'" />
        <Tag :value="estadoLabel(concesion.estado)" :severity="estadoSeverity(concesion.estado)" />
        <span v-if="concesion.numero_expediente" class="exp">Exp. {{ concesion.numero_expediente }}</span>
      </div>

      <!-- Unidad -->
      <section class="section" v-if="concesion.sepultura_codigo || concesion.zona_nombre">
        <h4 class="section__title">Unidad funeraria</h4>
        <div class="grid2">
          <div v-if="concesion.sepultura_codigo">
            <span class="label">Código</span>
            <span class="badge-codigo">{{ concesion.sepultura_codigo }}</span>
          </div>
          <div v-if="concesion.bloque_nombre">
            <span class="label">Bloque</span>
            <span>{{ concesion.bloque_nombre }}</span>
          </div>
          <div v-if="concesion.zona_nombre">
            <span class="label">Zona</span>
            <span>{{ concesion.zona_nombre }}</span>
          </div>
        </div>
      </section>

      <!-- Fechas e importe -->
      <section class="section">
        <h4 class="section__title">Datos de la concesión</h4>
        <div class="grid2">
          <div v-if="concesion.fecha_concesion">
            <span class="label">Fecha concesión</span>
            <span>{{ concesion.fecha_concesion }}</span>
          </div>
          <div v-if="concesion.fecha_vencimiento">
            <span class="label">Vencimiento</span>
            <span>{{ concesion.fecha_vencimiento }}</span>
          </div>
          <div v-if="concesion.duracion_anos != null">
            <span class="label">Duración</span>
            <span>{{ concesion.duracion_anos }} años</span>
          </div>
          <div v-if="concesion.importe != null">
            <span class="label">Importe</span>
            <span>{{ concesion.importe }} {{ concesion.moneda ?? '' }}</span>
          </div>
        </div>
        <div v-if="concesion.texto_concesion" class="texto-concesion">
          {{ concesion.texto_concesion }}
        </div>
      </section>

      <!-- Concesionarios -->
      <section class="section" v-if="concesion.terceros?.length">
        <h4 class="section__title">Concesionario(s)</h4>
        <div class="lista-personas">
          <div v-for="t in concesion.terceros" :key="t.id" class="persona-row">
            <span class="persona-nombre">{{ t.nombre_original }}</span>
            <span v-if="t.dni" class="muted">{{ t.dni }}</span>
            <Tag v-if="t.rol && t.rol !== 'concesionario'" :value="t.rol" severity="secondary" class="rol-tag" />
          </div>
        </div>
      </section>

      <!-- Difuntos -->
      <section class="section" v-if="concesion.difuntos?.length">
        <h4 class="section__title">Difuntos vinculados</h4>
        <div class="lista-personas">
          <div v-for="d in concesion.difuntos" :key="d.id" class="persona-row">
            <span class="persona-nombre">{{ d.nombre_completo }}</span>
            <div class="persona-meta">
              <span v-if="d.fecha_fallecimiento" class="muted">† {{ d.fecha_fallecimiento }}</span>
              <span v-if="d.fecha_inhumacion" class="muted">Inh. {{ d.fecha_inhumacion }}</span>
              <Tag v-if="d.es_titular" value="Titular" severity="success" class="rol-tag" />
              <span v-else-if="d.parentesco" class="muted">{{ d.parentesco }}</span>
            </div>
          </div>
        </div>
      </section>
      <section class="section" v-else>
        <h4 class="section__title">Difuntos vinculados</h4>
        <p class="muted small">No hay difuntos registrados para esta concesión.</p>
      </section>

      <!-- Notas -->
      <section class="section" v-if="concesion.notas">
        <h4 class="section__title">Notas</h4>
        <p class="notas">{{ concesion.notas }}</p>
      </section>

    </div>

    <template #footer>
      <Button label="Cerrar" severity="secondary" @click="visible = false" />
    </template>
  </Dialog>
</template>

<script setup>
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

const props = defineProps({
  concesion: { type: Object, default: null },
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'close']);

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const titulo = computed(() => {
  if (!props.concesion) return 'Detalle concesión';
  return props.concesion.numero_expediente
    ? `Concesión — Exp. ${props.concesion.numero_expediente}`
    : `Concesión #${props.concesion.id}`;
});

function estadoLabel(estado) {
  const map = { vigente: 'Vigente', vencida: 'Vencida', renovada: 'Renovada', cancelada: 'Cancelada' };
  return map[estado] ?? estado;
}

function estadoSeverity(estado) {
  const map = { vigente: 'success', vencida: 'danger', renovada: 'warn', cancelada: 'secondary' };
  return map[estado] ?? 'info';
}
</script>

<style scoped>
.detalle { display: grid; gap: 16px; }

.chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.exp { font-size: 13px; color: #666; margin-left: 4px; }

.section { border-top: 1px solid #eee; padding-top: 12px; }
.section__title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--c2-primary, #118652);
  margin: 0 0 10px;
}

.grid2 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.grid2 > div { display: flex; flex-direction: column; gap: 2px; }
.label { font-size: 11px; color: #999; }

.badge-codigo {
  display: inline-block;
  background: var(--c2-primary, #118652);
  color: white;
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 13px;
  font-weight: 700;
  width: fit-content;
}

.texto-concesion {
  margin-top: 10px;
  font-size: 13px;
  color: #555;
  font-style: italic;
  line-height: 1.5;
}

.lista-personas { display: grid; gap: 8px; }
.persona-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 6px 10px;
  background: #f8f9f8;
  border-radius: 8px;
}
.persona-nombre { font-weight: 600; font-size: 14px; }
.persona-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rol-tag { font-size: 11px; }

.notas { font-size: 13px; color: #555; line-height: 1.5; white-space: pre-wrap; }
.muted { color: #999; font-size: 13px; }
.small { font-size: 12px; }
</style>
