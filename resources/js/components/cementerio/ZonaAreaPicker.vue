<template>
  <div class="picker">
    <div class="hint">
      <i class="pi pi-vector-square" />
      Marca <strong>4 puntos</strong> para definir el área de la zona
      <span class="muted">· clic para añadir · arrastra para ajustar ·</span>
      <button type="button" class="btn-clear" @click="clear" :disabled="!hasAnyPoint">
        <i class="pi pi-times" /> Borrar
      </button>
    </div>

    <div ref="mapEl" class="map"></div>

    <div class="coords muted" v-if="!points.length">
      Sin área seleccionada
    </div>
    <div class="coords" v-else>
      <span class="badge">Puntos: {{ points.length }}/4</span>
      <span class="muted" v-if="points.length < 4">Añade {{ 4 - points.length }} punto(s) más…</span>
      <span class="muted" v-else>Área definida.</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl:       new URL('leaflet/dist/images/marker-icon.png',   import.meta.url).href,
  shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

const props = defineProps({
  modelValue: { type: Array, default: () => [] }, // [{lat, lon}, ...]
  defaultLat: { type: Number, default: 43.248730 },
  defaultLon: { type: Number, default: -4.057985 },
  defaultZoom:{ type: Number, default: 17 },
});
const emit = defineEmits(['update:modelValue']);

const mapEl = ref(null);
let map = null;
let polygon = null;
let markers = [];

const points = computed(() => Array.isArray(props.modelValue) ? props.modelValue : []);
const hasAnyPoint = computed(() => points.value.length > 0);

function normalizePoints(arr) {
  return (arr ?? [])
    .filter(Boolean)
    .map((p) => ({ lat: Number(p.lat), lon: Number(p.lon) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .slice(0, 4);
}

function syncToEmit(arr) {
  emit('update:modelValue', normalizePoints(arr));
}

function clear() {
  syncToEmit([]);
}

function render() {
  if (!map) return;

  // markers
  for (const m of markers) m.remove();
  markers = [];

  // polygon
  if (polygon) { polygon.remove(); polygon = null; }

  const pts = points.value;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const m = L.marker([p.lat, p.lon], { draggable: true }).addTo(map);
    m.on('dragend', (e) => {
      const ll = e.target.getLatLng();
      const next = pts.map((x, idx) => idx === i ? { lat: ll.lat, lon: ll.lng } : x);
      syncToEmit(next);
    });
    markers.push(m);
  }

  if (pts.length >= 3) {
    polygon = L.polygon(pts.map((p) => [p.lat, p.lon]), {
      color: '#0D6B42',
      weight: 2,
      fillColor: '#118652',
      fillOpacity: 0.18,
    }).addTo(map);
  }
}

onMounted(() => {
  const centerLat = points.value[0]?.lat ?? props.defaultLat;
  const centerLon = points.value[0]?.lon ?? props.defaultLon;

  map = L.map(mapEl.value, { zoomControl: true }).setView([centerLat, centerLon], props.defaultZoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 20 }).addTo(map);

  map.on('click', (e) => {
    const pts = points.value;
    if (pts.length >= 4) return;
    syncToEmit([...pts, { lat: Number(e.latlng.lat.toFixed(7)), lon: Number(e.latlng.lng.toFixed(7)) }]);
  });

  setTimeout(() => map?.invalidateSize(), 120);
  render();
});

watch(() => props.modelValue, () => {
  render();
}, { deep: true });

onBeforeUnmount(() => {
  map?.remove();
  map = null;
  polygon = null;
  markers = [];
});
</script>

<style scoped>
.picker { display: grid; gap: 8px; }
.hint {
  font-size: 12px;
  color: rgba(23,35,31,.70);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.hint .pi { color: var(--c2-primary, #118652); }
.map {
  height: 280px;
  border-radius: 10px;
  border: 1px solid rgba(23, 35, 31, 0.18);
  overflow: hidden;
  cursor: crosshair;
}
.coords { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12px; }
.muted { color: rgba(23,35,31,.55); }
.badge {
  background: rgba(17,134,82,.08);
  border: 1px solid rgba(17,134,82,.22);
  color: var(--c2-primary,#118652);
  border-radius: 999px;
  padding: 2px 10px;
  font-weight: 800;
}
.btn-clear {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(166, 27, 27, 0.25);
  background: rgba(166, 27, 27, 0.06);
  color: var(--c2-danger, #A61B1B);
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
}
.btn-clear:disabled { opacity: .5; cursor: default; }
.btn-clear:hover:not(:disabled) { background: rgba(166, 27, 27, 0.12); }
</style>
