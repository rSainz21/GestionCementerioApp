<template>
  <div class="shell">

    <!-- CABECERA ─────────────────────────────────────────────────────────── -->
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
          <i class="pi pi-map-marker" /> Ver en mapa
        </button>
      </div>
    </div>

    <!-- NAVEGACIÓN ─────────────────────────────────────────────────────── -->
    <div v-if="siblingIds.length > 1" class="nav-bar">
      <button class="nav-btn" :disabled="!prevId" @click="goTo(prevId)" title="Nicho anterior">
        <i class="pi pi-chevron-left" />
        <span>{{ prevNumero ?? '' }}</span>
      </button>
      <div class="nav-center"><span class="nav-pos">{{ currentPosLabel }}</span></div>
      <button class="nav-btn nav-btn--right" :disabled="!nextId" @click="goTo(nextId)" title="Nicho siguiente">
        <span>{{ nextNumero ?? '' }}</span>
        <i class="pi pi-chevron-right" />
      </button>
    </div>

    <div v-if="loading" class="loading muted">Cargando…</div>
    <div v-else-if="error" class="loading error">{{ error }}</div>
    <div v-else-if="!item" class="loading muted">Selecciona una unidad para ver su información.</div>

    <div v-else class="body">
      <div class="grid">

        <!-- ══════════════════════════════════════════════════════════════ -->
        <!-- CARD 1: Identidad visual y ubicación                          -->
        <!-- ══════════════════════════════════════════════════════════════ -->
        <section class="card">
          <div class="card__title-row">
            <div class="card__title">Identidad visual y ubicación</div>
            <button v-if="!editUnidad" class="edit-btn" @click="startEditUnidad">
              <i class="pi pi-pencil" /> Editar
            </button>
          </div>

          <!-- Edición unidad -->
          <div v-if="editUnidad" class="edit-form">
            <div class="ef-row">
              <label class="ef-label">Estado</label>
              <select v-model="draftUnidad.estado" class="ef-select">
                <option value="libre">Libre</option>
                <option value="ocupada">Ocupada</option>
                <option value="reservada">Reservada</option>
                <option value="clausurada">Clausurada</option>
              </select>
            </div>
            <div class="ef-row">
              <label class="ef-label">Ubicación (texto)</label>
              <input v-model="draftUnidad.ubicacion_texto" type="text" class="ef-input" />
            </div>
            <div class="ef-row">
              <label class="ef-label">Coordenadas GPS</label>
              <MapaPicker
                :lat="draftUnidad.lat"
                :lon="draftUnidad.lon"
                @update:lat="(v) => (draftUnidad.lat = v)"
                @update:lon="(v) => (draftUnidad.lon = v)"
              />
            </div>
            <div class="ef-row">
              <label class="ef-label">Notas internas</label>
              <textarea v-model="draftUnidad.notas" class="ef-textarea" rows="3"></textarea>
            </div>
            <div v-if="errUnidad" class="error ef-error">{{ errUnidad }}</div>
            <div class="ef-actions">
              <button class="btnsmall btnsmall--primary" :disabled="savingUnidad" @click="saveUnidad">
                <i class="pi pi-check" /> {{ savingUnidad ? 'Guardando…' : 'Guardar' }}
              </button>
              <button class="btnsmall" :disabled="savingUnidad" @click="editUnidad = false">
                <i class="pi pi-times" /> Cancelar
              </button>
            </div>
          </div>

          <!-- Vista unidad -->
          <div v-else class="idv">
            <div class="idv__media">
              <div v-if="fotoPreviewUrl || item?.difunto_titular?.foto_url || item?.imagen_url" class="photo">
                <img :key="mainImageKey" :src="mainImageSrc" alt="Imagen" />
                <div v-if="showPreviewHint" class="muted hint">Vista previa (pendiente de guardar)</div>
              </div>
              <div v-else class="photo photo--empty">
                <i class="pi pi-image" /><div class="muted">Sin foto</div>
              </div>
              <div class="actions">
                <label class="btnsmall">
                  <input type="file" accept="image/*" class="file" @change="onUploadFotoTitular" />
                  <i class="pi pi-camera" />
                  {{ (item?.difunto_titular?.foto_url || item?.imagen_url) ? 'Cambiar foto' : 'Añadir foto' }}
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
                  <div v-if="item.notas"><span class="k">Notas</span><span class="v">{{ item.notas }}</span></div>
                </div>
              </div>
              <div class="box">
                <div class="box__title">Ubicación GIS</div>
                <div v-if="item.ubicacion_texto" class="kv" style="margin-bottom:6px">
                  <div><span class="k">Descripción</span><span class="v">{{ item.ubicacion_texto }}</span></div>
                </div>
                <div class="muted" v-if="!hasCoords && !item.ubicacion_texto">Sin coordenadas.</div>
                <div v-if="hasCoords" class="kv">
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

        <!-- ══════════════════════════════════════════════════════════════ -->
        <!-- CARD 2: Histórico de restos                                   -->
        <!-- ══════════════════════════════════════════════════════════════ -->
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

          <!-- Difuntos -->
          <div class="subcard">
            <div class="subcard__title-row">
              <div class="subcard__title">Difuntos</div>
              <button
                v-if="item.difunto_titular && !editDifunto"
                class="edit-btn edit-btn--sm"
                @click="startEditDifunto"
              >
                <i class="pi pi-pencil" /> Editar
              </button>
            </div>

            <!-- Edición difunto titular -->
            <div v-if="editDifunto" class="edit-form edit-form--sm">
              <div class="ef-row">
                <label class="ef-label">Nombre completo</label>
                <input v-model="draftDifunto.nombre_completo" type="text" class="ef-input" />
              </div>
              <div class="ef-row ef-row--2col">
                <div>
                  <label class="ef-label">Fecha fallecimiento</label>
                  <input v-model="draftDifunto.fecha_fallecimiento" type="date" class="ef-input" />
                </div>
                <div>
                  <label class="ef-label">Fecha inhumación</label>
                  <input v-model="draftDifunto.fecha_inhumacion" type="date" class="ef-input" />
                </div>
              </div>
              <div class="ef-row">
                <label class="ef-label">Parentesco</label>
                <input v-model="draftDifunto.parentesco" type="text" class="ef-input" />
              </div>
              <div class="ef-row">
                <label class="ef-label">Notas</label>
                <textarea v-model="draftDifunto.notas" class="ef-textarea" rows="2"></textarea>
              </div>
              <div v-if="errDifunto" class="error ef-error">{{ errDifunto }}</div>
              <div class="ef-actions">
                <button class="btnsmall btnsmall--primary" :disabled="savingDifunto" @click="saveDifunto">
                  <i class="pi pi-check" /> {{ savingDifunto ? 'Guardando…' : 'Guardar' }}
                </button>
                <button class="btnsmall" :disabled="savingDifunto" @click="editDifunto = false">
                  <i class="pi pi-times" /> Cancelar
                </button>
              </div>
            </div>

            <!-- Vista difuntos -->
            <template v-else>
              <div v-if="item.difunto_titular" class="difunto-row">
                <span class="difunto-nombre">{{ item.difunto_titular.nombre_completo }}</span>
                <span class="difunto-meta muted">
                  <span v-if="item.difunto_titular.fecha_fallecimiento">† {{ item.difunto_titular.fecha_fallecimiento }}</span>
                  <span v-if="item.difunto_titular.fecha_inhumacion"> · Inh. {{ item.difunto_titular.fecha_inhumacion }}</span>
                </span>
              </div>
              <template v-if="difuntosConcesion.length">
                <div v-for="d in difuntosConcesion" :key="d.id" class="difunto-row">
                  <span class="difunto-nombre">{{ d.nombre_completo }}</span>
                  <span class="difunto-meta muted">
                    <span v-if="d.fecha_fallecimiento">† {{ d.fecha_fallecimiento }}</span>
                    <span v-if="d.fecha_inhumacion"> · Inh. {{ d.fecha_inhumacion }}</span>
                    <span v-if="d.parentesco"> · {{ d.parentesco }}</span>
                  </span>
                </div>
              </template>
              <div v-if="!item.difunto_titular && !difuntosConcesion.length" class="muted">Sin difuntos registrados.</div>
            </template>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════════════ -->
        <!-- CARD 3: Datos administrativos y contacto                      -->
        <!-- ══════════════════════════════════════════════════════════════ -->
        <section class="card">
          <div class="card__title">Datos administrativos y contacto</div>

          <!-- Concesión y titularidad -->
          <div class="subcard">
            <div class="subcard__title-row">
              <div class="subcard__title">Concesión y titularidad</div>
              <button
                v-if="item.concesion_vigente && !editConcesion"
                class="edit-btn edit-btn--sm"
                @click="startEditConcesion"
              >
                <i class="pi pi-pencil" /> Editar
              </button>
            </div>

            <!-- Edición concesión -->
            <div v-if="editConcesion" class="edit-form edit-form--sm">
              <div class="ef-row">
                <label class="ef-label">Nº Expediente</label>
                <input v-model="draftConcesion.numero_expediente" type="text" class="ef-input" />
              </div>
              <div class="ef-row ef-row--2col">
                <div>
                  <label class="ef-label">Tipo</label>
                  <select v-model="draftConcesion.tipo" class="ef-select">
                    <option value="temporal">Temporal</option>
                    <option value="perpetua">Perpetua</option>
                  </select>
                </div>
                <div>
                  <label class="ef-label">Estado</label>
                  <select v-model="draftConcesion.estado" class="ef-select">
                    <option value="vigente">Vigente</option>
                    <option value="renovada">Renovada</option>
                    <option value="vencida">Vencida</option>
                    <option value="rescindida">Rescindida</option>
                  </select>
                </div>
              </div>
              <div class="ef-row ef-row--2col">
                <div>
                  <label class="ef-label">Fecha concesión</label>
                  <input v-model="draftConcesion.fecha_concesion" type="date" class="ef-input" />
                </div>
                <div>
                  <label class="ef-label">Fecha vencimiento</label>
                  <input v-model="draftConcesion.fecha_vencimiento" type="date" class="ef-input" />
                </div>
              </div>
              <div class="ef-row ef-row--2col">
                <div>
                  <label class="ef-label">Importe</label>
                  <input v-model.number="draftConcesion.importe" type="number" step="0.01" class="ef-input" />
                </div>
                <div>
                  <label class="ef-label">Moneda</label>
                  <select v-model="draftConcesion.moneda" class="ef-select">
                    <option value="euros">Euros</option>
                    <option value="pesetas">Pesetas</option>
                  </select>
                </div>
              </div>
              <div class="ef-row">
                <label class="ef-label">Descripción</label>
                <textarea v-model="draftConcesion.texto_concesion" class="ef-textarea" rows="2"></textarea>
              </div>
              <div class="ef-row">
                <label class="ef-label">Notas</label>
                <textarea v-model="draftConcesion.notas" class="ef-textarea" rows="2"></textarea>
              </div>
              <div v-if="errConcesion" class="error ef-error">{{ errConcesion }}</div>
              <div class="ef-actions">
                <button class="btnsmall btnsmall--primary" :disabled="savingConcesion" @click="saveConcesion">
                  <i class="pi pi-check" /> {{ savingConcesion ? 'Guardando…' : 'Guardar' }}
                </button>
                <button class="btnsmall" :disabled="savingConcesion" @click="editConcesion = false">
                  <i class="pi pi-times" /> Cancelar
                </button>
              </div>
            </div>

            <!-- Vista concesión -->
            <div v-else>
              <div v-if="!item.concesion_vigente" class="muted">—</div>
              <div v-else class="kv">
                <div><span class="k">Expediente</span><span class="v">{{ item.concesion_vigente.numero_expediente || '—' }}</span></div>
                <div><span class="k">Tipo</span><span class="v">{{ item.concesion_vigente.tipo || '—' }}</span></div>
                <div><span class="k">Estado</span><span class="v">{{ item.concesion_vigente.estado || '—' }}</span></div>
                <div><span class="k">Concesionario</span><span class="v">{{ concesionarioNombre || '—' }}</span></div>
                <div><span class="k">Fecha</span><span class="v">{{ item.concesion_vigente.fecha_concesion || '—' }}</span></div>
                <div v-if="item.concesion_vigente.fecha_vencimiento"><span class="k">Vencimiento</span><span class="v">{{ item.concesion_vigente.fecha_vencimiento }}</span></div>
                <div v-if="item.concesion_vigente.importe != null"><span class="k">Importe</span><span class="v">{{ item.concesion_vigente.importe }} {{ item.concesion_vigente.moneda }}</span></div>
                <div v-if="item.concesion_vigente.texto_concesion"><span class="k">Descripción</span><span class="v" style="font-style:italic">{{ item.concesion_vigente.texto_concesion }}</span></div>
                <div v-if="item.concesion_vigente.notas"><span class="k">Notas</span><span class="v">{{ item.concesion_vigente.notas }}</span></div>
              </div>
            </div>
          </div>

          <!-- Contacto familiar -->
          <div class="subcard">
            <div class="subcard__title-row">
              <div class="subcard__title">Contacto familiar</div>
              <button
                v-if="concesionarioEditable && !editTercero"
                class="edit-btn edit-btn--sm"
                @click="startEditTercero"
              >
                <i class="pi pi-pencil" /> Editar
              </button>
            </div>

            <!-- Edición tercero -->
            <div v-if="editTercero" class="edit-form edit-form--sm">
              <div class="ef-row">
                <label class="ef-label">Nombre completo</label>
                <input v-model="draftTercero.nombre_original" type="text" class="ef-input" />
              </div>
              <div class="ef-row">
                <label class="ef-label">DNI / NIF</label>
                <input v-model="draftTercero.dni" type="text" class="ef-input" />
              </div>
              <div class="ef-row ef-row--2col">
                <div>
                  <label class="ef-label">Teléfono</label>
                  <input v-model="draftTercero.telefono" type="text" class="ef-input" />
                </div>
                <div>
                  <label class="ef-label">Email</label>
                  <input v-model="draftTercero.email" type="email" class="ef-input" />
                </div>
              </div>
              <div class="ef-row">
                <label class="ef-label">Dirección</label>
                <input v-model="draftTercero.direccion" type="text" class="ef-input" />
              </div>
              <div class="ef-row">
                <label class="ef-label">Notas</label>
                <textarea v-model="draftTercero.notas" class="ef-textarea" rows="2"></textarea>
              </div>
              <div v-if="errTercero" class="error ef-error">{{ errTercero }}</div>
              <div class="ef-actions">
                <button class="btnsmall btnsmall--primary" :disabled="savingTercero" @click="saveTercero">
                  <i class="pi pi-check" /> {{ savingTercero ? 'Guardando…' : 'Guardar' }}
                </button>
                <button class="btnsmall" :disabled="savingTercero" @click="editTercero = false">
                  <i class="pi pi-times" /> Cancelar
                </button>
              </div>
            </div>

            <!-- Vista terceros -->
            <div v-else>
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
                    <span v-if="t.direccion">· {{ t.direccion }}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <!-- Documentos adjuntos -->
          <div class="subcard">
            <div class="subcard__title">Documentos adjuntos</div>
            <div class="docs__head">
              <div class="muted">{{ documentos.length ? `${documentos.length} documento(s)` : '—' }}</div>
              <label class="btnsmall">
                <input type="file" class="file" @change="onUploadDocumento" />
                <i class="pi pi-paperclip" /> Adjuntar nuevo
              </label>
            </div>
            <div v-if="docsSaving" class="muted">Subiendo…</div>
            <div v-if="docsError" class="error">{{ docsError }}</div>
            <div v-if="!documentos.length" class="muted">—</div>
            <div v-else class="docs">
              <a v-for="d in documentos" :key="d.id" class="doc"
                :href="d.url || '#'" target="_blank" rel="noreferrer"
                :class="{ disabled: !d.url }"
                @click="(ev) => { if (!d.url) ev.preventDefault(); }">
                <div class="doc__icon"><i class="pi pi-file" /></div>
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
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import api from '@/services/api';
import MapaPicker from '@/components/cementerio/MapaPicker.vue';

