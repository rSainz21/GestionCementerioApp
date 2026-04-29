<template>
  <div class="page">
    <header class="page__header">
      <div>
        <h2 class="title">Navegación espacial</h2>
        <div class="subtitle">Selecciona una zona del plano para abrir su vista.</div>
      </div>
      <div class="actions">
        <router-link class="btn btn--ghost" to="/cementerio">Volver a Inicio</router-link>
      </div>
    </header>

    <section class="card">
      <div class="card__body">
        <MapaOrtoSomahozHotspots
          imageUrl="/img/somahoz-orto-hotspots.png"
          @action="onAction"
        />
      </div>
    </section>

    <section v-if="panel.mode" class="card">
      <div class="card__body">
        <div class="panel-head">
          <div class="panel-title">{{ panel.title }}</div>
          <button class="btn btn--ghost" type="button" @click="closePanel">Cerrar</button>
        </div>

        <div v-if="panel.mode === 'bloque'" class="panel-body">
          <div class="muted">Vista de bloque seleccionada desde el mapa.</div>
          <SelectorNichosGrid
            :zonas="zonas"
            :bloques="bloques"
            selectionMode="todas"
            :selectedSepulturaId="selectedSepulturaId"
            :initialZonaId="panel.zonaId"
            :initialBloqueId="panel.bloqueId"
            @update:selectedSepulturaId="(v) => (selectedSepulturaId = v)"
            @selected="(s) => (selectedSepulturaId = s?.id ?? null)"
          />
        </div>

        <div v-else-if="panel.mode === 'zona_nueva'" class="panel-body">
          <div class="muted">Elige un bloque moderno exento para abrir su cuadrícula.</div>
          <div class="chips">
            <button v-for="b in bloquesZonaNueva" :key="b.id" class="chip" type="button" @click="openBloque(b.zona_id, b.id, b.codigo)">
              {{ b.codigo }}
            </button>
          </div>
        </div>

        <div v-else-if="panel.mode === 'columbarios'" class="panel-body">
          <div class="muted">Columbarios: puntos de prueba ya cargados. Abre uno desde el mapa o desde el listado.</div>
          <div class="chips">
            <button v-for="s in columbarios" :key="s.id" class="chip chip--sub" type="button" @click="openSepultura(s.id)">
              {{ s.codigo || ('ID ' + s.id) }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '@/services/api';
import MapaOrtoSomahozHotspots from '@/components/cementerio/MapaOrtoSomahozHotspots.vue';
import SelectorNichosGrid from '@/components/cementerio/SelectorNichosGrid.vue';

const zonas = ref([]);
const bloques = ref([]);
const columbarios = ref([]);
const selectedSepulturaId = ref(null);

const panel = reactive({
  mode: null, // 'bloque' | 'zona_nueva' | 'columbarios'
  title: '',
  zonaId: null,
  bloqueId: null,
});

const bloquesZonaNueva = computed(() =>
  bloques.value.filter((b) =>
    b?.zona_id === 2 &&
    ['B2001', 'B2007', 'BD', 'B2017', 'B2020'].includes(String(b.codigo || '').toUpperCase())
  )
);

function closePanel() {
  panel.mode = null;
  panel.title = '';
  panel.zonaId = null;
  panel.bloqueId = null;
}

function openSepultura(id) {
  // reutilizamos el patrón actual del proyecto: abrir detalle desde Inicio
  // (en esta pantalla, por ahora solo marcamos selección para la cuadrícula o navegación futura)
  selectedSepulturaId.value = Number(id) || null;
}

function openBloque(zonaId, bloqueId, bloqueCodigo) {
  panel.mode = 'bloque';
  panel.title = `Bloque ${bloqueCodigo}`;
  panel.zonaId = zonaId;
  panel.bloqueId = bloqueId;
  // Transición suave hacia el panel
  setTimeout(() => document.querySelector('.panel-head')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
}

function onAction(action) {
  if (!action) return;

  if (action.type === 'bloque') {
    const b = bloques.value.find((x) => String(x.codigo).toUpperCase() === String(action.bloque_codigo).toUpperCase());
    if (!b) return;
    openBloque(action.zona_id, b.id, b.codigo);
    return;
  }

  if (action.type === 'zona_nueva') {
    panel.mode = 'zona_nueva';
    panel.title = 'Zona nueva · Ampliaciones';
    setTimeout(() => document.querySelector('.panel-head')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return;
  }

  if (action.type === 'columbarios') {
    panel.mode = 'columbarios';
    panel.title = 'Columbarios';
    setTimeout(() => document.querySelector('.panel-head')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }
}

async function loadCatalogo() {
  const res = await api.get('/api/cementerio/catalogo');
  zonas.value = res.data?.zonas ?? [];
  bloques.value = res.data?.bloques ?? [];
}

async function loadColumbarios() {
  // reutilizamos listado admin para tener códigos
  const res = await api.get('/api/cementerio/admin/sepulturas');
  columbarios.value = (res.data?.items ?? []).filter((s) => String(s.tipo || '').toLowerCase() === 'columbario').slice(0, 20);
}

onMounted(async () => {
  await Promise.all([loadCatalogo(), loadColumbarios()]);
});
</script>

<style scoped>
.page { display: grid; gap: 14px; }
.page__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.title { margin: 0; font-size: 20px; color: var(--c2-text, #17231F); }
.subtitle { margin-top: 4px; color: rgba(23, 35, 31, 0.65); font-size: 13px; }
.actions { display: flex; gap: 10px; align-items: center; }

.card { background: white; border-radius: 14px; border: 1px solid rgba(23, 35, 31, 0.10); box-shadow: 0 6px 18px rgba(23, 35, 31, 0.06); }
.card__body { padding: 16px; }

.panel-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
.panel-title { font-weight: 950; }
.panel-body { display: grid; gap: 10px; }

.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(17, 134, 82, 0.35);
  background: rgba(17, 134, 82, 0.08);
  cursor: pointer;
  font-weight: 900;
  color: rgba(23,35,31,0.92);
}
.chip:hover { background: rgba(17, 134, 82, 0.12); }
.chip--sub { border-color: rgba(18,102,163,0.35); background: rgba(18,102,163,0.08); }

.btn {
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(23, 35, 31, 0.14);
  background: white;
  cursor: pointer;
  font-weight: 800;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.btn--ghost { background: transparent; }
.muted { color: rgba(23, 35, 31, 0.60); font-size: 12px; }
</style>

