<template>
  <div class="shell">
    <div class="head">
      <div>
        <div class="kicker">Mapa GPS</div>
        <div class="title">Cementerio de Somahoz</div>
      </div>
      <div class="actions">
        <a class="btn" :href="osmUrl" target="_blank" rel="noreferrer">OpenStreetMap</a>
        <a class="btn btn--primary" :href="googleMapsUrl" target="_blank" rel="noreferrer">Google Maps</a>
      </div>
    </div>

    <div class="map">
      <iframe
        class="map__frame"
        :src="embedUrl"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        title="Mapa Cementerio Somahoz"
      />
    </div>

    <div class="foot muted">
      Centro aproximado: Somahoz (Los Corrales de Buelna). Si se dispone de coordenadas exactas del cementerio, se puede ajustar aquí.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// Coordenadas de la localidad de Somahoz (aprox.).
// Si tenéis las coordenadas exactas del cementerio, sustituir estos valores.
const lat = 43.2488042;
const lon = -4.0637827;

const osmUrl = computed(() => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`);
const googleMapsUrl = computed(() => `https://www.google.com/maps?q=${lat},${lon}`);

const embedUrl = computed(() => {
  // BBOX alrededor del punto: ~1.2km (aprox) según el delta.
  const dLat = 0.006;
  const dLon = 0.006;
  const left = lon - dLon;
  const right = lon + dLon;
  const top = lat + dLat;
  const bottom = lat - dLat;
  const bbox = [left, bottom, right, top].map((n) => n.toFixed(6)).join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lon.toFixed(6)}`;
});
</script>

<style scoped>
.shell {
  background: rgba(245, 247, 244, 0.35);
  border: 1px solid rgba(23, 35, 31, 0.10);
  border-radius: 14px;
  overflow: hidden;
}

.head {
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  background: white;
  border-bottom: 1px solid rgba(23, 35, 31, 0.10);
}

.kicker { font-size: 12px; font-weight: 800; color: rgba(23, 35, 31, 0.65); }
.title { font-size: 14px; font-weight: 950; margin-top: 2px; color: rgba(23, 35, 31, 0.92); }
.actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(23, 35, 31, 0.14);
  background: rgba(245, 247, 244, 0.95);
  cursor: pointer;
  font-weight: 900;
  font-size: 12px;
  text-decoration: none;
  color: rgba(23, 35, 31, 0.92);
  display: inline-flex;
  align-items: center;
}
.btn:hover { background: white; }
.btn--primary {
  background: var(--c2-primary, #118652);
  border-color: rgba(17, 134, 82, 0.55);
  color: white;
}
.btn--primary:hover { filter: brightness(0.98); }

.map { background: white; }
.map__frame {
  width: 100%;
  height: 620px;
  border: 0;
  display: block;
}

.foot {
  padding: 10px 14px;
  background: white;
}
.muted { color: rgba(23, 35, 31, 0.62); font-size: 12px; }
</style>