const props = defineProps({
  sepulturaId: { type: Number, default: null },
});
const emit = defineEmits(['loaded', 'error', 'navigate']);

// ── Estado principal ─────────────────────────────────────────────────────────
const loading = ref(false);
const error = ref(null);
const item = ref(null);

// ── Foto ─────────────────────────────────────────────────────────────────────
const fotoSaving = ref(false);
const fotoError = ref(null);
const fotoPreviewUrl = ref(null);
const imageCacheBust = ref(0);

// ── Documentos ───────────────────────────────────────────────────────────────
const docsSaving = ref(false);
const docsError = ref(null);

// ── Edición: UNIDAD ──────────────────────────────────────────────────────────
const editUnidad = ref(false);
const savingUnidad = ref(false);
const errUnidad = ref(null);
const draftUnidad = reactive({ estado: '', ubicacion_texto: '', lat: null, lon: null, notas: '' });

function startEditUnidad() {
  Object.assign(draftUnidad, {
    estado: item.value.estado || 'libre',
    ubicacion_texto: item.value.ubicacion_texto || '',
    lat: item.value.lat ?? null,
    lon: item.value.lon ?? null,
    notas: item.value.notas || '',
  });
  errUnidad.value = null;
  editUnidad.value = true;
}

async function saveUnidad() {
  savingUnidad.value = true;
  errUnidad.value = null;
  try {
    const res = await api.put(`/api/cementerio/sepulturas/${item.value.id}`, {
      estado: draftUnidad.estado || null,
      ubicacion_texto: draftUnidad.ubicacion_texto || null,
      lat: draftUnidad.lat ?? null,
      lon: draftUnidad.lon ?? null,
      notas: draftUnidad.notas || null,
    });
    item.value = { ...item.value, ...(res.data?.item ?? {}) };
    editUnidad.value = false;
  } catch (e) {
    errUnidad.value = e?.response?.data?.message ?? 'Error al guardar.';
  } finally {
    savingUnidad.value = false;
  }
}

