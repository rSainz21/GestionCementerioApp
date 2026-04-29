<template>
  <div class="map-shell">
    <div ref="mapEl" class="map"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, watch, ref } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon path broken by Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl:       new URL('leaflet/dist/images/marker-icon.png',   import.meta.url).href,
  shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

const props = defineProps({
  centerLat: { type: Number, required: true },
  centerLon: { type: Number, required: true },
  zoom: { type: Number, default: 18 },
  // items: [{ id, lat, lon, estado, tipo }]
  items: { type: Array, default: () => [] },
  capasActivas: { type: Array, default: () => ['nicho', 'fosa', 'columbario', 'panteon'] },
});

const emit = defineEmits(['select']);

const mapEl = ref(null);
let map = null;
let layer = null;

function colorFor(item) {
  if (item?.estado === 'ocupada') return '#A61B1B';
  // por tipo (si libre)
  switch ((item?.tipo || '').toLowerCase()) {
    case 'columbario': return '#1266A3';
    case 'panteon':    return '#C9A227';
    case 'fosa':       return '#7C3AED';
    default:           return '#0F7A4A'; // nicho/libre
  }
}

function shouldRender(item) {
  const t = (item?.tipo || '').toLowerCase();
  if (!t) return false;
  return props.capasActivas.includes(t);
}

function renderPoints() {
  if (!map) return;
  if (layer) layer.remove();
  layer = L.layerGroup();

  for (const it of props.items || []) {
    if (!it?.lat || !it?.lon) continue;
    if (!shouldRender(it)) continue;

    const m = L.circleMarker([it.lat, it.lon], {
      radius: 6,
      color: colorFor(it),
      weight: 2,
      fillColor: colorFor(it),
      fillOpacity: 0.9,
    });

    m.on('click', () => emit('select', it));
    m.addTo(layer);
  }

  layer.addTo(map);
}

onMounted(() => {
  map = L.map(mapEl.value, { zoomControl: true }).setView([props.centerLat, props.centerLon], props.zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 20,
  }).addTo(map);

  // Ajuste de tamaño por si el contenedor aparece tras layout
  setTimeout(() => map?.invalidateSize(), 120);

  renderPoints();
});

watch(
  () => [props.items, props.capasActivas],
  () => renderPoints(),
  { deep: true }
);

watch(
  () => [props.centerLat, props.centerLon, props.zoom],
  () => {
    if (!map) return;
    map.setView([props.centerLat, props.centerLon], props.zoom);
  }
);

onBeforeUnmount(() => {
  map?.remove();
  map = null;
  layer = null;
});
</script>

<style scoped>
.map-shell {
  background: white;
}
.map {
  width: 100%;
  height: 420px;
  border: 0;
  display: block;
}
</style>

