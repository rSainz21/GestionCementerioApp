<template>
  <div class="grid">
    <SelectorNichosGrid
      :zonas="zonas"
      :bloques="bloques"
      selectionMode="todas"
      :selectedSepulturaId="selectedId"
      @update:selectedSepulturaId="(v) => (selectedId = v)"
      @selected="onSelected"
    />

    <div class="right">
      <MapaGpsSomahoz />

      <div class="right__overlay">
        <button class="btn" type="button" :disabled="!selectedId" @click="openDetail(selectedId)">
          <i class="pi pi-eye" />
          Ver expediente
        </button>
      </div>
    </div>

    <Dialog v-model:visible="detailDialog" modal header="Detalle de unidad" :style="{ width: 'min(1400px, 96vw)' }">
      <SepulturaInfoPanel :sepulturaId="detailSepulturaId" />
      <template #footer>
        <Button label="Cerrar" severity="secondary" @click="detailDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';
import SelectorNichosGrid from '@/components/cementerio/SelectorNichosGrid.vue';
import SepulturaInfoPanel from '@/components/cementerio/SepulturaInfoPanel.vue';
import MapaGpsSomahoz from '@/components/cementerio/MapaGpsSomahoz.vue';

import Button from 'primevue/button';
import Dialog from 'primevue/dialog';

const zonas = ref([]);
const bloques = ref([]);
const selectedId = ref(null);
const route = useRoute();

const detailDialog = ref(false);
const detailSepulturaId = ref(null);

async function loadCatalogo() {
  const res = await api.get('/api/cementerio/catalogo');
  zonas.value = res.data?.zonas ?? [];
  bloques.value = res.data?.bloques ?? [];
}

function onSelected(sepultura) {
  selectedId.value = sepultura?.id ?? null;
  if (selectedId.value) openDetail(selectedId.value);
}

onMounted(loadCatalogo);

function openDetail(id) {
  const v = Number(id);
  if (!Number.isFinite(v) || v <= 0) return;
  detailSepulturaId.value = v;
  detailDialog.value = true;
}

watch(
  () => route.query?.sepultura,
  (v) => {
    const id = Number(v);
    if (Number.isFinite(id) && id > 0) {
      selectedId.value = id;
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: minmax(420px, 0.85fr) minmax(520px, 1.15fr);
  gap: 14px;
  padding: 12px;
}
@media (max-width: 1100px) {
  .grid { grid-template-columns: 1fr; }
}

.right {
  position: relative;
}

.right__overlay {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  justify-content: flex-end;
}

.btn {
  height: 36px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(23, 35, 31, 0.14);
  background: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 24px rgba(23, 35, 31, 0.12);
  backdrop-filter: blur(6px);
}
.btn:hover { background: white; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
</style>