// ── Edición: DIFUNTO TITULAR ─────────────────────────────────────────────────
const editDifunto = ref(false);
const savingDifunto = ref(false);
const errDifunto = ref(null);
const draftDifunto = reactive({
  nombre_completo: '', fecha_fallecimiento: '', fecha_inhumacion: '', parentesco: '', notas: '',
});

function startEditDifunto() {
  const d = item.value.difunto_titular;
  Object.assign(draftDifunto, {
    nombre_completo:     d.nombre_completo || '',
    fecha_fallecimiento: d.fecha_fallecimiento || '',
    fecha_inhumacion:    d.fecha_inhumacion || '',
    parentesco:          d.parentesco || '',
    notas:               d.notas || '',
  });
  errDifunto.value = null;
  editDifunto.value = true;
}

async function saveDifunto() {
  savingDifunto.value = true;
  errDifunto.value = null;
  try {
    const res = await api.put(`/api/cementerio/difuntos/${item.value.difunto_titular.id}`, {
      nombre_completo:     draftDifunto.nombre_completo || null,
      fecha_fallecimiento: draftDifunto.fecha_fallecimiento || null,
      fecha_inhumacion:    draftDifunto.fecha_inhumacion || null,
      parentesco:          draftDifunto.parentesco || null,
      notas:               draftDifunto.notas || null,
    });
    item.value = {
      ...item.value,
      difunto_titular: { ...item.value.difunto_titular, ...(res.data?.item ?? {}) },
    };
    editDifunto.value = false;
  } catch (e) {
    errDifunto.value = e?.response?.data?.message ?? 'Error al guardar.';
  } finally {
    savingDifunto.value = false;
  }
}

