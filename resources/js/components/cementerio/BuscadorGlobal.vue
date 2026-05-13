<template>
  <div class="bsq" ref="wrapEl" @keydown.esc="cerrar">

    <!-- Input siempre visible en la topbar -->
    <div class="bsq__input-wrap" :class="{ 'bsq__input-wrap--active': open }">
      <i class="pi pi-search bsq__icon" />
      <input
        ref="inputEl"
        v-model="q"
        type="text"
        class="bsq__input"
        placeholder="Buscar nicho, difunto, expediente…"
        autocomplete="off"
        @focus="onFocus"
        @keydown.down.prevent="moverSeleccion(1)"
        @keydown.up.prevent="moverSeleccion(-1)"
        @keydown.enter.prevent="abrirSeleccionado"
      />
      <button v-if="q" class="bsq__clear" @click.prevent="limpiar" tabindex="-1">
        <i class="pi pi-times" />
      </button>
    </div>

    <!-- Dropdown de resultados -->
    <Transition name="bsq-drop">
      <div v-if="open" class="bsq__dropdown" role="listbox">

        <!-- Cargando -->
        <div v-if="loading" class="bsq__estado">
          <i class="pi pi-spin pi-spinner" /> Buscando…
        </div>

        <!-- Sin resultados -->
        <div v-else-if="buscado && grupos.length === 0" class="bsq__estado">
          Sin resultados para "<strong>{{ q }}</strong>"
        </div>

        <!-- Resultados agrupados -->
        <div v-else-if="grupos.length > 0" class="bsq__grupos">
          <div v-for="grupo in grupos" :key="grupo.tipo" class="bsq__grupo">
            <div class="bsq__grupo-label">
              <i :class="`pi ${grupo.icono}`" />
              {{ grupo.label }}
            </div>
            <button
              v-for="item in grupo.items"
              :key="item.tipo + item.id"
              class="bsq__item"
              :class="{ 'bsq__item--sel': seleccionado === itemKey(item) }"
              type="button"
              role="option"
              @click="navegar(item)"
              @mouseenter="seleccionado = itemKey(item)"
            >
              <div class="bsq__item-left">
                <span class="bsq__item-titulo">{{ item.titulo }}</span>
                <span v-if="item.subtitulo" class="bsq__item-sub">{{ item.subtitulo }}</span>
              </div>
              <div class="bsq__item-right">
                <span v-if="item.estado" class="bsq__badge" :class="badgeClass(item.estado)">
                  {{ estadoLabel(item.estado) }}
                </span>
                <i class="pi pi-arrow-right bsq__arrow" />
              </div>
            </button>
          </div>
        </div>

        <!-- Hint inicial -->
        <div v-else class="bsq__hint">
          Escribe al menos {{ minCharsBusqueda }} {{ minCharsBusqueda === 1 ? 'carácter' : 'caracteres' }} para buscar
        </div>

        <!-- Footer -->
        <div v-if="total > 0" class="bsq__footer">
          {{ total }} resultado{{ total !== 1 ? 's' : '' }} &nbsp;·&nbsp;
          <kbd>↑↓</kbd> navegar &nbsp;<kbd>Enter</kbd> ir &nbsp;<kbd>ESC</kbd> cerrar
        </div>

      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import { useSettingsStore } from '@/stores/settings';

const router = useRouter();
const settings = useSettingsStore();

const minCharsBusqueda = computed(() => {
    const n = Number(settings.get('busqueda_global_min_caracteres', '2'));
    if (!Number.isFinite(n) || n < 1) return 2;
    return Math.min(6, Math.floor(n));
});

const wrapEl   = ref(null);
const inputEl  = ref(null);
const q        = ref('');
const open     = ref(false);
const loading  = ref(false);
const grupos   = ref([]);
const total    = ref(0);
const buscado  = ref(false);
const seleccionado = ref(null);

let debounceTimer = null;

