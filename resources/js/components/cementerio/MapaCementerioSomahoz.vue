<template>
  <div ref="shellEl" class="map-shell" :class="{ 'map-shell--fullscreen': fullscreen }">
    <div ref="mapEl" class="map"></div>
    <transition name="hint-fade">
      <div v-if="showHint" class="ctrl-hint">
        <kbd>Ctrl</kbd> + rueda del ratón para hacer zoom
      </div>
    </transition>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, watch, ref, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl:       new URL('leaflet/dist/images/marker-icon.png',   import.meta.url).href,
  shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

const props = defineProps({
  centerLat:    { type: Number, required: true },
  centerLon:    { type: Number, required: true },
  zoom:         { type: Number, default: 18 },
  items:        { type: Array, default: () => [] },
  capasActivas: { type: Array, default: () => ['zona', 'bloque'] },
  zonas:        { type: Array, default: () => [] },
  bloques:      { type: Array, default: () => [] },
  /** Cuando true, el contenedor padre debe dar altura (p. ej. grid 1fr); Leaflet se redimensiona aquí. */
  fullscreen:   { type: Boolean, default: false },
});

const emit = defineEmits(['select']);

const shellEl  = ref(null);
const mapEl    = ref(null);
const showHint = ref(false);
let map        = null;
let layerZonas = null;
let layerBloq  = null;
let hintTimer  = null;
let resizeObs  = null;

function scheduleInvalidate() {
  requestAnimationFrame(() => map?.invalidateSize({ animate: false }));
  setTimeout(() => map?.invalidateSize({ animate: false }), 80);
  setTimeout(() => map?.invalidateSize({ animate: false }), 350);
}

// ── Render zonas ──────────────────────────────────────────
function renderZonas() {
  if (!map) return;
  if (layerZonas) layerZonas.remove();
  if (!props.capasActivas.includes('zona')) return;
  layerZonas = L.layerGroup();
  for (const z of props.zonas || []) {
    if (!z?.lat || !z?.lon) continue;

    const poly = Array.isArray(z.polygon) ? z.polygon : null;
    if (poly && poly.length >= 3) {
      const latlngs = poly
        .map((p) => [Number(p.lat), Number(p.lon)])
        .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));

      if (latlngs.length >= 3) {
        const pg = L.polygon(latlngs, {
          color: '#0D6B42',
          weight: 2,
          fillColor: '#118652',
          fillOpacity: 0.14,
        });
        pg.on('click', () => emit('select', { tipo: 'zona', ...z }));
        pg.bindPopup(`<strong>Zona: ${z.nombre}</strong><br>Código: ${z.codigo ?? '—'}`);
        pg.addTo(layerZonas);
      }
    }

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        background:#0D6B42;color:white;border-radius:10px;
        padding:3px 9px;font-size:11px;font-weight:800;
        border:2px solid rgba(255,255,255,.7);
        white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35);
        cursor:pointer;
      ">${z.nombre}</div>`,
      iconAnchor: [0, 14],
    });
    const mk = L.marker([z.lat, z.lon], { icon });
    mk.on('click', () => emit('select', { tipo: 'zona', ...z }));
    mk.addTo(layerZonas);
  }
  layerZonas.addTo(map);
}

// ── Render bloques ────────────────────────────────────────
function renderBloques() {
  if (!map) return;
  if (layerBloq) layerBloq.remove();
  if (!props.capasActivas.includes('bloque')) return;
  layerBloq = L.layerGroup();
  for (const b of props.bloques || []) {
    if (!b?.lat || !b?.lon) continue;
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        background:#1266A3;color:white;border-radius:8px;
        padding:2px 7px;font-size:10px;font-weight:800;
        border:2px solid rgba(255,255,255,.65);
        white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.30);
        cursor:pointer;
      ">${b.codigo ?? b.nombre}</div>`,
      iconAnchor: [0, 12],
    });
    const mk = L.marker([b.lat, b.lon], { icon });
    mk.on('click', () => emit('select', { tipo: 'bloque', ...b }));
    mk.bindPopup(`<strong>${b.nombre}</strong><br>Zona: ${b.zona_nombre ?? '—'}<br>Tipo: ${b.tipo_bloque ?? '—'}`);
    mk.addTo(layerBloq);
  }
  layerBloq.addTo(map);
}

function renderAll() {
  renderZonas();
  renderBloques();
}

onMounted(() => {
  map = L.map(mapEl.value, { zoomControl: true, scrollWheelZoom: false })
    .setView([props.centerLat, props.centerLon], props.zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 20,
  }).addTo(map);

  setTimeout(() => map?.invalidateSize(), 120);
  renderAll();

  if (typeof ResizeObserver !== 'undefined' && shellEl.value) {
    resizeObs = new ResizeObserver(() => {
      map?.invalidateSize({ animate: false });
    });
    resizeObs.observe(shellEl.value);
  }

  mapEl.value.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault(); e.stopPropagation();
      map.setZoom(map.getZoom() + (e.deltaY < 0 ? 1 : -1), { animate: true });
      showHint.value = false; clearTimeout(hintTimer);
    } else {
      clearTimeout(hintTimer);
      showHint.value = true;
      hintTimer = setTimeout(() => { showHint.value = false; }, 1800);
    }
  }, { passive: false });
});

watch(() => props.capasActivas, () => renderAll(), { deep: true });
watch(() => [props.zonas, props.bloques],       () => renderAll(), { deep: true });
watch(() => [props.centerLat, props.centerLon, props.zoom], () => {
  if (map) map.setView([props.centerLat, props.centerLon], props.zoom);
});

watch(
  () => props.fullscreen,
  async () => {
    await nextTick();
    scheduleInvalidate();
  },
);

onBeforeUnmount(() => {
  clearTimeout(hintTimer);
  resizeObs?.disconnect();
  resizeObs = null;
  map?.remove();
  map = layerZonas = layerBloq = null;
});

defineExpose({
  invalidateSize() {
    map?.invalidateSize({ animate: false });
  },
});
</script>

<style scoped>
.map-shell {
  background: #e8eceb;
  position: relative;
  width: 100%;
}

.map {
  width: 100%;
  height: 420px;
  border: 0;
  display: block;
}

/* Pantalla completa: mismo archivo scoped vence a .map fijo; Leaflet necesita altura > 0 */
.map-shell--fullscreen {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.map-shell--fullscreen .map,
.map-shell--fullscreen .map.leaflet-container {
  flex: 1 1 auto !important;
  min-height: 200px !important;
  height: 100% !important;
  width: 100% !important;
}

.ctrl-hint {
  position: absolute; left: 50%; bottom: 36px;
  transform: translateX(-50%);
  background: rgba(23,35,31,.72); color: white;
  padding: 8px 16px; border-radius: 10px;
  font-size: 13px; font-weight: 700;
  pointer-events: none; white-space: nowrap; z-index: 1000;
  display: flex; align-items: center; gap: 6px;
}
kbd {
  background: rgba(255,255,255,.22); border-radius: 5px;
  padding: 1px 6px; font-family: inherit; font-size: 12px;
  border: 1px solid rgba(255,255,255,.35);
}
.hint-fade-enter-active, .hint-fade-leave-active { transition: opacity .2s; }
.hint-fade-enter-from, .hint-fade-leave-to { opacity: 0; }
</style>