// ── Edición: CONCESIÓN ───────────────────────────────────────────────────────
const editConcesion = ref(false);
const savingConcesion = ref(false);
const errConcesion = ref(null);
const draftConcesion = reactive({
  numero_expediente: '', tipo: 'temporal', estado: 'vigente',
  fecha_concesion: '', fecha_vencimiento: '',
  importe: null, moneda: 'euros',
  texto_concesion: '', notas: '',
});

function startEditConcesion() {
  const c = item.value.concesion_vigente;
  Object.assign(draftConcesion, {
    numero_expediente: c.numero_expediente || '',
    tipo:              c.tipo || 'temporal',
    estado:            c.estado || 'vigente',
    fecha_concesion:   c.fecha_concesion || '',
    fecha_vencimiento: c.fecha_vencimiento || '',
    importe:           c.importe ?? null,
    moneda:            c.moneda || 'euros',
    texto_concesion:   c.texto_concesion || '',
    notas:             c.notas || '',
  });
  errConcesion.value = null;
  editConcesion.value = true;
}

async function saveConcesion() {
  savingConcesion.value = true;
  errConcesion.value = null;
  try {
    const res = await api.put(`/api/cementerio/concesiones/${item.value.concesion_vigente.id}`, {
      numero_expediente: draftConcesion.numero_expediente || null,
      tipo:              draftConcesion.tipo,
      estado:            draftConcesion.estado,
      fecha_concesion:   draftConcesion.fecha_concesion || null,
      fecha_vencimiento: draftConcesion.fecha_vencimiento || null,
      importe:           draftConcesion.importe ?? null,
      moneda:            draftConcesion.moneda,
      texto_concesion:   draftConcesion.texto_concesion || null,
      notas:             draftConcesion.notas || null,
    });
    item.value = {
      ...item.value,
      concesion_vigente: { ...item.value.concesion_vigente, ...(res.data?.item ?? {}) },
    };
    editConcesion.value = false;
  } catch (e) {
    errConcesion.value = e?.response?.data?.message ?? 'Error al guardar.';
  } finally {
    savingConcesion.value = false;
  }
}