const todosLosItems = computed(() =>
  grupos.value.flatMap(g => g.items.map(i => ({ ...i })))
);

function itemKey(item) {
  return `${item.tipo}-${item.id}`;
}

// Cierra el dropdown si se hace clic fuera del componente
function onDocClick(e) {
  if (wrapEl.value && !wrapEl.value.contains(e.target)) {
    cerrar();
  }
}
onMounted(() => document.addEventListener('mousedown', onDocClick, true));
onUnmounted(() => document.removeEventListener('mousedown', onDocClick, true));

function onFocus() {
  open.value = true;
}

watch(q, (val) => {
  clearTimeout(debounceTimer);
  buscado.value = false;
  if (val.length < minCharsBusqueda.value) {
    grupos.value = [];
    total.value = 0;
    seleccionado.value = null;
    loading.value = false;
    return;
  }
  open.value = true;
  loading.value = true;
  debounceTimer = setTimeout(() => buscar(val), 250);
});

async function buscar(texto) {
  try {
    const res = await api.get('/api/cementerio/buscar', { params: { q: texto } });
    grupos.value = res.data.grupos ?? [];
    total.value  = res.data.total ?? 0;
    buscado.value = true;
    seleccionado.value = todosLosItems.value[0]
      ? itemKey(todosLosItems.value[0])
      : null;
  } catch {
    grupos.value = [];
  } finally {
    loading.value = false;
  }
}

function moverSeleccion(dir) {
  const items = todosLosItems.value;
  if (!items.length) return;
  const idx = items.findIndex(i => itemKey(i) === seleccionado.value);
  const next = Math.max(0, Math.min(items.length - 1, idx + dir));
  seleccionado.value = itemKey(items[next]);
}

function abrirSeleccionado() {
  const item = todosLosItems.value.find(i => itemKey(i) === seleccionado.value);
  if (item) navegar(item);
}

function navegar(item) {
  cerrar();
  if (item.tipo === 'sepultura' || (item.sepultura_id && item.tipo !== 'tercero')) {
    const sepId = item.tipo === 'sepultura' ? item.id : item.sepultura_id;
    router.push({ path: '/cementerio', query: { sepultura: sepId, t: Date.now() } });
  } else if (item.tipo === 'difunto') {
    router.push({ path: '/cementerio', query: { regularizaciones: '1', t: Date.now() } });
  } else if (item.tipo === 'concesion') {
    router.push({ path: '/cementerio', query: { regularizaciones: '1', t: Date.now() } });
  } else if (item.tipo === 'tercero') {
    router.push({ path: '/cementerio/gestion', query: { tab: 'terceros', t: Date.now() } });
  }
}

function cerrar() {
  open.value = false;
}

function limpiar() {
  q.value = '';
  grupos.value = [];
  total.value = 0;
  buscado.value = false;
  open.value = false;
  inputEl.value?.focus();
}

// Exponemos focus() para que DefaultLayout lo llame con la tecla /
defineExpose({ focus: () => inputEl.value?.focus() });

function estadoLabel(estado) {
  return {
    libre: 'Libre', ocupada: 'Ocupada', reservada: 'Reservada', clausurada: 'Clausurada',
    vigente: 'Vigente', vencida: 'Vencida', renovada: 'Renovada', cancelada: 'Cancelada',
    caducada: 'Caducada',
  }[estado] ?? estado ?? '';
}
function badgeClass(estado) {
  return {
    libre: 'bsq__badge--verde',
    vigente: 'bsq__badge--verde',
    ocupada: 'bsq__badge--rojo',
    vencida: 'bsq__badge--rojo',
    caducada: 'bsq__badge--rojo',
    renovada: 'bsq__badge--naranja',
    reservada: 'bsq__badge--azul',
  }[estado] ?? '';
}
</script>

<style scoped>
/* ── Contenedor raíz ────────────────────────────── */
.bsq {
  position: relative;
}

