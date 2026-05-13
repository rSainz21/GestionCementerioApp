<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Registrar exhumación"
    :style="{ width: '500px', maxWidth: '96vw' }"
    :draggable="false"
  >
    <div class="form">

      <!-- Difunto -->
      <div class="difunto-card">
        <i class="pi pi-user difunto-card__icon" />
        <div>
          <div class="difunto-card__nombre">{{ difunto?.nombre_completo ?? '—' }}</div>
          <div class="difunto-card__meta">
            <span v-if="difunto?.fecha_fallecimiento">† {{ difunto.fecha_fallecimiento }}</span>
            <span v-if="difunto?.fecha_inhumacion"> · Inh. {{ difunto.fecha_inhumacion }}</span>
          </div>
        </div>
      </div>

      <!-- Info resultado -->
      <div class="info-resultado">
        <i class="pi pi-info-circle" />
        La persona quedará registrada como <strong>restos</strong> en este nicho.
        El nicho quedará <strong>libre</strong> para una nueva inhumación.
      </div>

      <!-- Fecha -->
      <div class="field">
        <label>Fecha de exhumación</label>
        <input v-model="form.fecha" type="date" class="inp" />
      </div>

      <!-- Documento de sanidad (obligatorio) -->
      <div class="field">
        <label>
          Documento de sanidad
          <span class="hint obligatorio">Obligatorio — PDF, JPG o PNG</span>
        </label>
        <div class="file-drop" :class="{ 'file-drop--has': !!form.documento_sanidad }"
             @click="$refs.fileInput.click()">
          <input ref="fileInput" type="file" accept=".pdf,.jpg,.jpeg,.png"
                 class="file-hidden" @change="onFileChange" />
          <template v-if="form.documento_sanidad">
            <i class="pi pi-file-check file-drop__icon file-drop__icon--ok" />
            <span class="file-drop__name">{{ form.documento_sanidad.name }}</span>
            <button type="button" class="file-drop__rm" @click.stop="form.documento_sanidad = null">
              <i class="pi pi-times" />
            </button>
          </template>
          <template v-else>
            <i class="pi pi-upload file-drop__icon" />
            <span>Adjuntar documento de sanidad</span>
          </template>
        </div>
      </div>

      <!-- Motivo -->
      <div class="field">
        <label>Motivo / observaciones <span class="hint">Opcional</span></label>
        <textarea v-model="form.motivo_exhumacion" class="inp inp--ta" rows="2"
                  placeholder="Motivo de la exhumación, observaciones…" />
      </div>

      <!-- Error -->
      <div v-if="error" class="alert-error">
        <i class="pi pi-times-circle" /> {{ error }}
      </div>

    </div>

    <template #footer>
      <Button label="Cancelar" severity="secondary" @click="visible = false" />
      <Button label="Registrar exhumación" severity="danger" :loading="loading" @click="confirmar" />
    </template>
  </Dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import api from '@/services/api';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

const props = defineProps({
  modelValue:  { type: Boolean, default: false },
  sepulturaId: { type: Number, default: null },
  difunto:     { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'exhumado']);

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const loading   = ref(false);
const error     = ref(null);
const fileInput = ref(null);

const form = reactive({
  fecha:              new Date().toISOString().slice(0, 10),
  documento_sanidad:  null,
  motivo_exhumacion:  '',
});

watch(visible, (v) => {
  if (v) {
    error.value = null;
    Object.assign(form, {
      fecha:             new Date().toISOString().slice(0, 10),
      documento_sanidad: null,
      motivo_exhumacion: '',
    });
  }
});

function onFileChange(e) {
  form.documento_sanidad = e.target.files[0] ?? null;
}

async function confirmar() {
  error.value   = null;
  if (!form.documento_sanidad) {
    error.value = 'Debes adjuntar el documento de sanidad para registrar la exhumación.';
    return;
  }
  loading.value = true;
  try {
    const fd = new FormData();
    fd.append('sepultura_id',      String(props.sepulturaId));
    fd.append('persona_id',        String(props.difunto.id));
    fd.append('tipo',              'exhumacion');
    fd.append('estado_resultado',  'restos');
    fd.append('fecha',             form.fecha);
    if (form.motivo_exhumacion)    fd.append('motivo_exhumacion', form.motivo_exhumacion);
    fd.append('documento_sanidad', form.documento_sanidad);

    await api.post('/api/cementerio/workflows/exhumacion', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    visible.value = false;
    emit('exhumado');
  } catch (e) {
    error.value = e?.response?.data?.message ?? 'Error al registrar la exhumación.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.form { display: grid; gap: 14px; }

.difunto-card {
  display: flex; align-items: center; gap: 12px;
  background: #f5f7f4; border-radius: 10px; padding: 10px 14px;
  border: 1px solid #e0e4e3;
}
.difunto-card__icon { font-size: 20px; color: var(--c2-primary, #118652); opacity: .7; }
.difunto-card__nombre { font-size: 15px; font-weight: 700; color: #1c2d29; }
.difunto-card__meta { font-size: 12px; color: #888; margin-top: 2px; }

.info-resultado {
  display: flex; align-items: flex-start; gap: 8px; padding: 10px 13px;
  background: #fff7ed; border: 1px solid rgba(249,115,22,.3); border-radius: 9px;
  font-size: 13px; color: #7c4a00; line-height: 1.5;
}
.info-resultado .pi { font-size: 14px; color: #f97316; flex-shrink: 0; margin-top: 2px; }

.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 12.5px; font-weight: 600; color: #374240; }
.hint { font-size: 11px; font-weight: 400; color: #888; margin-left: 6px; }
.hint.obligatorio { color: #b45309; font-weight: 600; }

.inp {
  padding: 7px 10px; border: 1px solid #d4dbd9; border-radius: 7px;
  font-size: 13px; color: #17231f; background: #fafbfa; outline: none;
  transition: border-color .12s, box-shadow .12s;
}
.inp:focus { border-color: var(--c2-primary, #118652); box-shadow: 0 0 0 3px rgba(17,134,82,.12); background: #fff; }
.inp--ta { resize: vertical; min-height: 60px; }

.file-drop {
  border: 2px dashed #d4dbd9; border-radius: 9px; padding: 12px;
  display: flex; align-items: center; gap: 10px; justify-content: center;
  cursor: pointer; transition: border-color .12s, background .12s;
  font-size: 13px; color: #6b7a77; position: relative;
}
.file-drop:hover { border-color: var(--c2-primary, #118652); background: #f8fff9; }
.file-drop--has { border-style: solid; border-color: #34d399; background: #f0fdf4; justify-content: flex-start; }
.file-hidden { display: none; }
.file-drop__icon { font-size: 18px; opacity: .7; }
.file-drop__icon--ok { color: #16a34a; opacity: 1; }
.file-drop__name { font-size: 13px; font-weight: 600; color: #1c2d29; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-drop__rm {
  background: none; border: none; cursor: pointer; color: #888;
  padding: 2px 6px; border-radius: 4px; flex-shrink: 0;
}
.file-drop__rm:hover { color: #b91c1c; }

.alert-error {
  background: #fee2e2; color: #b91c1c; border-radius: 8px; padding: 10px 12px;
  font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 7px;
}
</style>
