<template>
  <div class="page">
    <header class="page__header">
      <div>
        <h2 class="title">Nuevo caso</h2>
        <div class="subtitle">Wizard guiado para alta de concesión y asignación de unidad.</div>
      </div>
      <button class="btn btn--ghost" type="button" @click="$router?.back?.()">
        Volver
      </button>
    </header>

    <div class="steps">
      <button
        v-for="s in steps"
        :key="s.id"
        type="button"
        class="step"
        :class="[step === s.id ? 'step--active' : null]"
        @click="goTo(s.id)"
      >
        <span class="step__num">{{ s.num }}</span>
        <span class="step__label">{{ s.label }}</span>
      </button>
    </div>

    <section class="card">
      <!-- Paso 1: Titular -->
      <div v-if="step === 'titular'" class="card__body">
        <h3 class="h3">1) Titular (concesionario)</h3>

        <div class="grid2">
          <div class="field">
            <label class="label">Buscar por DNI / nombre</label>
            <input
              v-model="titularSearch"
              class="input"
              placeholder="Ej: 12345678Z o García"
              @input="onTitularSearchInput"
            />
            <div v-if="titularLoading" class="help muted">Buscando…</div>
            <div v-else-if="titularItems.length" class="dropdown">
              <button
                v-for="it in titularItems"
                :key="it.id"
                type="button"
                class="dropdown__item"
                @click="selectTitular(it)"
              >
                {{ it.label }}
              </button>
            </div>
            <div v-else class="help muted">Escribe al menos 2 caracteres.</div>
          </div>

          <div class="field">
            <label class="label">Titular existente (ID)</label>
            <input v-model.number="form.titular.id" class="input" type="number" placeholder="ID de cemn_terceros" />
          </div>
        </div>

        <div class="divider" />

        <div class="grid2">
          <div class="field">
            <label class="label">DNI</label>
            <input v-model="form.titular.dni" class="input" :disabled="!!form.titular.id" />
          </div>
          <div class="field">
            <label class="label">Nombre</label>
            <input v-model="form.titular.nombre" class="input" :disabled="!!form.titular.id" />
          </div>
          <div class="field">
            <label class="label">Apellido 1</label>
            <input v-model="form.titular.apellido1" class="input" :disabled="!!form.titular.id" />
          </div>
          <div class="field">
            <label class="label">Apellido 2</label>
            <input v-model="form.titular.apellido2" class="input" :disabled="!!form.titular.id" />
          </div>
          <div class="field">
            <label class="label">Teléfono</label>
            <input v-model="form.titular.telefono" class="input" :disabled="!!form.titular.id" />
          </div>
          <div class="field">
            <label class="label">Dirección</label>
            <input v-model="form.titular.direccion" class="input" :disabled="!!form.titular.id" />
          </div>
        </div>
      </div>

      <!-- Paso 2: Difunto -->
      <div v-else-if="step === 'difunto'" class="card__body">
        <h3 class="h3">2) Datos del difunto</h3>
        <div class="grid2">
          <div class="field span2">
            <label class="label">Nombre completo</label>
            <input v-model="form.difunto.nombre_completo" class="input" placeholder="Nombre y apellidos" />
          </div>
          <div class="field">
            <label class="label">Fecha de fallecimiento</label>
            <input v-model="form.difunto.fecha_fallecimiento" class="input" type="date" />
          </div>
          <div class="field">
            <label class="label">Fecha de inhumación</label>
            <input v-model="form.difunto.fecha_inhumacion" class="input" type="date" />
          </div>
          <div class="field span2">
            <label class="label">Foto (opcional)</label>
            <input class="input" type="file" accept="image/*" @change="onFotoChange" />
            <div v-if="fotoPreviewUrl" class="preview">
              <img :src="fotoPreviewUrl" alt="Previsualización de foto" />
              <button class="btn btn--ghost" type="button" @click="clearFoto">Quitar foto</button>
            </div>
            <div v-else class="help muted">Puedes adjuntarla ahora o más adelante desde el detalle de la unidad.</div>
          </div>
          <div class="field span2">
            <label class="label">Observaciones</label>
            <textarea v-model="form.difunto.notas" class="textarea" rows="4" />
          </div>
        </div>
      </div>

      <!-- Paso 3: Unidad -->
      <div v-else-if="step === 'unidad'" class="card__body">
        <h3 class="h3">3) Asignación de unidad</h3>
        <SelectorNichosGrid
          :zonas="catalogo.zonas"
          :bloques="catalogo.bloques"
          v-model:selectedSepulturaId="form.sepultura_id"
          @selected="onSepulturaSelected"
        />
      </div>

      <!-- Paso 4: Resumen -->
      <div v-else class="card__body">
        <h3 class="h3">4) Resumen y guardado</h3>

        <div class="summary">
          <div class="summary__section">
            <div class="summary__title">Titular</div>
            <div class="summary__body">
              <div v-if="form.titular.id"><strong>ID</strong>: {{ form.titular.id }}</div>
              <div v-else>{{ form.titular.nombre }} {{ form.titular.apellido1 }} {{ form.titular.apellido2 }}</div>
              <div class="muted">{{ form.titular.dni || '—' }}</div>
            </div>
          </div>

          <div class="summary__section">
            <div class="summary__title">Difunto</div>
            <div class="summary__body">
              <div>{{ form.difunto.nombre_completo || '—' }}</div>
              <div class="muted">Fallecimiento: {{ form.difunto.fecha_fallecimiento || '—' }}</div>
            </div>
          </div>

          <div class="summary__section">
            <div class="summary__title">Unidad</div>
            <div class="summary__body">
              <div v-if="form.sepultura_id">
                <strong>ID</strong>: {{ form.sepultura_id }}
              </div>
              <div v-else class="muted">No seleccionada</div>
            </div>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn--primary" type="button" :disabled="saving" @click="guardar">
            {{ saving ? 'Guardando…' : 'Confirmar y guardar' }}
          </button>
          <div v-if="saveError" class="error">{{ saveError }}</div>
          <div v-if="saveOk" class="ok">Caso creado correctamente.</div>
        </div>
      </div>

      <footer class="card__footer">
        <button class="btn btn--ghost" type="button" :disabled="isFirst" @click="prev">Anterior</button>
        <button class="btn btn--primary" type="button" :disabled="isLast" @click="next">Siguiente</button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import SelectorNichosGrid from '@/components/cementerio/SelectorNichosGrid.vue';
