<template>
  <div class="map-picker">
    <div class="map-picker__hint">
      <i class="pi pi-map-marker" />
      Haz clic en el mapa para fijar las coordenadas
      <span v-if="activeZone && activeZone.polygon" class="map-picker__zone-badge">
        <i class="pi pi-map" /> {{ activeZone.nombre }}
      </span>
      <span v-else-if="activeZone && !activeZone.polygon" class="map-picker__zone-badge map-picker__zone-badge--no-poly">
        <i class="pi pi-exclamation-circle" /> {{ activeZone.nombre }} (sin polígono)
      </span>
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

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl:       new URL('leaflet/dist/images/marker-icon.png',   import.meta.url).href,
  shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

const props = defineProps({
  lat:          { type: Number, default: null },
  lon:          { type: Number, default: null },
  defaultLat:   { type: Number, default: 43.248730 },
  defaultLon:   { type: Number, default: -4.057985 },
  defaultZoom:  { type: Number, default: 14 },
  // Zonas para dibujar en el mapa
  zones:        { type: Array,  default: () => [] },
  activeZoneId: { type: Number, default: null },
});

const emit = defineEmits(['update:lat', 'update:lon', 'outside-zone', 'inside-zone']);

const mapEl = ref(null);
let map        = null;
let marker     = null;
let zoneLayerGroup = null; // grupo Leaflet con todos los polígonos de zonas

const latDisplay = computed(() => props.lat != null ? Number(props.lat).toFixed(6) : null);
const lonDisplay = computed(() => props.lon != null ? Number(props.lon).toFixed(6) : null);

const activeZone = computed(() =>
  props.zones.find(z => z.id === props.activeZoneId) ?? null
);

// ── Geometría: punto en polígono (ray casting) ──────────────────────────────
function pointInPolygon(lat, lon, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return true; // sin polígono = sin restricción
  let inside = false;
  const x = lon, y = lat;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon, yi = polygon[i].lat;
    const xj = polygon[j].lon, yj = polygon[j].lat;
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// ── Dibujar polígonos de zonas en el mapa ──────────────────────────────────
function renderZones() {
  if (!map) return;
  if (zoneLayerGroup) { zoneLayerGroup.clearLayers(); }
  else { zoneLayerGroup = L.layerGroup().addTo(map); }

  const PRIMARY   = '#118652';
  const SECONDARY = '#6b7a77';

  for (const zone of props.zones) {
    if (!Array.isArray(zone.polygon) || zone.polygon.length < 3) continue;

    const latlngs = zone.polygon.map(p => [p.lat, p.lon]);
    const isActive = zone.id === props.activeZoneId;

    const poly = L.polygon(latlngs, {
      color:       isActive ? PRIMARY   : SECONDARY,
      fillColor:   isActive ? PRIMARY   : SECONDARY,
      weight:      isActive ? 2.5       : 1,
      opacity:     isActive ? 0.9       : 0.35,
      fillOpacity: isActive ? 0.18      : 0.06,
      dashArray:   isActive ? null      : '6 4',
    }).addTo(zoneLayerGroup);

    poly.bindTooltip(zone.nombre, {
      permanent: false,
      direction: 'center',
      className: 'zone-tooltip',
    });

    // Si es la zona activa y tiene polígono, hacer zoom para que se vea completa
    if (isActive) {
      try { map.fitBounds(poly.getBounds(), { padding: [24, 24], maxZoom: 19 }); }
      catch { /* sin polígono válido */ }
    }
  }
}

// ── Colocar marcador y validar zona ───────────────────────────────────────
function placeMarker(latlng) {
  if (marker) {
    marker.setLatLng(latlng);
  } else {
    marker = L.marker(latlng, { draggable: true }).addTo(map);
    marker.on('dragend', (e) => {
      const p = e.target.getLatLng();
      handlePoint(p.lat, p.lng);
    });
  }
  handlePoint(latlng.lat, latlng.lng);
}

function handlePoint(lat, lng) {
  emit('update:lat', parseFloat(lat.toFixed(7)));
  emit('update:lon', parseFloat(lng.toFixed(7)));

  const zone = activeZone.value;
  if (zone && Array.isArray(zone.polygon) && zone.polygon.length >= 3) {
    const inside = pointInPolygon(lat, lng, zone.polygon);
    emit(inside ? 'inside-zone' : 'outside-zone');
  } else {
    // Sin polígono: siempre "dentro"
    emit('inside-zone');
  }
}

function clear() {
  if (marker) { marker.remove(); marker = null; }
  emit('update:lat', null);
  emit('update:lon', null);
  emit('inside-zone');
}

// ── Ciclo de vida ──────────────────────────────────────────────────────────
onMounted(() => {
  const centerLat = props.lat ?? props.defaultLat;
  const centerLon = props.lon ?? props.defaultLon;

  map = L.map(mapEl.value, { zoomControl: true }).setView([centerLat, centerLon], props.defaultZoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  if (props.lat != null && props.lon != null) placeMarker(L.latLng(props.lat, props.lon));

  map.on('click', (e) => placeMarker(e.latlng));

  renderZones();

  setTimeout(() => map?.invalidateSize(), 120);
});

// Redibujar zonas cuando cambia la selección o la lista
watch([() => props.zones, () => props.activeZoneId], renderZones, { deep: true });

// Actualizar marcador si las props de coordenadas cambian externamente
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
  zoneLayerGroup = null;
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
  flex-wrap: wrap;
}
.map-picker__hint > i { color: var(--c2-primary, #118652); }

.map-picker__zone-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(17, 134, 82, 0.10);
  color: var(--c2-primary, #118652);
  border: 1px solid rgba(17, 134, 82, 0.25);
}
.map-picker__zone-badge--no-poly {
  background: rgba(201, 162, 39, 0.10);
  color: #7a5c00;
  border-color: rgba(201, 162, 39, 0.30);
}

.map-picker__map {
  height: 300px;
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

<style>
/* Global para el tooltip de zona (Leaflet no permite scoped) */
.zone-tooltip {
  font-size: 11px;
  font-weight: 700;
  background: rgba(23, 35, 31, 0.82);
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 3px 8px;
  box-shadow: none;
}
.zone-tooltip::before { display: none; }
</style>
