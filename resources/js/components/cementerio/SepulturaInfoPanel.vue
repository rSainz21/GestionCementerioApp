<template>
  <div class="shell">
    <div class="head">
      <div class="head__left">
        <div class="head__kicker">Expediente Digital de Unidad de Enterramiento</div>
        <div class="head__title">
          <span class="head__big">NICHO {{ item?.codigo || '—' }}</span>
          <span class="head__sep">|</span>
          <span class="head__small">{{ item?.bloque?.nombre ? `BLOQUE ${item.bloque.nombre}` : 'BLOQUE —' }}</span>
          <span class="head__sep">·</span>
          <span class="head__small">{{ item?.zona?.nombre ? item.zona.nombre.toUpperCase() : 'ZONA —' }}</span>
        </div>
        <div class="head__status">
          <span class="pill" :class="`pill--${(item?.estado || 'libre').toLowerCase()}`">
            <i class="pi pi-circle-fill" />
            {{ estadoLabel }}
          </span>
          <span class="muted" v-if="item?.concesion_vigente?.estado">· Concesión {{ item.concesion_vigente.estado }}</span>
        </div>
      </div>

      <div class="head__right">
        <button class="btn btn--ghost" type="button" @click="scrollToMapa">
          <i class="pi pi-map-marker" />
          Ver en mapa
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading muted">Cargando…</div>
    <div v-else-if="error" class="loading error">{{ error }}</div>
    <div v-else-if="!item" class="loading muted">Selecciona una unidad para ver su información.</div>

    <div v-else class="body">
      <div class="grid">
        <section class="card">
          <div class="card__title">Identidad visual y ubicación</div>
          <div class="idv">
            <div class="idv__media">
              <div v-if="fotoPreviewUrl || item?.difunto_titular?.foto_url" class="photo">
                <img :src="fotoPreviewUrl || item.difunto_titular.foto_url" alt="Foto del difunto" />
                <div v-if="fotoPreviewUrl && !item.difunto_titular.foto_url" class="muted hint">Vista previa (pendiente de guardar)</div>
              </div>
              <div v-else class="photo photo--empty">
                <i class="pi pi-image" />
                <div class="muted">Sin foto</div>
              </div>

              <div class="actions">
                <label class="btnsmall" :class="{ disabled: !item?.difunto_titular?.id }">
                  <input type="file" accept="image/*" class="file" :disabled="!item?.difunto_titular?.id" @change="onUploadFotoTitular" />
                  <i class="pi pi-camera" />
                  {{ item?.difunto_titular?.foto_url ? 'Cambiar foto' : 'Añadir foto' }}
                </label>
                <span v-if="fotoSaving" class="muted">Guardando…</span>
                <span v-if="fotoError" class="error">{{ fotoError }}</span>
              </div>
            </div>

            <div class="idv__info">
              <div class="box">
                <div class="box__title">Datos de la unidad</div>
                <div class="kv">
                  <div><span class="k">Código</span><span class="v">{{ item.codigo || '—' }}</span></div>
                  <div><span class="k">Fila</span><span class="v">{{ item.fila ?? '—' }}</span></div>
                  <div><span class="k">Nicho</span><span class="v">{{ item.columna ?? '—' }}</span></div>
                  <div><span class="k">Tipo</span><span class="v">{{ item.tipo || '—' }}</span></div>
                </div>
              </div>

              <div class="box">
                <div class="box__title">Ubicación GIS</div>
                <div class="muted" v-if="!hasCoords">Sin coordenadas.</div>
                <div v-else class="kv">
                  <div><span class="k">Lat</span><span class="v">{{ item.lat }}</span></div>
                  <div><span class="k">Lon</span><span class="v">{{ item.lon }}</span></div>
                </div>
                <a v-if="hasCoords" class="link" :href="mapsUrl" target="_blank" rel="noreferrer">
                  Abrir en Google Maps
                </a>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card__title">Histórico de restos (cronología)</div>
          <div v-if="!historia.length" class="muted">—</div>
          <ol v-else class="timeline">
            <li v-for="m in historia" :key="m.id" class="tl">
              <div class="tl__dot"></div>
              <div class="tl__content">
                <div class="tl__title">
                  <strong>{{ movimientoLabel(m.tipo) }}</strong>
                  <span class="muted" v-if="m.fecha">· {{ m.fecha }}</span>
                </div>
                <div class="tl__meta muted">
                  <span v-if="m.sepultura_origen_codigo">Origen {{ m.sepultura_origen_codigo }}</span>
                  <span v-if="m.sepultura_destino_codigo">· Destino {{ m.sepultura_destino_codigo }}</span>
                  <span v-if="m.numero_expediente">· Exp. {{ m.numero_expediente }}</span>
                </div>
                <div v-if="m.notas" class="tl__notes">{{ m.notas }}</div>
              </div>
            </li>
          </ol>

          <div class="subcard">
            <div class="subcard__title">Difunto titular</div>
            <div v-if="!item.difunto_titular" class="muted">—</div>
            <div v-else class="kv">
              <div><span class="k">Nombre</span><span class="v">{{ item.difunto_titular.nombre_completo || '—' }}</span></div>
              <div><span class="k">Fallecimiento</span><span class="v">{{ item.difunto_titular.fecha_fallecimiento || '—' }}</span></div>
              <div><span class="k">Inhumación</span><span class="v">{{ item.difunto_titular.fecha_inhumacion || '—' }}</span></div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card__title">Datos administrativos y contacto</div>

          <div class="subcard">
            <div class="subcard__title">Concesión y titularidad</div>
            <div v-if="!item.concesion_vigente" class="muted">—</div>
            <div v-else class="kv">
              <div><span class="k">Expediente</span><span class="v">{{ item.concesion_vigente.numero_expediente || '—' }}</span></div>
              <div><span class="k">Tipo</span><span class="v">{{ item.concesion_vigente.tipo || '—' }}</span></div>
              <div><span class="k">Fecha actual</span><span class="v">{{ item.concesion_vigente.fecha_concesion || '—' }}</span></div>
              <div><span class="k">Vencimiento</span><span class="v">{{ item.concesion_vigente.fecha_vencimiento || '—' }}</span></div>
              <div><span class="k">Duración</span><span class="v">{{ item.concesion_vigente.duracion_anos != null ? `${item.concesion_vigente.duracion_anos} años` : '—' }}</span></div>
              <div><span class="k">Notas</span><span class="v">{{ item.concesion_vigente.notas || '—' }}</span></div>
            </div>
          </div>

          <div class="subcard">
            <div class="subcard__title">Contacto familiar</div>
            <div v-if="!item.concesion_vigente?.terceros?.length" class="muted">—</div>
            <ul v-else class="list">
              <li v-for="t in item.concesion_vigente.terceros" :key="t.id" class="list__item">
                <div class="list__main">
                  <strong>{{ formatNombre(t) }}</strong>
                  <span class="muted" v-if="t.dni">· {{ t.dni }}</span>
                </div>
                <div class="muted list__meta">
                  <span v-if="t.telefono">{{ t.telefono }}</span>
                  <span v-if="t.email">· {{ t.email }}</span>
                </div>
              </li>
            </ul>
          </div>

          <div class="subcard">
            <div class="subcard__title">Documentos adjuntos</div>
            <div class="docs__head">
              <div class="muted">{{ documentos.length ? `${documentos.length} documento(s)` : '—' }}</div>
              <label class="btnsmall">
                <input type="file" class="file" @change="onUploadDocumento" />
                <i class="pi pi-paperclip" />
                Adjuntar nuevo
              </label>
            </div>

            <div v-if="docsSaving" class="muted">Subiendo…</div>
            <div v-if="docsError" class="error">{{ docsError }}</div>

            <div v-if="!documentos.length" class="muted">—</div>
            <div v-else class="docs">
              <a
                v-for="d in documentos"
                :key="d.id"
                class="doc"
                :href="d.url || '#'"
                target="_blank"
                rel="noreferrer"
                :class="{ disabled: !d.url }"
                @click="(ev) => { if (!d.url) ev.preventDefault(); }"
              >
                <div class="doc__icon">
                  <i class="pi pi-file" />
                </div>
                <div class="doc__body">
                  <div class="doc__name">{{ d.nombre_original || `Documento #${d.id}` }}</div>
                  <div class="muted doc__meta">
                    <span v-if="d.tipo">{{ d.tipo }}</span>
                    <span v-if="d.created_at">· {{ formatFechaHora(d.created_at) }}</span>
                    <span v-if="d.tamano_bytes != null">· {{ formatBytes(d.tamano_bytes) }}</span>
                  </div>
                  <div v-if="d.descripcion" class="doc__desc">{{ d.descripcion }}</div>
                </div>
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import api from '@/services/api';