import api from '@/services/api';

const steps = [
  { id: 'titular', num: 1, label: 'Titular' },
  { id: 'difunto', num: 2, label: 'Difunto' },
  { id: 'unidad', num: 3, label: 'Unidad' },
  { id: 'resumen', num: 4, label: 'Resumen' },
];

const step = ref('titular');
const titularSearch = ref('');
const titularItems = ref([]);
const titularLoading = ref(false);
let titularTimer = null;

const catalogo = reactive({ zonas: [], bloques: [] });

const form = reactive({
  titular: {
    id: null,
    dni: '',
    nombre: '',
    apellido1: '',
    apellido2: '',
    telefono: '',
    email: '',
    direccion: '',
    municipio: '',
    provincia: '',
    cp: '',
  },
  difunto: {
    nombre_completo: '',
    fecha_fallecimiento: '',
    fecha_inhumacion: '',
    parentesco: '',
    notas: '',
  },
  sepultura_id: null,
  concesion: {
    tipo: 'temporal',
    numero_expediente: '',
    fecha_concesion: '',
    fecha_vencimiento: '',
    duracion_anos: null,
    importe: null,
    moneda: 'euros',
    texto_concesion: '',
    notas: '',
  },
});

const saving = ref(false);
const saveError = ref(null);
const saveOk = ref(false);
const fotoFile = ref(null);
const fotoPreviewUrl = ref(null);

const idx = computed(() => steps.findIndex((s) => s.id === step.value));
const isFirst = computed(() => idx.value <= 0);
const isLast = computed(() => idx.value >= steps.length - 1);

function goTo(id) {
  step.value = id;
}
function next() {
  if (isLast.value) return;
  step.value = steps[idx.value + 1].id;
}
function prev() {
  if (isFirst.value) return;
  step.value = steps[idx.value - 1].id;
}

function onSepulturaSelected() {
  // hook para el futuro: precargar info de unidad seleccionada
}

async function cargarCatalogo() {
  const res = await api.get('/api/cementerio/catalogo');
  catalogo.zonas = res.data?.zonas ?? [];
  catalogo.bloques = res.data?.bloques ?? [];
}

function onTitularSearchInput() {
  if (titularTimer) clearTimeout(titularTimer);
  titularTimer = setTimeout(buscarTitulares, 250);
}

async function buscarTitulares() {
  const q = titularSearch.value?.trim() ?? '';
  if (q.length < 2) {
    titularItems.value = [];
    return;
  }
  titularLoading.value = true;
  try {
    const res = await api.get('/api/cementerio/terceros', { params: { q } });
    titularItems.value = res.data?.items ?? [];
  } finally {
    titularLoading.value = false;
  }
}

function selectTitular(it) {
  form.titular.id = it.id;
  form.titular.dni = it.dni ?? '';
  form.titular.nombre = it.nombre ?? '';
  form.titular.apellido1 = it.apellido1 ?? '';
  form.titular.apellido2 = it.apellido2 ?? '';
  form.titular.telefono = it.telefono ?? '';
  form.titular.email = it.email ?? '';
  form.titular.direccion = it.direccion ?? '';
  titularSearch.value = it.label ?? '';
  titularItems.value = [];
}

