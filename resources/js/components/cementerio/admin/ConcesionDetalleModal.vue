<template>
  <Dialog v-model:visible="visible" :header="titulo" modal :style="{ width: '700px', maxWidth: '96vw' }"
          :draggable="false" @hide="resetRenovar" @show="cargarHistorial">

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

      <!-- Historial de renovaciones -->
      <section class="section" v-if="historial.length > 1">
        <h4 class="section__title">Historial de renovaciones</h4>
        <div class="historial">
          <div v-for="h in historial" :key="h.id"
               class="historial-item"
               :class="{
                 'historial-item--actual': h.rol === 'actual',
                 'historial-item--pasada': h.rol === 'previa',
               }">
            <div class="historial-item__dot" />
            <div class="historial-item__body">
              <div class="historial-item__head">
                <span v-if="h.numero_expediente" class="historial-exp">Exp. {{ h.numero_expediente }}</span>
                <span v-else class="historial-exp">#{{ h.id }}</span>
                <Tag :value="estadoLabel(h.estado)" :severity="estadoSeverity(h.estado)" class="historial-tag" />
                <span v-if="h.rol === 'actual'" class="historial-badge--actual">Actual</span>
              </div>
              <div class="historial-item__meta">
                <span v-if="h.fecha_concesion">{{ h.fecha_concesion }}</span>
                <span v-if="h.fecha_vencimiento"> → {{ h.fecha_vencimiento }}</span>
                <span v-if="h.duracion_anos"> · {{ h.duracion_anos }}a</span>
                <span v-else-if="h.tipo === 'perpetua'"> · Perpetua</span>
                <span v-if="h.importe"> · {{ h.importe }}€</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Formulario de renovación -->
      <section v-if="mostrarRenovar" class="section renovar-form">
        <h4 class="section__title">
          <i class="pi pi-refresh" style="margin-right:4px" />
          Nueva renovación
        </h4>

        <div class="renovar-grid">
          <div class="renovar-field">
            <label>Duración (años) <span class="hint">0 = perpetua</span></label>
            <input v-model.number="renovarForm.duracion_anos" type="number" min="0" max="999" class="r-input" />
          </div>
          <div class="renovar-field">
            <label>Fecha de inicio</label>
            <input v-model="renovarForm.fecha_inicio" type="date" class="r-input" />
          </div>
          <div class="renovar-field">
            <label>Importe (€) <span class="hint">opcional</span></label>
            <input v-model.number="renovarForm.importe" type="number" min="0" step="0.01" class="r-input" />
          </div>
          <div class="renovar-field">
            <label>Nº expediente nuevo <span class="hint">opcional</span></label>
            <input v-model="renovarForm.numero_expediente" type="text" maxlength="100" class="r-input" />
          </div>
        </div>

        <div class="renovar-field" style="margin-top:8px">
          <label>Notas de renovación</label>
          <textarea v-model="renovarForm.notas" class="r-input r-textarea" rows="2" placeholder="Motivo u observaciones…" />
        </div>

        <div v-if="renovarError" class="renovar-error">{{ renovarError }}</div>

        <div class="renovar-btns">
          <button type="button" class="r-btn r-btn--ghost" @click="mostrarRenovar = false">Cancelar</button>
          <button type="button" class="r-btn r-btn--primary" :disabled="renovarLoading" @click="confirmarRenovar">
            <i v-if="renovarLoading" class="pi pi-spin pi-spinner" />
            <i v-else class="pi pi-check" />
            Confirmar renovación
          </button>
        </div>
      </section>

    </div>

    <template #footer>
      <div class="footer-row">
        <div>
          <button
            v-if="puedeRenovar && !mostrarRenovar"
            type="button"
            class="r-btn r-btn--renovar"
            @click="mostrarRenovar = true"
          >
            <i class="pi pi-refresh" />
            Renovar concesión
          </button>
        </div>
        <Button label="Cerrar" severity="secondary" @click="visible = false" />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import api from '@/services/api';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

const props = defineProps({
  concesion:  { type: Object, default: null },
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'close', 'renovada']);

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

// ── Historial ─────────────────────────────────────────────────────────────
const historial = ref([]);

async function cargarHistorial() {
  if (!props.concesion?.id) return;
  historial.value = [];
  try {
    const res = await api.get(`/api/cementerio/concesiones/${props.concesion.id}/historial`);
    historial.value = res.data.historial ?? [];
  } catch { /* silencioso */ }
}