const props = defineProps({
  sepulturaId: { type: Number, default: null },
});

const emit = defineEmits(['loaded', 'error']);

const loading = ref(false);
const error = ref(null);
const item = ref(null);
const fotoSaving = ref(false);
const fotoError = ref(null);
const fotoPreviewUrl = ref(null);
const docsSaving = ref(false);
const docsError = ref(null);

function setFotoPreview(file) {
  if (fotoPreviewUrl.value) URL.revokeObjectURL(fotoPreviewUrl.value);
  fotoPreviewUrl.value = file ? URL.createObjectURL(file) : null;
}

const estadoLabel = computed(() => {
  const e = (item.value?.estado || '').toLowerCase();
  if (e === 'ocupada') return 'OCUPADO';
  if (e === 'reservada') return 'RESERVADO';
  if (e === 'clausurada') return 'CLAUSURADO';
  return 'LIBRE';
});

const hasCoords = computed(() => {
  const lat = Number(item.value?.lat);
  const lon = Number(item.value?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon);
});

const mapsUrl = computed(() => {
  if (!hasCoords.value) return null;
  return `https://www.google.com/maps?q=${item.value.lat},${item.value.lon}`;
});

const historia = computed(() => {
  const arr = item.value?.movimientos;
  return Array.isArray(arr) ? arr : [];
});