// ── Edición: TERCERO (concesionario) ─────────────────────────────────────────
const editTercero = ref(false);
const savingTercero = ref(false);
const errTercero = ref(null);
const draftTercero = reactive({
  nombre_original: '', dni: '', telefono: '', email: '', direccion: '', notas: '',
});

const concesionarioEditable = computed(() => {
  return item.value?.concesion_vigente?.concesionario?.id != null;
});

function startEditTercero() {
  const t = item.value.concesion_vigente.concesionario;
  Object.assign(draftTercero, {
    nombre_original: t.nombre_original || [t.nombre, t.apellido1, t.apellido2].filter(Boolean).join(' ') || '',
    dni:             t.dni || '',
    telefono:        t.telefono || '',
    email:           t.email || '',
    direccion:       t.direccion || '',
    notas:           t.notas || '',
  });
  errTercero.value = null;
  editTercero.value = true;
}

async function saveTercero() {
  savingTercero.value = true;
  errTercero.value = null;
  const tid = item.value.concesion_vigente.concesionario.id;
  try {
    const res = await api.put(`/api/cementerio/terceros/${tid}`, {
      nombre_original: draftTercero.nombre_original || null,
      dni:             draftTercero.dni || null,
      telefono:        draftTercero.telefono || null,
      email:           draftTercero.email || null,
      direccion:       draftTercero.direccion || null,
      notas:           draftTercero.notas || null,
    });
    // Refrescar ítem completo para reflejar terceros actualizados
    await load(item.value.id);
    editTercero.value = false;
  } catch (e) {
    errTercero.value = e?.response?.data?.message ?? 'Error al guardar.';
  } finally {
    savingTercero.value = false;
  }
}

// ── Navegación ───────────────────────────────────────────────────────────────
const siblingIds = ref([]);
const siblingNums = ref([]);
const loadedBloqueId = ref(null);

async function loadSiblings(bloqueId) {
  try {
    const res = await api.get(`/api/cementerio/bloques/${bloqueId}/sepulturas`);
    const payload = res?.data?.items ?? res?.data?.data ?? res?.data ?? [];
    const list = Array.isArray(payload) ? payload : [];
    list.sort((a, b) => {
      const na = a.numero ?? (a.fila * 1000 + a.columna);
      const nb = b.numero ?? (b.fila * 1000 + b.columna);
      return na - nb;
    });
    siblingIds.value = list.map((s) => s.id);
    siblingNums.value = list.map((s) => s.numero ?? `${s.fila}-${s.columna}`);
    loadedBloqueId.value = bloqueId;
  } catch {
    siblingIds.value = [];
    siblingNums.value = [];
    loadedBloqueId.value = null;
  }
}

const currentIndex = computed(() => {
  if (!props.sepulturaId || !siblingIds.value.length) return -1;
  return siblingIds.value.indexOf(props.sepulturaId);
});
const prevId = computed(() => { const i = currentIndex.value; return i > 0 ? siblingIds.value[i - 1] : null; });
const nextId = computed(() => { const i = currentIndex.value; return i >= 0 && i < siblingIds.value.length - 1 ? siblingIds.value[i + 1] : null; });
const prevNumero = computed(() => { const i = currentIndex.value; return i > 0 ? siblingNums.value[i - 1] : null; });
const nextNumero = computed(() => { const i = currentIndex.value; return i >= 0 && i < siblingNums.value.length - 1 ? siblingNums.value[i + 1] : null; });
const currentPosLabel = computed(() => { const i = currentIndex.value; return i < 0 ? '' : `${i + 1} / ${siblingIds.value.length}`; });

