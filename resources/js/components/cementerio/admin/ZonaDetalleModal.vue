<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="titulo"
    :style="{ width: '740px', maxWidth: '96vw' }"
    :draggable="false"
    @show="onShow"
  >
    <div v-if="loading" class="estado-msg">
      <i class="pi pi-spin pi-spinner" /> Cargando…
    </div>
    <div v-else-if="loadError" class="estado-msg error">{{ loadError }}</div>

    <div v-else-if="data" class="detalle">

      <!-- Stats rápidas -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-card__num">{{ data.stats.bloques }}</span>
          <span class="stat-card__label">Bloques</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__num">{{ data.stats.sepulturas }}</span>
          <span class="stat-card__label">Sepulturas</span>
        </div>
        <div class="stat-card stat-card--green">
          <span class="stat-card__num">{{ data.stats.libres }}</span>
          <span class="stat-card__label">Libres</span>
        </div>
        <div class="stat-card stat-card--red">
          <span class="stat-card__num">{{ data.stats.ocupadas }}</span>
          <span class="stat-card__label">Ocupadas</span>
        </div>
      </div>

      <!-- Datos básicos -->
      <section class="section">
        <h4 class="section__title">Información</h4>
        <div class="grid2">
          <div class="field-row">
            <span class="label">Cementerio</span>
            <span>{{ data.cementerio_nombre ?? '—' }}</span>
          </div>
          <div class="field-row" v-if="data.codigo">
            <span class="label">Código</span>
            <span class="mono">{{ data.codigo }}</span>
          </div>
          <div class="field-row" v-if="data.lat || data.lon">
            <span class="label">Coordenadas GPS</span>
            <span class="mono small">{{ data.lat }}, {{ data.lon }}</span>
          </div>
        </div>
        <p v-if="data.descripcion" class="descripcion">{{ data.descripcion }}</p>
      </section>

      <!-- Mapa del polígono -->
      <section v-if="data.polygon?.length" class="section">
        <h4 class="section__title">Área en el mapa</h4>
        <div ref="mapEl" class="mini-mapa" />
      </section>

      <!-- Bloques -->
      <section class="section">
        <h4 class="section__title">
          Bloques
          <span class="badge-count" v-if="data.bloques.length">{{ data.bloques.length }}</span>
        </h4>
        <div v-if="!data.bloques.length" class="muted small">Sin bloques registrados.</div>
        <div v-else class="bloques-grid">
          <div v-for="b in data.bloques" :key="b.id" class="bloque-card">
            <div class="bloque-card__head">
              <span class="bloque-nombre">{{ b.nombre }}</span>
              <span v-if="b.codigo" class="bloque-codigo">{{ b.codigo }}</span>
              <span v-if="b.tipo" class="bloque-tipo">{{ b.tipo }}</span>
            </div>
            <div class="bloque-card__grid-info">{{ b.filas }}×{{ b.columnas }} celdas</div>
            <div class="bloque-card__stats">
              <span class="stat-mini stat-mini--total">{{ b.total }} total</span>
              <span class="stat-mini stat-mini--libre">{{ b.libres }} libres</span>
              <span class="stat-mini stat-mini--ocupada">{{ b.ocupadas }} ocup.</span>
            </div>
            <div class="bloque-card__bar">
              <div class="bloque-card__bar-fill"
                   :style="{ width: b.total ? Math.round(b.ocupadas / b.total * 100) + '%' : '0%' }" />
            </div>
          </div>
        </div>
      </section>

    </div>

    <template #footer>
      <Button label="Cerrar" severity="secondary" @click="visible = false" />
    </template>
  </Dialog>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue';
import api from '@/services/api';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