// ── Renovar ───────────────────────────────────────────────────────────────
const mostrarRenovar = ref(false);
const renovarLoading = ref(false);
const renovarError   = ref(null);

const renovarForm = reactive({
  duracion_anos:     50,
  fecha_inicio:      new Date().toISOString().slice(0, 10),
  importe:           null,
  numero_expediente: '',
  notas:             '',
});

const puedeRenovar = computed(() =>
  props.concesion && ['vigente', 'vencida', 'renovada'].includes(props.concesion.estado)
);

function resetRenovar() {
  mostrarRenovar.value = false;
  renovarError.value   = null;
  Object.assign(renovarForm, {
    duracion_anos: 50,
    fecha_inicio: new Date().toISOString().slice(0, 10),
    importe: null,
    numero_expediente: '',
    notas: '',
  });
}

async function confirmarRenovar() {
  renovarError.value   = null;
  renovarLoading.value = true;
  try {
    await api.post(`/api/cementerio/concesiones/${props.concesion.id}/renovar`, renovarForm);
    emit('renovada', props.concesion.id);
    mostrarRenovar.value = false;
    await cargarHistorial();
  } catch (e) {
    renovarError.value = e?.response?.data?.message ?? 'Error al renovar la concesión.';
  } finally {
    renovarLoading.value = false;
  }
}

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
  display: flex;
  align-items: center;
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

/* ── Historial ────────────────────────────────────── */
.historial { display: flex; flex-direction: column; gap: 0; position: relative; padding-left: 18px; }
.historial::before {
  content: '';
  position: absolute;
  left: 6px; top: 8px; bottom: 8px;
  width: 2px;
  background: #e0e4e3;
}
.historial-item { display: flex; align-items: flex-start; gap: 10px; padding: 6px 0; position: relative; }
.historial-item__dot {
  width: 12px; height: 12px; border-radius: 50%;
  background: #d4dbd9; border: 2px solid #fff;
  box-shadow: 0 0 0 2px #d4dbd9;
  flex-shrink: 0; margin-top: 3px; margin-left: -18px;
}
.historial-item--actual .historial-item__dot {
  background: var(--c2-primary, #118652);
  box-shadow: 0 0 0 2px rgba(17,134,82,.25);
}
.historial-item__body { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.historial-item__head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.historial-exp { font-weight: 700; font-size: 13px; }
.historial-tag { font-size: 11px; }
.historial-badge--actual {
  font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em;
  background: var(--c2-primary, #118652); color: #fff;
  border-radius: 4px; padding: 1px 6px;
}
.historial-item__meta { font-size: 11.5px; color: #888; }

/* ── Formulario de renovación ────────────────────── */
.renovar-form { background: #f8fff9; border-radius: 10px; padding: 14px 16px; border: 1px solid rgba(17,134,82,.18); }
.renovar-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.renovar-field { display: flex; flex-direction: column; gap: 4px; }
.renovar-field label { font-size: 12px; font-weight: 600; color: #374240; }
.hint { font-size: 11px; font-weight: 400; color: #999; margin-left: 4px; }
.r-input {
  padding: 7px 10px;
  border: 1px solid #d4dbd9;
  border-radius: 7px;
  font-size: 13px;
  color: #17231f;
  background: #fff;
  outline: none;
  transition: border-color .12s, box-shadow .12s;
}
.r-input:focus {
  border-color: var(--c2-primary, #118652);
  box-shadow: 0 0 0 3px rgba(17,134,82,.12);
}
.r-textarea { resize: vertical; min-height: 56px; }
.renovar-error { font-size: 12.5px; color: #b91c1c; margin-top: 6px; }
.renovar-btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }

.r-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px; border: none;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background .12s, opacity .12s;
}
.r-btn--primary {
  background: var(--c2-primary, #118652); color: #fff;
}
.r-btn--primary:hover:not(:disabled) { filter: brightness(1.08); }
.r-btn--primary:disabled { opacity: .55; cursor: not-allowed; }
.r-btn--ghost { background: #eef1f0; color: #374240; }
.r-btn--ghost:hover { background: #e3e9e7; }
.r-btn--renovar {
  background: #f0fdf4; color: var(--c2-primary, #118652);
  border: 1px solid rgba(17,134,82,.3);
}
.r-btn--renovar:hover { background: #dcfce7; border-color: rgba(17,134,82,.5); }

/* ── Footer ──────────────────────────────────────── */
.footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
}
</style>