/* ── Input en topbar ────────────────────────────── */
.bsq__input-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid rgba(23, 35, 31, 0.12);
  background: #f5f7f4;
  transition: background 120ms, border-color 120ms, box-shadow 120ms;
  width: 220px;
}
.bsq__input-wrap--active,
.bsq__input-wrap:focus-within {
  background: #fff;
  border-color: var(--c2-primary, #118652);
  box-shadow: 0 0 0 3px rgba(17, 134, 82, 0.12);
}
.bsq__icon {
  font-size: 13px;
  color: var(--c2-primary, #118652);
  flex-shrink: 0;
  opacity: 0.75;
}
.bsq__input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  font-weight: 500;
  color: #17231f;
  background: transparent;
  min-width: 0;
}
.bsq__input::placeholder { color: #a0aba9; font-weight: 400; }
.bsq__clear {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #a0aba9;
  font-size: 11px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.bsq__clear:hover { color: #374240; }

/* ── Dropdown ───────────────────────────────────── */
.bsq__dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 460px;
  max-width: calc(100vw - 24px);
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 36px rgba(0, 0, 0, 0.18), 0 1px 4px rgba(0,0,0,0.08);
  border: 1px solid #e8eceb;
  z-index: 500;
  overflow: hidden;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

/* ── Estados ─────────────────────────────────────── */
.bsq__estado {
  padding: 22px;
  text-align: center;
  color: #888;
  font-size: 13.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.bsq__hint {
  padding: 18px;
  text-align: center;
  font-size: 12.5px;
  color: #a0aba9;
}

/* ── Grupos ──────────────────────────────────────── */
.bsq__grupos { overflow-y: auto; flex: 1; padding: 6px 0; }
.bsq__grupo  { margin-bottom: 2px; }
.bsq__grupo-label {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px 3px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--c2-primary, #118652);
}

/* ── Item ────────────────────────────────────────── */
.bsq__item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 80ms;
}
.bsq__item--sel,
.bsq__item:hover { background: #f0f7f4; }

.bsq__item-left  { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
.bsq__item-titulo {
  font-size: 13px;
  font-weight: 600;
  color: #17231f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bsq__item-sub {
  font-size: 11.5px;
  color: #6b7a77;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bsq__item-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.bsq__arrow {
  font-size: 10px;
  color: #a0aba9;
  opacity: 0;
  transition: opacity 100ms, transform 100ms;
}
.bsq__item:hover .bsq__arrow,
.bsq__item--sel .bsq__arrow { opacity: 1; transform: translateX(2px); }

/* ── Badges ──────────────────────────────────────── */
.bsq__badge {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 99px;
  background: #f0f2f1;
  color: #374240;
}
.bsq__badge--verde   { background: #dcfce7; color: #166534; }
.bsq__badge--rojo    { background: #fee2e2; color: #b91c1c; }
.bsq__badge--naranja { background: #ffedd5; color: #9a3412; }
.bsq__badge--azul    { background: #dbeafe; color: #1e40af; }

/* ── Footer ──────────────────────────────────────── */
.bsq__footer {
  padding: 8px 14px;
  border-top: 1px solid #f0f2f1;
  font-size: 11px;
  color: #a0aba9;
  text-align: center;
  flex-shrink: 0;
}
.bsq__footer kbd {
  background: #f0f2f1;
  border: 1px solid #d4dbd9;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 10px;
  color: #374240;
}

/* ── Transición dropdown ─────────────────────────── */
.bsq-drop-enter-active { transition: opacity 130ms ease, transform 130ms ease; }
.bsq-drop-leave-active { transition: opacity 100ms ease, transform 100ms ease; }
.bsq-drop-enter-from   { opacity: 0; transform: translateY(-6px) scale(0.98); }
.bsq-drop-leave-to     { opacity: 0; transform: translateY(-4px) scale(0.98); }
</style>
