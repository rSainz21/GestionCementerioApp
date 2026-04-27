<template>
  <div class="map-picker">
    <div class="map-picker__hint">
      <i class="pi pi-map-marker" />
      Haz clic en el mapa para fijar las coordenadas
    </div>
    <div ref="mapEl" class="map-picker__map"></div>
    <div v-if="lat !== null && lon !== null" class="map-picker__coords">
      <span><strong>Lat:</strong> {{ latDisplay }}</span>
      <span><strong>Lon:</strong> {{ lonDisplay }}</span>
      <button type="button" class="clear-btn" @click="clear" title="Borrar coordenadas">
        <i class="pi pi-times" /> Borrar
      </button>
    </div>
    <div v-else class="map-picker__coords muted">Sin coordenadas seleccionadas</div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
  lat: { type: Number, default: null },
  lon: { type: Number, default: null },
  // Centro inicial si no hay coordenadas (ej. coordenadas del municipio)
  defaultLat: { type: Number, default: 43.1667 },
  defaultLon: { type: Number, default: -3.9833 },
  defaultZoom: { type: Number, default: 14 },
});

const emit = defineEmits(['update:lat', 'update:lon']);

const mapEl = ref(null);
let map = null;
let marker = null;

const latDisplay = computed(() => props.lat != null ? Number(props.lat).toFixed(6) : null);
const lonDisplay = computed(() => props.lon != null ? Number(props.lon).toFixed(6) : null);

function placeMarker(latlng) {
  if (marker) {
    marker.setLatLng(latlng);
  } else {
    marker = L.marker(latlng, { draggable: true }).addTo(map);
    marker.on('dragend', (e) => {
      const p = e.target.getLatLng();
      emit('update:lat', parseFloat(p.lat.toFixed(7)));
      emit('update:lon', parseFloat(p.lng.toFixed(7)));
    });
  }
  emit('update:lat', parseFloat(latlng.lat.toFixed(7)));
  emit('update:lon', parseFloat(latlng.lng.toFixed(7)));
}

function clear() {
  if (marker) { marker.remove(); marker = null; }
  emit('update:lat', null);
  emit('update:lon', null);
}

onMounted(() => {
  const centerLat = props.lat ?? props.defaultLat;
  const centerLon = props.lon ?? props.defaultLon;

  map = L.map(mapEl.value, { zoomControl: true }).setView([centerLat, centerLon], props.defaultZoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  // Si ya hay coordenadas, poner marcador inicial
  if (props.lat != null && props.lon != null) {
    placeMarker(L.latLng(props.lat, props.lon));
  }

  map.on('click', (e) => placeMarker(e.latlng));

  // Forzar resize por si el contenedor tarda en tener dimensiones
  setTimeout(() => map?.invalidateSize(), 120);
});

// Si las props cambian externamente (al abrir edición con coords distintas), actualizar
watch([() => props.lat, () => props.lon], ([newLat, newLon]) => {
  if (!map) return;
  if (newLat != null && newLon != null) {
    placeMarker(L.latLng(newLat, newLon));
    map.setView([newLat, newLon], map.getZoom());
  } else if (marker) {
    marker.remove();
    marker = null;
  }
}, { immediate: false });

onBeforeUnmount(() => {
  map?.remove();
  map = null;
  marker = null;
});
</script>

<style scoped>
.map-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-picker__hint {
  font-size: 12px;
  color: rgba(23, 35, 31, 0.65);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.map-picker__hint i { color: var(--c2-primary, #118652); }

.map-picker__map {
  height: 260px;
  border-radius: 10px;
  border: 1px solid rgba(23, 35, 31, 0.18);
  overflow: hidden;
  cursor: crosshair;
}

.map-picker__coords {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  flex-wrap: wrap;
}
.muted { color: rgba(23, 35, 31, 0.55); font-size: 12px; }

.clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid rgba(166, 27, 27, 0.25);
  background: rgba(166, 27, 27, 0.06);
  color: var(--c2-danger, #A61B1B);
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  margin-left: auto;
}
.clear-btn:hover { background: rgba(166, 27, 27, 0.12); }
</style>