async function guardar() {
  saving.value = true;
  saveError.value = null;
  saveOk.value = false;
  try {
    if (fotoFile.value) {
      const fd = new FormData();
      fd.append('sepultura_id', String(form.sepultura_id ?? ''));

      for (const [k, v] of Object.entries(form.titular || {})) {
        if (v !== null && v !== undefined && v !== '') fd.append(`titular[${k}]`, String(v));
      }
      for (const [k, v] of Object.entries(form.difunto || {})) {
        if (v !== null && v !== undefined && v !== '') fd.append(`difunto[${k}]`, String(v));
      }
      for (const [k, v] of Object.entries(form.concesion || {})) {
        if (v !== null && v !== undefined && v !== '') fd.append(`concesion[${k}]`, String(v));
      }

      fd.append('difunto[foto]', fotoFile.value);
      await api.post('/api/cementerio/nuevo-caso', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    } else {
      await api.post('/api/cementerio/nuevo-caso', form);
    }
    saveOk.value = true;
  } catch (e) {
    saveError.value =
      e?.response?.data?.message ??
      (e?.response?.data?.errors ? 'Revisa los campos del formulario.' : 'Error al guardar el caso.');
  } finally {
    saving.value = false;
  }
}

function onFotoChange(ev) {
  const file = ev?.target?.files?.[0] ?? null;
  if (!file) return;
  fotoFile.value = file;
  if (fotoPreviewUrl.value) URL.revokeObjectURL(fotoPreviewUrl.value);
  fotoPreviewUrl.value = URL.createObjectURL(file);
}

function clearFoto() {
  fotoFile.value = null;
  if (fotoPreviewUrl.value) URL.revokeObjectURL(fotoPreviewUrl.value);
  fotoPreviewUrl.value = null;
}

onMounted(async () => {
  await cargarCatalogo();
});
</script>

<style scoped>
.page {
  padding: 18px;
  background: var(--c2-bg, #F5F7F4);
  min-height: 100vh;
}

.page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.title {
  margin: 0;
  color: var(--c2-text, #17231F);
  font-size: 20px;
}

.subtitle {
  margin-top: 4px;
  color: rgba(23, 35, 31, 0.65);
  font-size: 13px;
}

.steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.step {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(23, 35, 31, 0.10);
  background: white;
  cursor: pointer;
}

.step--active {
  border-color: rgba(17, 134, 82, 0.55);
  box-shadow: 0 0 0 4px rgba(17, 134, 82, 0.10);
}

.step__num {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(18, 102, 163, 0.10);
  color: var(--c2-tertiary, #1266A3);
  font-weight: 800;
}

.step__label {
  font-weight: 700;
  color: rgba(23, 35, 31, 0.85);
}

.card {
  background: white;
  border-radius: 14px;
  border: 1px solid rgba(23, 35, 31, 0.10);
  box-shadow: 0 6px 18px rgba(23, 35, 31, 0.06);
}

.card__body {
  padding: 16px;
}

.card__footer {
  padding: 12px 16px 16px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  border-top: 1px solid rgba(23, 35, 31, 0.08);
}

.h3 {
  margin: 0 0 10px;
  font-size: 16px;
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.span2 {
  grid-column: 1 / -1;
}

.field {
  display: grid;
  gap: 6px;
}

.label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(23, 35, 31, 0.75);
}

.input, .textarea {
  border-radius: 10px;
  border: 1px solid rgba(23, 35, 31, 0.18);
  padding: 10px 10px;
  outline: none;
}

.input:focus, .textarea:focus {
  border-color: var(--c2-primary, #118652);
  box-shadow: 0 0 0 4px rgba(17, 134, 82, 0.12);
}

.divider {
  height: 1px;
  background: rgba(23, 35, 31, 0.08);
  margin: 14px 0;
}

.btn {
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(23, 35, 31, 0.14);
  background: white;
  cursor: pointer;
  font-weight: 700;
}

.btn--primary {
  background: var(--c2-primary, #118652);
  color: white;
  border-color: rgba(17, 134, 82, 0.55);
}

.btn--ghost {
  background: transparent;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.muted { color: rgba(23, 35, 31, 0.60); }
.help { font-size: 12px; }

.dropdown {
  border: 1px solid rgba(23, 35, 31, 0.12);
  border-radius: 12px;
  overflow: hidden;
  background: white;
  box-shadow: 0 10px 24px rgba(23, 35, 31, 0.10);
}
.dropdown__item {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: 0;
  background: white;
  cursor: pointer;
}
.dropdown__item:hover {
  background: rgba(17, 134, 82, 0.08);
}

.preview {
  margin-top: 10px;
  display: grid;
  gap: 10px;
  max-width: 360px;
}
.preview img {
  width: 100%;
  max-height: 240px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid rgba(23, 35, 31, 0.12);
}

.summary {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.summary__section {
  border: 1px solid rgba(23, 35, 31, 0.10);
  border-radius: 12px;
  overflow: hidden;
}

.summary__title {
  padding: 10px 12px;
  font-weight: 800;
  background: rgba(245, 247, 244, 0.8);
}

.summary__body {
  padding: 12px;
  font-size: 13px;
  display: grid;
  gap: 6px;
}

.actions {
  margin-top: 14px;
  display: grid;
  gap: 10px;
  max-width: 420px;
}

.error { color: var(--c2-danger, #A61B1B); font-size: 13px; }
.ok { color: var(--c2-success, #0F7A4A); font-size: 13px; font-weight: 700; }

@media (max-width: 900px) {
  .steps { grid-template-columns: 1fr 1fr; }
  .grid2 { grid-template-columns: 1fr; }
  .summary { grid-template-columns: 1fr; }
}
</style>

