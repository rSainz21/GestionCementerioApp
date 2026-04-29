<template>
  <div class="wrap">
    <div ref="mapEl" class="map" />
    <div v-if="hint" class="hint" :class="hint.kind === 'inactive' ? 'hint--inactive' : 'hint--active'">
      {{ hint.text }}
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const props = defineProps({
  imageUrl: { type: String, required: true },
});

const emit = defineEmits(['action']);

const mapEl = ref(null);
let map = null;
let overlay = null;
let hotspotsLayer = null;

const activeKey = ref(null);
const hoveredKey = ref(null);
const hint = ref(null);

// Hotspots en coordenadas normalizadas [0..1] sobre la imagen (x,y).
// Nota: se convierten automáticamente a "latLng" con CRS.Simple usando tamaño real de la imagen.
const hotspots = [
  // ZONA VIEJA (muro sur)
  {
    key: 'B6',
    label: 'Zona vieja · Bloque 6 (Nichos 1–40)',
    kind: 'action',
    action: { type: 'bloque', zona_id: 1, bloque_codigo: 'B6' },
    poly: [
      [0.13, 0.78], [0.30, 0.78], [0.33, 0.92], [0.17, 0.96], [0.10, 0.88],
    ],
  },
  {
    key: 'B7',
    label: 'Zona vieja · Bloque 7 (Nichos 41–96)',
    kind: 'action',
    action: { type: 'bloque', zona_id: 1, bloque_codigo: 'B7' },
    poly: [
      [0.36, 0.80], [0.63, 0.79], [0.64, 0.92], [0.40, 0.94],
    ],
  },
  {
    key: 'B8',
    label: 'Zona vieja · Bloque 8 (Nichos 97–224)',
    kind: 'action',
    action: { type: 'bloque', zona_id: 1, bloque_codigo: 'B8' },
    poly: [
      [0.66, 0.72], [0.92, 0.72], [0.94, 0.86], [0.73, 0.92], [0.63, 0.86],
    ],
  },

  // ZONA NUEVA (contorno azul)
  {
    key: 'ZONA_NUEVA',
    label: 'Zona nueva · Ampliaciones centrales',
    kind: 'action',
    action: { type: 'zona_nueva', zona_id: 2 },
    poly: [
      [0.58, 0.20], [0.92, 0.20], [0.95, 0.56], [0.88, 0.74], [0.64, 0.73], [0.56, 0.52], [0.58, 0.32],
    ],
  },

  // COLUMBARIOS (tejados 4 y 5)
  {
    key: 'COLUMBARIOS',
    label: 'Columbarios (cenizas)',
    kind: 'action',
    action: { type: 'columbarios' },
    poly: [
      [0.33, 0.55], [0.54, 0.49], [0.58, 0.64], [0.44, 0.77], [0.32, 0.70],
    ],
  },

  // EXCLUIDO: Tanatorio (izquierda de la línea roja)
  {
    key: 'TANATORIO',
    label: 'Tanatorio (Fuera de recinto)',
    kind: 'inactive',
    poly: [
      [0.00, 0.00], [0.58, 0.00], [0.32, 1.00], [0.00, 1.00],
    ],
  },
];

function toLatLng([x, y], w, h) {
  // CRS.Simple usa [y, x] como "lat, lng"
  return L.latLng(y * h, x * w);
}

function styleFor(h) {
  const isActive = activeKey.value === h.key;
  const isHover = hoveredKey.value === h.key;
  const baseFill = h.kind === 'inactive' ? '#9CA3AF' : '#118652';
  return {
    color: h.kind === 'inactive' ? 'transparent' : (isHover || isActive ? '#118652' : 'transparent'),
    weight: isHover || isActive ? 2 : 0,
    fillColor: baseFill,
    fillOpacity: isActive ? 0.25 : (isHover ? 0.12 : 0.0),
    opacity: 1,
  };
}

async function loadImageSize(url) {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

function setHintFor(h) {
  if (!h) { hint.value = null; return; }
  hint.value = {
    kind: h.kind,
    text: h.kind === 'inactive' ? 'Tanatorio (Fuera de recinto)' : h.label,
  };
}

function clearHintIf(key) {
  if (!hint.value) return;
  if (hoveredKey.value === key) return;
  hint.value = null;
}

async function init() {
  const { w, h } = await loadImageSize(props.imageUrl);

  const bounds = L.latLngBounds([0, 0], [h, w]);

  map = L.map(mapEl.value, {
    crs: L.CRS.Simple,
    zoomControl: false,
    attributionControl: false,
    minZoom: -2,
    maxZoom: 2,
    inertia: false,
  });

  overlay = L.imageOverlay(props.imageUrl, bounds).addTo(map);
  map.fitBounds(bounds);
  map.setMaxBounds(bounds.pad(0.08));

  // Layer hotspots
  hotspotsLayer = L.layerGroup().addTo(map);

  for (const hsp of hotspots) {
    const latLngs = hsp.poly.map((pt) => toLatLng(pt, w, h));
    const poly = L.polygon(latLngs, styleFor(hsp));

    poly.on('mouseover', () => {
      hoveredKey.value = hsp.key;
      setHintFor(hsp);
      poly.setStyle(styleFor(hsp));
    });

    poly.on('mouseout', () => {
      hoveredKey.value = null;
      clearHintIf(hsp.key);
      poly.setStyle(styleFor(hsp));
    });

    poly.on('click', () => {
      if (hsp.kind === 'inactive') return;
      activeKey.value = hsp.key;
      // Resaltado verde y transición suave (la página contenedora decide qué abre)
      poly.setStyle(styleFor(hsp));
      emit('action', hsp.action);
    });

    poly.addTo(hotspotsLayer);

    // Repaint cuando cambie active/hover
    watch([activeKey, hoveredKey], () => poly.setStyle(styleFor(hsp)));
  }

  // invalidar tamaño tras layout
  setTimeout(() => map?.invalidateSize(), 120);
}

onMounted(() => { init(); });

onBeforeUnmount(() => {
  map?.remove();
  map = null;
  overlay = null;
  hotspotsLayer = null;
});
</script>

<style scoped>
.wrap { position: relative; width: 100%; }
.map { width: 100%; height: 520px; border-radius: 12px; overflow: hidden; }
.hint {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 800;
  border: 1px solid rgba(23,35,31,0.14);
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(6px);
  color: rgba(23,35,31,0.92);
}
.hint--inactive {
  border-color: rgba(156,163,175,0.55);
  color: rgba(55,65,81,0.92);
}
</style>