const documentos = computed(() => {
  const arr = item.value?.documentos;
  return Array.isArray(arr) ? arr : [];
});

function formatNombre(t) {
  const parts = [t?.nombre, t?.apellido1, t?.apellido2].filter(Boolean);
  return parts.join(' ') || '—';
}

function formatFechaHora(s) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(s);
    return d.toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(s);
  }
}

function formatBytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return '—';
  if (v < 1024) return `${v} B`;
  const kb = v / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function movimientoLabel(tipo) {
  const t = (tipo || '').toLowerCase();
  if (t.includes('inhum')) return 'Inhumación';
  if (t.includes('exhum')) return 'Exhumación';
  if (t.includes('traslad')) return 'Traslado';
  return tipo || 'Movimiento';
}

function scrollToMapa() {
  const el = document.getElementById('mapa-unidades');
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

async function onUploadFotoTitular(ev) {
  const file = ev?.target?.files?.[0] ?? null;
  if (!file || !item.value?.difunto_titular?.id) return;

  fotoSaving.value = true;
  fotoError.value = null;
  setFotoPreview(file);
  try {
    const fd = new FormData();
    fd.append('foto', file);
    await api.post(`/api/cementerio/difuntos/${item.value.difunto_titular.id}/foto`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await load(item.value.id);
  } catch (e) {
    fotoError.value = e?.response?.data?.message ?? 'No se pudo guardar la foto.';
  } finally {
    fotoSaving.value = false;
    if (ev?.target) ev.target.value = '';
  }
}

async function onUploadDocumento(ev) {
  const file = ev?.target?.files?.[0] ?? null;
  if (!file || !item.value?.id) return;

  docsSaving.value = true;
  docsError.value = null;
  try {
    const fd = new FormData();
    fd.append('archivo', file);
    await api.post(`/api/cementerio/sepulturas/${item.value.id}/documentos`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await load(item.value.id);
  } catch (e) {
    docsError.value = e?.response?.data?.message ?? 'No se pudo adjuntar el documento.';
  } finally {
    docsSaving.value = false;
    if (ev?.target) ev.target.value = '';
  }
}

watch(
  () => props.sepulturaId,
  (id) => load(id),
  { immediate: true }
);

watch(
  () => item.value?.difunto_titular?.foto_url,
  () => {
    if (item.value?.difunto_titular?.foto_url) {
      setFotoPreview(null);
    }
  }
);

onBeforeUnmount(() => {
  setFotoPreview(null);
});
</script>

<style scoped>
.muted { color: rgba(23, 35, 31, 0.62); }
.error { color: var(--c2-danger, #A61B1B); }

.shell {
  background: rgba(245, 247, 244, 0.35);
  border: 1px solid rgba(23, 35, 31, 0.10);
  border-radius: 14px;
  overflow: hidden;
}

.head {
  background: #0B3A4A;
  color: white;
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.head__kicker { font-size: 12px; opacity: 0.9; font-weight: 700; }
.head__title { margin-top: 2px; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.head__big { font-weight: 900; letter-spacing: 0.2px; }
.head__small { font-weight: 800; opacity: 0.95; }
.head__sep { opacity: 0.65; }
.head__status { margin-top: 6px; font-size: 12px; opacity: 0.95; }

.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  font-weight: 900;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.22);
}
.pill i { font-size: 9px; }
.pill--libre i { color: #34D399; }
.pill--ocupada i { color: #F87171; }
.pill--reservada i { color: #FBBF24; }
.pill--clausurada i { color: #D1D5DB; }

.btn {
  height: 36px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.10);
  color: white;
  cursor: pointer;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.btn--ghost:hover { background: rgba(255, 255, 255, 0.16); }

.loading { padding: 12px 14px; background: white; }

.body { padding: 12px; }
.grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 12px;
}

.card {
  background: white;
  border-radius: 14px;
  border: 1px solid rgba(23, 35, 31, 0.10);
  box-shadow: 0 6px 18px rgba(23, 35, 31, 0.06);
  padding: 12px;
}
.card__title { font-weight: 900; margin-bottom: 10px; color: rgba(23, 35, 31, 0.92); }

.idv { display: grid; grid-template-columns: 1fr 1.1fr; gap: 12px; }
.idv__media { display: grid; gap: 10px; }
.photo {
  border-radius: 12px;
  border: 1px solid rgba(23, 35, 31, 0.12);
  overflow: hidden;
  background: rgba(245, 247, 244, 0.8);
  min-height: 180px;
}
.photo img { width: 100%; height: 380px; object-fit: cover; display: block; }
.photo--empty { display: grid; place-items: center; gap: 8px; color: rgba(23, 35, 31, 0.6); }
.hint { font-size: 12px; margin-top: 6px; }

.actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.file { display: none; }
.btnsmall {
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(23, 35, 31, 0.14);
  background: rgba(245, 247, 244, 0.95);
  cursor: pointer;
  font-weight: 900;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.btnsmall:hover { background: rgba(245, 247, 244, 1); }
.btnsmall.disabled { opacity: 0.6; cursor: not-allowed; }
.btnsmall.disabled:hover { background: rgba(245, 247, 244, 0.95); }

.idv__info { display: grid; gap: 10px; }
.box {
  border: 1px solid rgba(23, 35, 31, 0.10);
  border-radius: 12px;
  padding: 10px;
  background: rgba(245, 247, 244, 0.45);
}
.box__title { font-weight: 900; margin-bottom: 8px; }
.link { display: inline-flex; margin-top: 8px; font-weight: 900; font-size: 12px; color: var(--c2-primary, #118652); text-decoration: none; }
.link:hover { text-decoration: underline; }

.kv { display: grid; gap: 6px; font-size: 13px; }
.k { display: inline-block; width: 120px; color: rgba(23, 35, 31, 0.70); font-weight: 900; }
.v { color: rgba(23, 35, 31, 0.92); }

.timeline { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.tl { display: grid; grid-template-columns: 14px 1fr; gap: 10px; align-items: start; }
.tl__dot { width: 10px; height: 10px; border-radius: 999px; background: var(--c2-primary, #118652); margin-top: 6px; box-shadow: 0 0 0 4px rgba(17, 134, 82, 0.12); }
.tl__title { font-size: 13px; }
.tl__meta { font-size: 12px; margin-top: 2px; }
.tl__notes { margin-top: 6px; font-size: 12px; color: rgba(23, 35, 31, 0.85); }

.subcard {
  margin-top: 12px;
  border: 1px solid rgba(23, 35, 31, 0.10);
  border-radius: 12px;
  padding: 10px;
  background: rgba(245, 247, 244, 0.45);
}
.subcard__title { font-weight: 900; margin-bottom: 8px; }

.list { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.list__item { border: 1px dashed rgba(23, 35, 31, 0.16); border-radius: 12px; padding: 10px; background: white; }
.list__meta { margin-top: 4px; font-size: 12px; }

.docs__head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.docs { display: grid; gap: 10px; }
.doc {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 10px;
  align-items: start;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(23, 35, 31, 0.12);
  text-decoration: none;
  color: inherit;
  background: white;
}
.doc:hover { background: rgba(245, 247, 244, 0.6); }
.doc.disabled { opacity: 0.6; cursor: not-allowed; }
.doc__icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(23, 35, 31, 0.06);
  border: 1px solid rgba(23, 35, 31, 0.10);
}
.doc__name { font-weight: 900; }
.doc__meta { font-size: 12px; margin-top: 2px; }
.doc__desc { font-size: 12px; margin-top: 6px; color: rgba(23, 35, 31, 0.85); }

@media (max-width: 1250px) {
  .grid { grid-template-columns: 1fr; }
  .idv { grid-template-columns: 1fr; }
  .k { width: 110px; }
}

@media (min-width: 1400px) { .card { padding: 14px; } }
</style>

