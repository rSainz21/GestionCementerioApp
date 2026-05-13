<template>
  <div class="shell">

    <!-- CABECERA ─────────────────────────────────────────────────────────── -->
    <div class="head">
      <div class="head__left">
        <div class="head__kicker">Expediente Digital de Sepultura</div>
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
        <button
          class="btn btn--ghost"
          type="button"
          :disabled="!hasCoords"
          :title="hasCoords ? 'Abrir ubicación en Google Maps' : 'Sin coordenadas GPS'"
          @click="openGoogleMaps"
        >
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
    <div v-else-if="!item" class="loading muted">Selecciona una sepultura para ver su información.</div>

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
                <div class="box__title">Datos de la sepultura</div>
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
              <div class="tl__dot" :class="`tl__dot--${m.tipo}`"></div>
              <div class="tl__content">
                <div class="tl__title">
                  <strong>{{ movimientoLabel(m.tipo) }}</strong>
                  <span v-if="m.difunto_nombre" class="tl__difunto">{{ m.difunto_nombre }}</span>
                  <span class="muted" v-if="m.fecha">· {{ m.fecha }}</span>
                </div>
                <div class="tl__meta muted">
                  <span v-if="m.sepultura_origen_codigo">Origen: {{ m.sepultura_origen_codigo }}</span>
                  <span v-if="m.sepultura_destino_codigo"> → {{ m.sepultura_destino_codigo }}</span>
                  <span v-if="m.numero_expediente"> · Exp. {{ m.numero_expediente }}</span>
                </div>
                <div v-if="m.notas" class="tl__notes">{{ m.notas }}</div>
              </div>
            </li>
          </ol>

          <!-- Difuntos -->
          <div class="subcard">
            <div class="subcard__title-row">
              <div class="subcard__title">Difuntos</div>
              <div v-if="!editDifunto" class="subcard__actions">
                <button v-if="item.difunto_titular" class="edit-btn edit-btn--sm" @click="startEditDifunto">
                  <i class="pi pi-pencil" /> Editar
                </button>
                <button class="edit-btn edit-btn--sm edit-btn--add" @click="toggleAddDifunto">
                  <i :class="showAddDifunto ? 'pi pi-times' : 'pi pi-plus'" />
                  {{ showAddDifunto ? 'Cerrar' : 'Añadir' }}
                </button>
              </div>
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
              <!-- Difuntos inhumados activos -->
              <template v-for="d in difuntosInhumados" :key="d.id">
                <div class="difunto-row">
                  <div class="difunto-row__info">
                    <div class="difunto-row__head">
                      <span class="difunto-nombre">{{ d.nombre_display || d.nombre_completo }}</span>
                      <span v-if="d.es_principal" class="badge-titular">Titular</span>
                    </div>
                    <span class="difunto-meta muted">
                      <span v-if="d.fecha_fallecimiento">† {{ d.fecha_fallecimiento }}</span>
                      <span v-if="d.fecha_inhumacion"> · Inh. {{ d.fecha_inhumacion }}</span>
                      <span v-if="d.parentesco"> · {{ d.parentesco }}</span>
                    </span>
                  </div>
                  <button type="button" class="exhum-btn" @click="abrirExhumacion(d)" title="Registrar exhumación">
                    <i class="pi pi-arrow-up-right" /> Exhumar
                  </button>
                </div>
              </template>

              <!-- Restos en el nicho (permanecen vinculados tras exhumación parcial) -->
              <template v-if="difuntosRestos.length">
                <div class="restos-sep">
                  <span>Restos en el nicho</span>
                </div>
                <div v-for="d in difuntosRestos" :key="d.id" class="difunto-row difunto-row--restos">
                  <div class="difunto-row__info">
                    <div class="difunto-row__head">
                      <span class="difunto-nombre difunto-nombre--restos">{{ d.nombre_completo }}</span>
                      <span class="badge-restos">Restos</span>
                    </div>
                    <span class="difunto-meta muted">
                      <span v-if="d.fecha_fallecimiento">† {{ d.fecha_fallecimiento }}</span>
                      <span v-if="d.fecha_exhumacion"> · Exh. {{ d.fecha_exhumacion }}</span>
                    </span>
                  </div>
                </div>
              </template>

              <div v-if="!difuntosInhumados.length && !difuntosRestos.length" class="muted">Sin difuntos registrados.</div>
            </template>

            <!-- Modal de exhumación -->
            <ExhumacionModal
              v-model="exhumacionVisible"
              :sepulturaId="item?.id"
              :difunto="exhumacionDifunto"
              @exhumado="onExhumado"
            />

            <!-- Panel añadir difunto -->
            <div v-if="showAddDifunto && !editDifunto" class="add-panel">
              <div class="add-panel__tabs">
                <button class="add-tab" :class="{ 'add-tab--active': addDifMode === 'existente' }" @click="addDifMode = 'existente'; ensureDifSinLoaded()">Existente</button>
                <button class="add-tab" :class="{ 'add-tab--active': addDifMode === 'nuevo' }" @click="addDifMode = 'nuevo'">Nuevo</button>
              </div>

              <!-- Existente -->
              <template v-if="addDifMode === 'existente'">
                <input v-model="difSinQ" class="ef-input ef-input--sm" placeholder="Buscar por nombre…" @input="fetchDifSin" />
                <div v-if="difSinLoading" class="muted add-panel__loading">Cargando…</div>
                <div v-else-if="!difuntosSinSep.length" class="muted add-panel__empty">
                  {{ difSinQ ? 'Sin resultados.' : 'No hay difuntos sin asignar.' }}
                </div>
                <div v-else class="add-panel__list">
                  <div v-for="d in difuntosSinSep" :key="d.id" class="add-panel__item">
                    <div class="add-panel__item-info">
                      <span class="add-panel__item-name">{{ d.nombre_completo }}</span>
                      <span class="add-panel__item-meta muted" v-if="d.fecha_fallecimiento">† {{ d.fecha_fallecimiento }}</span>
                    </div>
                    <button class="btnsmall btnsmall--primary" :disabled="savingDifHuerfano === d.id" @click="vincularYCerrarDif(d)">
                      <i class="pi pi-link" /> {{ savingDifHuerfano === d.id ? '…' : 'Vincular' }}
                    </button>
                  </div>
                </div>
              </template>

              <!-- Nuevo -->
              <template v-else>
                <input v-model="addDifNombre" class="ef-input ef-input--sm" placeholder="Nombre completo *" :disabled="addDifSaving" />
                <input v-model="addDifFecha" type="date" class="ef-input ef-input--sm" :disabled="addDifSaving" title="Fecha de fallecimiento" />
                <label class="add-panel__check">
                  <input type="checkbox" v-model="addDifTitular" :disabled="addDifSaving" />
                  Es titular de la sepultura
                </label>
                <div v-if="addDifError" class="error ef-error">{{ addDifError }}</div>
                <div class="ef-actions">
                  <button class="btnsmall btnsmall--primary" :disabled="addDifSaving" @click="crearYVincularDifunto">
                    <i v-if="addDifSaving" class="pi pi-spin pi-spinner" />
                    {{ addDifSaving ? 'Creando…' : 'Crear y vincular' }}
                  </button>
                </div>
              </template>
            </div>
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
              <div v-if="!editConcesion" class="subcard__actions">
                <button v-if="item.concesion_vigente" class="edit-btn edit-btn--sm" @click="startEditConcesion">
                  <i class="pi pi-pencil" /> Editar
                </button>
                <button class="edit-btn edit-btn--sm edit-btn--add" @click="toggleAddConcesion">
                  <i :class="showAddConcesion ? 'pi pi-times' : 'pi pi-plus'" />
                  {{ showAddConcesion ? 'Cerrar' : 'Añadir' }}
                </button>
              </div>
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

            <!-- Panel añadir concesión -->
            <div v-if="showAddConcesion && !editConcesion" class="add-panel">
              <div class="add-panel__tabs">
                <button class="add-tab" :class="{ 'add-tab--active': addConcMode === 'existente' }" @click="addConcMode = 'existente'; ensureConcSinLoaded()">Existente</button>
                <button class="add-tab" :class="{ 'add-tab--active': addConcMode === 'nuevo' }" @click="addConcMode = 'nuevo'">Nueva</button>
              </div>

              <!-- Existente -->
              <template v-if="addConcMode === 'existente'">
                <div v-if="concSinLoading" class="muted add-panel__loading">Cargando…</div>
                <div v-else-if="!concesionesSinSep.length" class="muted add-panel__empty">
                  No hay concesiones sin asignar.
                </div>
                <div v-else class="add-panel__list">
                  <div v-for="c in concesionesSinSep" :key="c.id" class="add-panel__item">
                    <div class="add-panel__item-info">
                      <span class="add-panel__item-name">{{ c.concesionario || `Concesión #${c.id}` }}</span>
                      <span class="add-panel__item-meta muted">{{ c.numero_expediente || '—' }} · {{ c.tipo }}</span>
                    </div>
                    <button class="btnsmall btnsmall--primary" :disabled="savingConcHuerfano === c.id" @click="vincularYCerrarConc(c)">
                      <i class="pi pi-link" /> {{ savingConcHuerfano === c.id ? '…' : 'Vincular' }}
                    </button>
                  </div>
                </div>
              </template>

              <!-- Nueva -->
              <template v-else>
                <input v-model="addConcExp" class="ef-input ef-input--sm" placeholder="Nº expediente (opcional)" :disabled="addConcSaving" />
                <div class="add-panel__tipo-row">
                  <button type="button" class="add-tipo-btn" :class="{ 'add-tipo-btn--active': addConcTipo === 'perpetua' }" :disabled="addConcSaving" @click="addConcTipo = 'perpetua'">Perpetua</button>
                  <button type="button" class="add-tipo-btn" :class="{ 'add-tipo-btn--active': addConcTipo === 'temporal' }" :disabled="addConcSaving" @click="addConcTipo = 'temporal'">Temporal</button>
                </div>
                <input v-model="addConcFecha" type="date" class="ef-input ef-input--sm" :disabled="addConcSaving" title="Fecha de concesión" />
                <div v-if="addConcError" class="error ef-error">{{ addConcError }}</div>
                <div class="ef-actions">
                  <button class="btnsmall btnsmall--primary" :disabled="addConcSaving" @click="crearYVincularConcesion">
                    <i v-if="addConcSaving" class="pi pi-spin pi-spinner" />
                    {{ addConcSaving ? 'Creando…' : 'Crear y vincular' }}
                  </button>
                </div>
              </template>
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

      <!-- Registros sin asignar: desplegable a ancho completo (debajo del grid) -->
      <section class="card card--full card--collapse-outer">
        <button class="card__collapse-btn card__collapse-btn--outer" type="button" @click="huerfanosOpen = !huerfanosOpen">
          <div>
            <div class="collapse-outer__title">
              Registros sin asignar
              <span v-if="huerfanosTotales" class="badge-warn">{{ huerfanosTotales }}</span>
            </div>
            <div class="collapse-outer__sub muted">
              Vincular difuntos o concesiones pendientes a esta sepultura
            </div>
          </div>
          <i :class="huerfanosOpen ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" class="collapse-icon" />
        </button>

        <div v-if="huerfanosOpen" class="huerfanos-body huerfanos-body--outer">

          <div class="subcard">
            <div class="subcard__title-row">
              <div class="subcard__title">
                Difuntos sin sepultura
                <span v-if="difuntosSinSep.length" class="badge-warn">{{ difuntosSinSep.length }}</span>
              </div>
              <input
                v-model="difSinQ"
                class="ef-input ef-input--sm"
                placeholder="Buscar…"
                @input="fetchDifSin"
              />
            </div>
            <div v-if="difSinLoading" class="muted" style="padding:8px">Cargando…</div>
            <div v-else-if="!difuntosSinSep.length" class="muted" style="padding:8px">
              {{ difSinQ ? 'Sin resultados.' : 'No hay difuntos sin asignar.' }}
            </div>
            <div v-else class="hlist">
              <div v-for="d in difuntosSinSep" :key="d.id" class="hitem">
                <div class="hitem__body">
                  <span class="hitem__name">{{ d.nombre_completo }}</span>
                  <span class="hitem__meta muted" v-if="d.fecha_fallecimiento">† {{ d.fecha_fallecimiento }}</span>
                </div>
                <button
                  class="btnsmall btnsmall--primary"
                  :disabled="savingDifHuerfano === d.id"
                  @click="vincularDifunto(d)"
                >
                  <i class="pi pi-link" />
                  {{ savingDifHuerfano === d.id ? 'Vinculando…' : 'Vincular aquí' }}
                </button>
              </div>
            </div>
          </div>

          <div class="subcard">
            <div class="subcard__title-row">
              <div class="subcard__title">
                Concesiones sin sepultura asignada
                <span v-if="concesionesSinSep.length" class="badge-warn">{{ concesionesSinSep.length }}</span>
              </div>
            </div>
            <div v-if="concSinLoading" class="muted" style="padding:8px">Cargando…</div>
            <div v-else-if="!concesionesSinSep.length" class="muted" style="padding:8px">
              No hay concesiones pendientes de asignación.
            </div>
            <div v-else class="hlist">
              <div v-for="c in concesionesSinSep" :key="c.id" class="hitem">
                <div class="hitem__body">
                  <span class="hitem__name">{{ c.concesionario || `Concesión #${c.id}` }}</span>
                  <span class="hitem__meta muted">{{ c.numero_expediente || '—' }} · {{ c.tipo || '—' }}</span>
                </div>
                <button
                  class="btnsmall btnsmall--primary"
                  :disabled="savingConcHuerfano === c.id"
                  @click="vincularConcesion(c)"
                >
                  <i class="pi pi-link" />
                  {{ savingConcHuerfano === c.id ? 'Vinculando…' : 'Vincular aquí' }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="huerfanoMsg" :class="['horf-msg', huerfanoMsg.ok ? 'horf-msg--ok' : 'horf-msg--err']">
            <i :class="huerfanoMsg.ok ? 'pi pi-check-circle' : 'pi pi-times-circle'" />
            {{ huerfanoMsg.text }}
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import api from '@/services/api';
import MapaPicker from '@/components/cementerio/MapaPicker.vue';
import ExhumacionModal from '@/components/cementerio/ExhumacionModal.vue';
import { putPersonaAsignarSepulturaConConfirmacionDoc } from '@/utils/cementerioPersonaAsignar.js';

const props = defineProps({
  sepulturaId: { type: Number, default: null },
});
const emit = defineEmits(['loaded', 'error', 'navigate', 'changed']);

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

// ── Exhumación ───────────────────────────────────────────────────────────────
const exhumacionVisible = ref(false);
const exhumacionDifunto = ref(null);

function abrirExhumacion(difunto) {
  exhumacionDifunto.value = difunto;
  exhumacionVisible.value = true;
}

function onExhumado() {
  if (props.sepulturaId) load(props.sepulturaId);
}

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
    const res = await api.put(`/api/cementerio/personas/${item.value.difunto_titular.id}`, {
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
    const res = await api.put(`/api/cementerio/personas/${tid}`, {
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
  return 'LIBRE';
});
const hasCoords = computed(() => Number.isFinite(Number(item.value?.lat)) && Number.isFinite(Number(item.value?.lon)));
const mapsUrl = computed(() => hasCoords.value ? `https://www.google.com/maps?q=${item.value.lat},${item.value.lon}` : null);
const historia = computed(() => Array.isArray(item.value?.movimientos) ? item.value.movimientos : []);
const documentos = computed(() => Array.isArray(item.value?.documentos) ? item.value.documentos : []);
const difuntosConcesion = computed(() => Array.isArray(item.value?.concesion_vigente?.difuntos_concesion) ? item.value.concesion_vigente.difuntos_concesion : []);

// Todos los difuntos del nicho (por sepultura_id), separados por estado
const todosDifuntosNicho = computed(() => Array.isArray(item.value?.difuntos) ? item.value.difuntos : []);

const difuntosInhumados = computed(() =>
  todosDifuntosNicho.value
    .filter(d => !d.estado_inhumacion || d.estado_inhumacion === 'inhumado')
    .sort((a, b) => (b.es_principal ? 1 : 0) - (a.es_principal ? 1 : 0)) // principal primero
);

const difuntosRestos = computed(() =>
  todosDifuntosNicho.value.filter(d => d.estado_inhumacion === 'restos')
);
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
function openGoogleMaps() {
  const url = mapsUrl.value;
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
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
    emit('changed', {
      id:     item.value.id,
      estado: item.value.estado,
      nombre: item.value.difunto_titular?.nombre_completo ?? null,
    });
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
      await api.post(`/api/cementerio/personas/${item.value.difunto_titular.id}/foto`, fd);
    } else {
      fd.append('imagen', file);
      await api.post(`/api/cementerio/sepulturas/${item.value.id}/imagen`, fd);
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
    await api.post(`/api/cementerio/sepulturas/${item.value.id}/documentos`, fd);
    await load(item.value.id);
  } catch (e) {
    docsError.value = e?.response?.data?.message ?? 'No se pudo adjuntar el documento.';
  } finally {
    docsSaving.value = false;
    if (ev?.target) ev.target.value = '';
  }
}

// ── Huérfanos ─────────────────────────────────────────────────────────────────
const huerfanosOpen       = ref(false);
const difuntosSinSep      = ref([]);
const difSinLoading       = ref(false);
const difSinQ             = ref('');
const concesionesSinSep   = ref([]);
const concSinLoading      = ref(false);
const savingDifHuerfano   = ref(null);
const savingConcHuerfano  = ref(null);
const huerfanoMsg         = ref(null);
let hMsgTimer             = null;

const huerfanosTotales = computed(() => difuntosSinSep.value.length + concesionesSinSep.value.length);

let fetchDifSinTimer = null;
function fetchDifSin() {
  clearTimeout(fetchDifSinTimer);
  fetchDifSinTimer = setTimeout(_doFetchDifSin, 280);
}

async function _doFetchDifSin() {
  difSinLoading.value = true;
  try {
    const res = await api.get('/api/cementerio/personas/sin-sepultura', {
      params: { q: difSinQ.value || undefined },
    });
    difuntosSinSep.value = res.data?.items ?? [];
  } finally { difSinLoading.value = false; }
}

async function loadConcesionesSinSep() {
  concSinLoading.value = true;
  try {
    const res = await api.get('/api/cementerio/admin/concesiones');
    const all = res.data?.items ?? [];
    concesionesSinSep.value = all.filter((c) => !c.sepultura_id || c.sepultura_id === 1);
  } finally { concSinLoading.value = false; }
}

watch(huerfanosOpen, (open) => {
  if (open && !difuntosSinSep.value.length && !difSinLoading.value) _doFetchDifSin();
  if (open && !concesionesSinSep.value.length && !concSinLoading.value) loadConcesionesSinSep();
});

function showHuerfanoMsg(ok, text) {
  huerfanoMsg.value = { ok, text };
  clearTimeout(hMsgTimer);
  hMsgTimer = setTimeout(() => { huerfanoMsg.value = null; }, 4000);
}

async function vincularDifunto(d) {
  if (!item.value?.id) return;
  savingDifHuerfano.value = d.id;
  try {
    const res = await putPersonaAsignarSepulturaConConfirmacionDoc(d.id, item.value.id);
    if (res === null) return;
    difuntosSinSep.value = difuntosSinSep.value.filter((x) => x.id !== d.id);
    await load(item.value.id);
    showHuerfanoMsg(true, `${d.nombre_completo} vinculado correctamente.`);
  } catch (e) {
    showHuerfanoMsg(false, e?.response?.data?.message ?? 'Error al vincular el difunto.');
  } finally { savingDifHuerfano.value = null; }
}

async function vincularConcesion(c) {
  if (!item.value?.id) return;
  savingConcHuerfano.value = c.id;
  try {
    await api.put(`/api/cementerio/concesiones/${c.id}`, { sepultura_id: item.value.id });
    concesionesSinSep.value = concesionesSinSep.value.filter((x) => x.id !== c.id);
    await load(item.value.id);
    showHuerfanoMsg(true, `Concesión #${c.id} vinculada correctamente.`);
  } catch (e) {
    showHuerfanoMsg(false, e?.response?.data?.message ?? 'Error al vincular la concesión.');
  } finally { savingConcHuerfano.value = null; }
}

// ── Paneles de añadir ─────────────────────────────────────────────────────────
const showAddDifunto  = ref(false);
const addDifMode      = ref('existente');
const addDifNombre    = ref('');
const addDifFecha     = ref('');
const addDifTitular   = ref(true);
const addDifSaving    = ref(false);
const addDifError     = ref(null);

const showAddConcesion = ref(false);
const addConcMode      = ref('existente');
const addConcExp       = ref('');
const addConcTipo      = ref('perpetua');
const addConcFecha     = ref('');
const addConcSaving    = ref(false);
const addConcError     = ref(null);

function toggleAddDifunto() {
  showAddDifunto.value = !showAddDifunto.value;
  if (showAddDifunto.value) {
    addDifMode.value = 'existente';
    addDifNombre.value = ''; addDifFecha.value = ''; addDifError.value = null;
    ensureDifSinLoaded();
  }
}

function toggleAddConcesion() {
  showAddConcesion.value = !showAddConcesion.value;
  if (showAddConcesion.value) {
    addConcMode.value = 'existente';
    addConcExp.value = ''; addConcFecha.value = ''; addConcError.value = null;
    ensureConcSinLoaded();
  }
}

function ensureDifSinLoaded() {
  if (!difuntosSinSep.value.length && !difSinLoading.value) _doFetchDifSin();
}

function ensureConcSinLoaded() {
  if (!concesionesSinSep.value.length && !concSinLoading.value) loadConcesionesSinSep();
}

async function vincularYCerrarDif(d) {
  await vincularDifunto(d);
  if (!huerfanoMsg.value || huerfanoMsg.value.ok) showAddDifunto.value = false;
}

async function vincularYCerrarConc(c) {
  await vincularConcesion(c);
  if (!huerfanoMsg.value || huerfanoMsg.value.ok) showAddConcesion.value = false;
}

async function crearYVincularDifunto() {
  if (!addDifNombre.value.trim()) { addDifError.value = 'El nombre es obligatorio.'; return; }
  addDifSaving.value = true;
  addDifError.value = null;
  try {
    const res = await api.post('/api/cementerio/personas', {
      tipo:                'difunto',
      nombre_completo:     addDifNombre.value.trim(),
      fecha_fallecimiento: addDifFecha.value || null,
      es_principal:        addDifTitular.value,
    });
    const nuevo = res.data.item;
    const assignRes = await putPersonaAsignarSepulturaConConfirmacionDoc(nuevo.id, item.value.id);
    if (assignRes === null) {
      addDifError.value =
        'Operación cancelada. El difunto se ha creado sin asignar al nicho; puedes vincularlo después desde «Personas sin sepultura».';
      await load(item.value.id);
      showAddDifunto.value = false;
      return;
    }
    await load(item.value.id);
    showAddDifunto.value = false;
  } catch (e) {
    addDifError.value = e?.response?.data?.message ?? 'Error al crear el difunto.';
  } finally {
    addDifSaving.value = false;
  }
}

async function crearYVincularConcesion() {
  addConcSaving.value = true;
  addConcError.value = null;
  try {
    const res = await api.post('/api/cementerio/concesiones', {
      numero_expediente: addConcExp.value.trim() || null,
      tipo:              addConcTipo.value,
      fecha_concesion:   addConcFecha.value || null,
    });
    const nueva = res.data.item;
    await api.put(`/api/cementerio/concesiones/${nueva.id}`, { sepultura_id: item.value.id });
    await load(item.value.id);
    showAddConcesion.value = false;
  } catch (e) {
    addConcError.value = e?.response?.data?.message ?? 'Error al crear la concesión.';
  } finally {
    addConcSaving.value = false;
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
.btn--ghost:hover:not(:disabled) { background: rgba(255,255,255,0.16); }
.btn:disabled { opacity: 0.42; cursor: not-allowed; }

.loading { padding: 12px 14px; background: white; }

/* Body */
.body { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.grid { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 12px; }

.card--full { width: 100%; }
.card--collapse-outer { padding: 0; overflow: hidden; }
.card__collapse-btn--outer {
  padding: 14px 16px;
  align-items: center;
  border-bottom: 1px solid rgba(23, 35, 31, 0.06);
}
.collapse-outer__title {
  font-weight: 900;
  font-size: 15px;
  color: rgba(23, 35, 31, 0.92);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.collapse-outer__sub { margin-top: 4px; font-size: 12px; line-height: 1.35; }
.huerfanos-body--outer {
  padding: 0 16px 16px;
  display: grid;
  gap: 12px;
}
.huerfanos-body--outer > .horf-msg {
  grid-column: 1 / -1;
}

@media (min-width: 1100px) {
  .huerfanos-body--outer {
    grid-template-columns: 1fr 1fr;
  }
}

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

.kv { display: grid; gap: 6px; font-size: 13px; }
.k { display: inline-block; width: 120px; color: rgba(23,35,31,0.70); font-weight: 900; }
.v { color: rgba(23,35,31,0.92); }

/* Timeline */
.timeline { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.tl { display: grid; grid-template-columns: 14px 1fr; gap: 10px; align-items: start; }
.tl__dot { width: 10px; height: 10px; border-radius: 999px; background: var(--c2-primary,#118652); margin-top: 6px; box-shadow: 0 0 0 4px rgba(17,134,82,0.12); }
.tl__dot--exhumacion { background: #f97316; box-shadow: 0 0 0 4px rgba(249,115,22,0.15); }
.tl__dot--traslado   { background: #1266A3; box-shadow: 0 0 0 4px rgba(18,102,163,0.15); }
.tl__dot--inhumacion { background: var(--c2-primary,#118652); }
.tl__title { font-size: 13px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.tl__difunto { font-size: 12.5px; font-weight: 600; color: var(--c2-text,#17231f); background: rgba(23,35,31,0.06); padding: 1px 7px; border-radius: 5px; }
.tl__meta { font-size: 12px; margin-top: 2px; }
.tl__notes { margin-top: 6px; font-size: 12px; color: rgba(23,35,31,0.85); }

/* Difuntos */
.difunto-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 6px 0; border-bottom: 1px dashed rgba(23,35,31,0.10); }
.difunto-row--restos { opacity: 0.75; }
.difunto-row__info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.difunto-row__head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

.difunto-nombre--restos { color: #6b7a77; }

.badge-titular {
  font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;
  background: rgba(17,134,82,.12); color: var(--c2-primary, #118652);
  text-transform: uppercase; letter-spacing: .03em;
}
.badge-restos {
  font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;
  background: rgba(120,100,70,.12); color: #78542a;
  text-transform: uppercase; letter-spacing: .03em;
}

.restos-sep {
  display: flex; align-items: center; gap: 8px; margin: 4px 0 2px;
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: rgba(23,35,31,.35);
}
.restos-sep::before, .restos-sep::after {
  content: ''; flex: 1; height: 1px; background: rgba(23,35,31,.10);
}

.exhum-btn {
  display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
  padding: 3px 9px; border-radius: 6px; border: 1px solid rgba(180,83,9,.3);
  background: #fff7ed; color: #c2410c; font-size: 11.5px; font-weight: 600;
  cursor: pointer; transition: background .12s, border-color .12s;
  white-space: nowrap;
}
.exhum-btn:hover { background: #ffedd5; border-color: rgba(180,83,9,.5); }
.exhum-btn .pi { font-size: 10px; }
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

/* Huérfanos */
.card__collapse-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 12px; border: none; background: none; cursor: pointer; text-align: left; }
.card__collapse-btn:hover { background: rgba(245,247,244,0.8); }
.collapse-icon { font-size: 12px; color: rgba(23,35,31,0.55); flex-shrink: 0; }

.badge-warn { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 999px; background: var(--c2-secondary,#C9A227); color: white; font-size: 10px; font-weight: 900; margin-left: 6px; }

.huerfanos-body { padding: 0 12px 12px; }
.hlist { display: flex; flex-direction: column; gap: 6px; max-height: 260px; overflow-y: auto; margin-top: 8px; }

.hitem { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(23,35,31,0.10); background: white; }
.hitem__body { flex: 1; min-width: 0; }
.hitem__name { display: block; font-weight: 700; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hitem__meta { display: block; font-size: 11px; margin-top: 1px; }

.ef-input--sm { height: 30px; font-size: 12px; }

.horf-msg { margin-top: 10px; padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.horf-msg--ok  { background: rgba(15,122,74,0.10); color: var(--c2-success,#0F7A4A); }
.horf-msg--err { background: rgba(166,27,27,0.10); color: var(--c2-danger,#A61B1B); }

/* Responsive */
@media (max-width: 1250px) {
  .grid { grid-template-columns: 1fr; }
  .idv { grid-template-columns: 1fr; }
  .k { width: 110px; }
  .ef-row--2col { grid-template-columns: 1fr; }
}
@media (min-width: 1400px) { .card { padding: 14px; } }

/* ── Botón añadir ────────────────────────────────────────────────────────── */
.subcard__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.edit-btn--add {
  background: rgba(17, 134, 82, 0.08);
  color: var(--c2-primary, #118652);
  border-color: rgba(17, 134, 82, 0.25);
}
.edit-btn--add:hover {
  background: rgba(17, 134, 82, 0.16);
}

/* ── Panel inline de añadir ──────────────────────────────────────────────── */
.add-panel {
  margin-top: 10px;
  border: 1px solid rgba(17, 134, 82, 0.22);
  border-radius: 10px;
  background: rgba(17, 134, 82, 0.03);
  overflow: hidden;
}

.add-panel__tabs {
  display: flex;
  border-bottom: 1px solid rgba(17, 134, 82, 0.15);
}
.add-tab {
  flex: 1;
  padding: 7px 10px;
  background: none;
  border: none;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  color: rgba(23, 35, 31, 0.55);
  transition: background 100ms, color 100ms;
}
.add-tab:hover { background: rgba(17, 134, 82, 0.06); color: var(--c2-primary, #118652); }
.add-tab--active {
  color: var(--c2-primary, #118652);
  background: rgba(17, 134, 82, 0.08);
  border-bottom: 2px solid var(--c2-primary, #118652);
}

.add-panel__loading,
.add-panel__empty {
  padding: 10px 12px;
  font-size: 12px;
}

.add-panel__list {
  display: flex;
  flex-direction: column;
  max-height: 220px;
  overflow-y: auto;
  padding: 6px;
  gap: 4px;
}
.add-panel__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 7px;
  background: #fff;
  border: 1px solid rgba(23, 35, 31, 0.08);
}
.add-panel__item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.add-panel__item-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #1c2d29;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.add-panel__item-meta { font-size: 11px; }

.add-panel template,
.add-panel > * { padding: 0 12px 10px; }
.add-panel__tabs { padding: 0; }
.add-panel__list { padding: 6px; }

.add-panel .ef-input--sm {
  margin-top: 10px;
  height: 30px;
  font-size: 12px;
}
.add-panel .ef-actions { margin-top: 8px; padding-bottom: 12px; }

.add-panel__check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
  margin-top: 6px;
  padding: 0 12px;
  color: rgba(23, 35, 31, 0.75);
}
.add-panel__check input { accent-color: var(--c2-primary, #118652); }

.add-panel__tipo-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 6px;
  padding: 0 12px;
}
.add-tipo-btn {
  padding: 6px;
  border-radius: 7px;
  border: 1px solid rgba(23, 35, 31, 0.18);
  background: #fff;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 100ms, color 100ms;
}
.add-tipo-btn--active {
  background: rgba(23, 35, 31, 0.88);
  color: #fff;
  border-color: transparent;
}
</style>