const props = defineProps({
  zonaId:     { type: Number, default: null },
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const loading   = ref(false);
const loadError = ref(null);
const data      = ref(null);
const mapEl     = ref(null);
let   mapInst   = null;

const titulo = computed(() => data.value?.nombre ?? 'Detalle de zona');

async function onShow() {
  if (!props.zonaId) return;
  data.value      = null;
  loadError.value = null;
  loading.value   = true;
  try {
    const res = await api.get(`/api/cementerio/admin/zonas/${props.zonaId}`);
    data.value = res.data;
    if (data.value?.polygon?.length) {
      await nextTick();
      initMap();
    }
  } catch (e) {
    loadError.value = e?.response?.data?.message ?? 'Error al cargar la zona.';
  } finally {
    loading.value = false;
  }
}

function initMap() {
  if (!mapEl.value || !data.value?.polygon?.length) return;

  import('leaflet').then(({ default: L }) => {
    if (mapInst) { mapInst.remove(); mapInst = null; }

    const latlngs = data.value.polygon.map(p => [p.lat, p.lon]);
    const poly = L.polygon(latlngs, {
      color: '#118652',
      fillColor: '#118652',
      fillOpacity: 0.18,
      weight: 2,
    });
    const bounds = poly.getBounds();

    mapInst = L.map(mapEl.value, {
      zoomControl: true,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 20,
    }).addTo(mapInst);
    poly.addTo(mapInst);
    mapInst.fitBounds(bounds, { padding: [20, 20] });
  });
}
</script>

<style scoped>
.estado-msg { padding: 24px; text-align: center; color: #888; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.error { color: var(--c2-danger, #A61B1B); }

.detalle { display: grid; gap: 18px; }

/* ── Stats ─────────────────────────────────────────── */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.stat-card {
  background: #f5f7f4; border-radius: 10px; padding: 12px 14px;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.stat-card--green { background: #dcfce7; }
.stat-card--red   { background: #fee2e2; }
.stat-card__num   { font-size: 22px; font-weight: 900; color: #1c2d29; line-height: 1; }
.stat-card--green .stat-card__num { color: #166534; }
.stat-card--red   .stat-card__num { color: #b91c1c; }
.stat-card__label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: #6b7a77; }

/* ── Secciones ─────────────────────────────────────── */
.section { border-top: 1px solid #eee; padding-top: 12px; }
.section__title {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: var(--c2-primary, #118652);
  margin: 0 0 10px; display: flex; align-items: center; gap: 8px;
}
.badge-count {
  background: var(--c2-primary, #118652); color: white;
  border-radius: 999px; min-width: 20px; height: 20px;
  padding: 0 6px; font-size: 11px; display: inline-flex;
  align-items: center; justify-content: center;
}
.grid2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.field-row { display: flex; flex-direction: column; gap: 3px; }
.label { font-size: 11px; color: #999; }
.mono  { font-family: monospace; font-size: 13px; font-weight: 600; }
.small { font-size: 12px; }
.muted { color: #999; font-size: 13px; }
.descripcion { font-size: 13px; color: #555; line-height: 1.5; margin: 8px 0 0; }

/* ── Mini mapa ─────────────────────────────────────── */
.mini-mapa { height: 220px; border-radius: 10px; overflow: hidden; border: 1px solid #e0e4e3; }

/* ── Bloques ───────────────────────────────────────── */
.bloques-grid { display: grid; gap: 8px; }
.bloque-card {
  border: 1px solid #e5e7e6; border-radius: 10px; padding: 10px 14px;
  display: grid; gap: 5px;
}
.bloque-card__head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.bloque-nombre { font-size: 14px; font-weight: 700; color: #1c2d29; }
.bloque-codigo {
  font-size: 11px; font-weight: 700; background: #f0f2f1;
  padding: 2px 8px; border-radius: 5px; color: #4a5e59;
}
.bloque-tipo { font-size: 11px; color: #888; }
.bloque-card__grid-info { font-size: 11px; color: #888; }
.bloque-card__stats { display: flex; gap: 8px; flex-wrap: wrap; }
.stat-mini {
  font-size: 11px; font-weight: 600; padding: 2px 7px;
  border-radius: 5px;
}
.stat-mini--total  { background: #f0f2f1; color: #374240; }
.stat-mini--libre  { background: #dcfce7; color: #166534; }
.stat-mini--ocupada{ background: #fee2e2; color: #b91c1c; }

/* ── Barra de ocupación ─────────────────────────────── */
.bloque-card__bar {
  height: 4px; background: #e5e7e6; border-radius: 2px; overflow: hidden;
}
.bloque-card__bar-fill {
  height: 100%; background: var(--c2-danger, #A61B1B);
  border-radius: 2px; transition: width .3s;
}
</style>