function goTo(id) { if (id) emit('navigate', id); }

// ── Foto helpers ─────────────────────────────────────────────────────────────
function setFotoPreview(file) {
  if (fotoPreviewUrl.value) URL.revokeObjectURL(fotoPreviewUrl.value);
  fotoPreviewUrl.value = file ? URL.createObjectURL(file) : null;
}
function withCacheBust(url) {
  if (!url) return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${imageCacheBust.value}`;
}
const mainImageSrc = computed(() => {
  if (fotoPreviewUrl.value) return fotoPreviewUrl.value;
  return withCacheBust(item.value?.difunto_titular?.foto_url || item.value?.imagen_url);
});
const mainImageKey = computed(() => {
  const base = fotoPreviewUrl.value
    ? `preview:${fotoPreviewUrl.value}`
    : `${item.value?.difunto_titular?.foto_url ?? ''}|${item.value?.imagen_url ?? ''}`;
  return `${base}|${imageCacheBust.value}`;
});
const showPreviewHint = computed(() => Boolean(fotoPreviewUrl.value && !item.value?.difunto_titular?.foto_url && !item.value?.imagen_url));

// ── Computed ─────────────────────────────────────────────────────────────────
const estadoLabel = computed(() => {
  const e = (item.value?.estado || '').toLowerCase();
  if (e === 'ocupada') return 'OCUPADO';
  if (e === 'reservada') return 'RESERVADO';
  if (e === 'clausurada') return 'CLAUSURADO';
  return 'LIBRE';
});
const hasCoords = computed(() => Number.isFinite(Number(item.value?.lat)) && Number.isFinite(Number(item.value?.lon)));
const mapsUrl = computed(() => hasCoords.value ? `https://www.google.com/maps?q=${item.value.lat},${item.value.lon}` : null);
const historia = computed(() => Array.isArray(item.value?.movimientos) ? item.value.movimientos : []);
const documentos = computed(() => Array.isArray(item.value?.documentos) ? item.value.documentos : []);
const difuntosConcesion = computed(() => Array.isArray(item.value?.concesion_vigente?.difuntos_concesion) ? item.value.concesion_vigente.difuntos_concesion : []);
const concesionarioNombre = computed(() => {
  const t = item.value?.concesion_vigente?.concesionario;
  if (!t) return null;
  return t.nombre_original || [t.nombre, t.apellido1, t.apellido2].filter(Boolean).join(' ') || null;
});

// ── Formatters ───────────────────────────────────────────────────────────────
function formatNombre(t) {
  return t?.nombre_original || [t?.nombre, t?.apellido1, t?.apellido2].filter(Boolean).join(' ') || '—';
}
function formatFechaHora(s) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return String(s); }
}
function formatBytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return '—';
  if (v < 1024) return `${v} B`;
  const kb = v / 1024; if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024; if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}
