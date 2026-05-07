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
      <!-- Overlay: bloquea el iframe; desaparece mientras Ctrl está pulsado -->
      <div
        class="map__overlay"
        :class="{ 'map__overlay--pass': ctrlDown }"
        @wheel.prevent="onWheel"
      >
        <transition name="hint-fade">
          <div v-if="showHint" class="map__hint">
            Mantén <kbd>Ctrl</kbd> + rueda para hacer zoom
          </div>
        </transition>
      </div>

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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const lat = 43.248730;
const lon = -4.057985;

const osmUrl       = computed(() => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`);
const googleMapsUrl = computed(() => `https://www.google.com/maps?q=${lat},${lon}`);

const embedUrl = computed(() => {
  const dLat = 0.0012;
  const dLon = 0.0018;
  const left   = lon - dLon;
  const right  = lon + dLon;
  const top    = lat + dLat;
  const bottom = lat - dLat;
  const bbox = [left, bottom, right, top].map((n) => n.toFixed(6)).join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lon.toFixed(6)}`;
});

// ── Ctrl + rueda ──────────────────────────────────────────────────────────
const ctrlDown = ref(false);
const showHint = ref(false);
let hintTimer  = null;

function onKeyDown(e) { if (e.key === 'Control') ctrlDown.value = true; }
function onKeyUp(e)   { if (e.key === 'Control') ctrlDown.value = false; }

function onWheel() {
  // Solo se ejecuta cuando el overlay es visible (Ctrl no pulsado)
  clearTimeout(hintTimer);
  showHint.value = true;
  hintTimer = setTimeout(() => { showHint.value = false; }, 1800);
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  clearTimeout(hintTimer);
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
.title  { font-size: 14px; font-weight: 950; margin-top: 2px; color: rgba(23, 35, 31, 0.92); }
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

/* ── Mapa + overlay ──────────────────────────────────────── */
.map {
  background: white;
  position: relative;
}

.map__overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: all;
  cursor: default;
}
.map__overlay--pass {
  /* Ctrl pulsado: deja pasar todos los eventos al iframe */
  pointer-events: none;
}

.map__hint {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: rgba(23, 35, 31, 0.72);
  color: white;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 7px;
}

kbd {
  background: rgba(255,255,255,0.22);
  border-radius: 5px;
  padding: 1px 7px;
  font-family: inherit;
  font-size: 13px;
  border: 1px solid rgba(255,255,255,0.35);
}

.map__frame {
  width: 100%;
  height: 620px;
  border: 0;
  display: block;
}

.foot { padding: 10px 14px; background: white; }
.muted { color: rgba(23, 35, 31, 0.62); font-size: 12px; }

.hint-fade-enter-active, .hint-fade-leave-active { transition: opacity .2s; }
.hint-fade-enter-from, .hint-fade-leave-to { opacity: 0; }
</style>