function movimientoLabel(tipo) {
  const t = (tipo || '').toLowerCase();
  if (t.includes('inhum')) return 'Inhumación';
  if (t.includes('exhum')) return 'Exhumación';
  if (t.includes('traslad')) return 'Traslado';
  return tipo || 'Movimiento';
}
function scrollToMapa() {
  document.getElementById('mapa-unidades')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Carga ─────────────────────────────────────────────────────────────────────
async function load(id) {
  if (!id) { item.value = null; error.value = null; loading.value = false; return; }
  loading.value = true;
  error.value = null;
  editUnidad.value = false;
  editDifunto.value = false;
  editConcesion.value = false;
  editTercero.value = false;
  try {
    const res = await api.get(`/api/cementerio/sepulturas/${id}`);
    item.value = res.data?.item ?? null;
    if (item.value?.imagen_url || item.value?.difunto_titular?.foto_url) setFotoPreview(null);
    emit('loaded', item.value);
    const bloqueId = item.value?.bloque?.id;
    if (bloqueId && loadedBloqueId.value !== bloqueId) loadSiblings(bloqueId);
    else if (!bloqueId) { siblingIds.value = []; siblingNums.value = []; loadedBloqueId.value = null; }
  } catch (e) {
    error.value = e?.response?.data?.message ?? 'No se pudo cargar el detalle de la unidad.';
    emit('error', error.value);
  } finally {
    loading.value = false;
  }
}

// ── Subir foto ────────────────────────────────────────────────────────────────
async function onUploadFotoTitular(ev) {
  const file = ev?.target?.files?.[0] ?? null;
  if (!file || !item.value?.id) return;
  fotoSaving.value = true;
  fotoError.value = null;
  setFotoPreview(file);
  try {
    const fd = new FormData();
    if (item.value?.difunto_titular?.id) {
      fd.append('foto', file);
      await api.post(`/api/cementerio/difuntos/${item.value.difunto_titular.id}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    } else {
      fd.append('imagen', file);
      await api.post(`/api/cementerio/sepulturas/${item.value.id}/imagen`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    imageCacheBust.value += 1;
    await load(item.value.id);
  } catch (e) {
    const msg = e?.response?.data?.message ?? null;
    fotoError.value = (typeof msg === 'string' && msg.toLowerCase().includes('difunto') && msg.toLowerCase().includes('titular')) ? null : (msg ?? 'No se pudo guardar la foto.');
  } finally {
    fotoSaving.value = false;
    if (ev?.target) ev.target.value = '';
  }
}

// ── Subir documento ───────────────────────────────────────────────────────────
async function onUploadDocumento(ev) {
  const file = ev?.target?.files?.[0] ?? null;
  if (!file || !item.value?.id) return;
  docsSaving.value = true;
  docsError.value = null;
  try {
    const fd = new FormData();
    fd.append('archivo', file);
    await api.post(`/api/cementerio/sepulturas/${item.value.id}/documentos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    await load(item.value.id);
  } catch (e) {
    docsError.value = e?.response?.data?.message ?? 'No se pudo adjuntar el documento.';
  } finally {
    docsSaving.value = false;
    if (ev?.target) ev.target.value = '';
  }
}

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(() => props.sepulturaId, (id) => load(id), { immediate: true });
watch(() => item.value?.difunto_titular?.foto_url, () => { if (item.value?.difunto_titular?.foto_url) setFotoPreview(null); });
watch(() => item.value?.imagen_url, () => { if (item.value?.imagen_url) setFotoPreview(null); });
onBeforeUnmount(() => setFotoPreview(null));
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

/* Cabecera */
.head { background: #0B3A4A; color: white; padding: 12px 14px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.head__kicker { font-size: 12px; opacity: 0.9; font-weight: 700; }
.head__title { margin-top: 2px; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.head__big { font-weight: 900; letter-spacing: 0.2px; }
.head__small { font-weight: 800; opacity: 0.95; }
.head__sep { opacity: 0.65; }
.head__status { margin-top: 6px; font-size: 12px; opacity: 0.95; }

.pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px; font-weight: 900; letter-spacing: 0.3px; text-transform: uppercase; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.22); }
.pill i { font-size: 9px; }
.pill--libre i { color: #34D399; }
.pill--ocupada i { color: #F87171; }
.pill--reservada i { color: #FBBF24; }
.pill--clausurada i { color: #D1D5DB; }

/* Navegación */
.nav-bar { display: flex; align-items: center; justify-content: space-between; background: rgba(11,58,74,0.07); border-bottom: 1px solid rgba(23,35,31,0.08); padding: 6px 10px; gap: 10px; }
.nav-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; border-radius: 10px; border: 1px solid rgba(23,35,31,0.14); background: white; cursor: pointer; font-size: 12px; font-weight: 700; color: rgba(23,35,31,0.85); min-width: 64px; }
.nav-btn:hover:not(:disabled) { background: rgba(11,58,74,0.08); }
.nav-btn:disabled { opacity: 0.38; cursor: not-allowed; }
.nav-btn--right { justify-content: flex-end; }
.nav-center { flex: 1; text-align: center; }
.nav-pos { font-size: 12px; font-weight: 700; color: rgba(23,35,31,0.60); letter-spacing: 0.5px; }

/* Botón cabecera */
.btn { height: 36px; padding: 0 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.10); color: white; cursor: pointer; font-weight: 900; display: inline-flex; align-items: center; gap: 8px; }
.btn--ghost:hover { background: rgba(255,255,255,0.16); }

.loading { padding: 12px 14px; background: white; }

/* Body */
.body { padding: 12px; }
.grid { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 12px; }

/* Cards */
.card { background: white; border-radius: 14px; border: 1px solid rgba(23,35,31,0.10); box-shadow: 0 6px 18px rgba(23,35,31,0.06); padding: 12px; }
.card__title { font-weight: 900; margin-bottom: 10px; color: rgba(23,35,31,0.92); }
.card__title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }

/* Botón editar */
.edit-btn { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 8px; border: 1px solid rgba(23,35,31,0.16); background: rgba(245,247,244,0.9); cursor: pointer; font-size: 12px; font-weight: 700; color: rgba(23,35,31,0.80); flex-shrink: 0; }
.edit-btn:hover { background: rgba(17,134,82,0.08); border-color: var(--c2-primary,#118652); color: var(--c2-primary,#118652); }
.edit-btn--sm { height: 24px; font-size: 11px; padding: 0 8px; }

/* Subcards */
.subcard { margin-top: 12px; border: 1px solid rgba(23,35,31,0.10); border-radius: 12px; padding: 10px; background: rgba(245,247,244,0.45); }
.subcard__title { font-weight: 900; margin-bottom: 8px; }
.subcard__title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }

/* Formulario edición */
.edit-form { display: grid; gap: 10px; }
.edit-form--sm { gap: 8px; }
.ef-row { display: grid; gap: 4px; }
.ef-row--2col { grid-template-columns: 1fr 1fr; gap: 8px; }
.ef-label { font-size: 11px; font-weight: 700; color: rgba(23,35,31,0.65); }
.ef-input, .ef-select { height: 34px; border-radius: 8px; border: 1px solid rgba(23,35,31,0.18); padding: 0 10px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; font-family: inherit; }
.ef-input:focus, .ef-select:focus { border-color: var(--c2-primary,#118652); box-shadow: 0 0 0 3px rgba(17,134,82,0.12); }
.ef-textarea { border-radius: 8px; border: 1px solid rgba(23,35,31,0.18); padding: 8px 10px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; resize: vertical; font-family: inherit; }
.ef-textarea:focus { border-color: var(--c2-primary,#118652); box-shadow: 0 0 0 3px rgba(17,134,82,0.12); }
.ef-error { font-size: 12px; }
.ef-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* Botones small */
.btnsmall { height: 32px; padding: 0 12px; border-radius: 10px; border: 1px solid rgba(23,35,31,0.14); background: rgba(245,247,244,0.95); cursor: pointer; font-weight: 900; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; }
.btnsmall:hover:not(:disabled) { background: rgba(245,247,244,1); }
.btnsmall:disabled { opacity: 0.55; cursor: not-allowed; }
.btnsmall--primary { background: var(--c2-primary,#118652); color: white; border-color: var(--c2-primary,#118652); }
.btnsmall--primary:hover:not(:disabled) { background: var(--c2-primary-dark,#0D6B42); }

/* Identidad visual */
.idv { display: grid; grid-template-columns: 1fr 1.1fr; gap: 12px; }
.idv__media { display: grid; gap: 10px; }
.photo { border-radius: 12px; border: 1px solid rgba(23,35,31,0.12); overflow: hidden; background: rgba(245,247,244,0.8); min-height: 180px; }
.photo img { width: 100%; height: 380px; object-fit: cover; display: block; }
.photo--empty { display: grid; place-items: center; gap: 8px; color: rgba(23,35,31,0.6); min-height: 180px; }
.hint { font-size: 12px; margin-top: 6px; }
.actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.file { display: none; }
.idv__info { display: grid; gap: 10px; }
.box { border: 1px solid rgba(23,35,31,0.10); border-radius: 12px; padding: 10px; background: rgba(245,247,244,0.45); }
.box__title { font-weight: 900; margin-bottom: 8px; }
.link { display: inline-flex; margin-top: 8px; font-weight: 900; font-size: 12px; color: var(--c2-primary,#118652); text-decoration: none; }
.link:hover { text-decoration: underline; }

.kv { display: grid; gap: 6px; font-size: 13px; }
.k { display: inline-block; width: 120px; color: rgba(23,35,31,0.70); font-weight: 900; }
.v { color: rgba(23,35,31,0.92); }

/* Timeline */
.timeline { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.tl { display: grid; grid-template-columns: 14px 1fr; gap: 10px; align-items: start; }
.tl__dot { width: 10px; height: 10px; border-radius: 999px; background: var(--c2-primary,#118652); margin-top: 6px; box-shadow: 0 0 0 4px rgba(17,134,82,0.12); }
.tl__title { font-size: 13px; }
.tl__meta { font-size: 12px; margin-top: 2px; }
.tl__notes { margin-top: 6px; font-size: 12px; color: rgba(23,35,31,0.85); }

/* Difuntos */
.difunto-row { display: flex; flex-direction: column; gap: 2px; padding: 6px 0; border-bottom: 1px dashed rgba(23,35,31,0.10); }
.difunto-row:last-child { border-bottom: none; }
.difunto-nombre { font-weight: 700; font-size: 13px; }
.difunto-meta { font-size: 12px; }

/* Terceros */
.list { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.list__item { border: 1px dashed rgba(23,35,31,0.16); border-radius: 12px; padding: 10px; background: white; }
.list__meta { margin-top: 4px; font-size: 12px; }

/* Documentos */
.docs__head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.docs { display: grid; gap: 10px; }
.doc { display: grid; grid-template-columns: 42px 1fr; gap: 10px; align-items: start; padding: 10px; border-radius: 12px; border: 1px solid rgba(23,35,31,0.12); text-decoration: none; color: inherit; background: white; }
.doc:hover { background: rgba(245,247,244,0.6); }
.doc.disabled { opacity: 0.6; cursor: not-allowed; }
.doc__icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: rgba(23,35,31,0.06); border: 1px solid rgba(23,35,31,0.10); }
.doc__name { font-weight: 900; }
.doc__meta { font-size: 12px; margin-top: 2px; }
.doc__desc { font-size: 12px; margin-top: 6px; color: rgba(23,35,31,0.85); }

/* Responsive */
@media (max-width: 1250px) {
  .grid { grid-template-columns: 1fr; }
  .idv { grid-template-columns: 1fr; }
  .k { width: 110px; }
  .ef-row--2col { grid-template-columns: 1fr; }
}
@media (min-width: 1400px) { .card { padding: 14px; } }
</style>
