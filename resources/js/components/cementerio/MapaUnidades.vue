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

    <SepulturaInfoPanel :sepulturaId="selectedId" />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';
import SelectorNichosGrid from '@/components/cementerio/SelectorNichosGrid.vue';
import SepulturaInfoPanel from '@/components/cementerio/SepulturaInfoPanel.vue';

const zonas = ref([]);
const bloques = ref([]);
const selectedId = ref(null);
const route = useRoute();

async function loadCatalogo() {
  const res = await api.get('/api/cementerio/catalogo');
  zonas.value = res.data?.zonas ?? [];
  bloques.value = res.data?.bloques ?? [];
}

function onSelected(sepultura) {
  selectedId.value = sepultura?.id ?? null;
}

onMounted(loadCatalogo);

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
  /* Muchísimo más espacio al panel de detalle (derecha) */
  grid-template-columns: minmax(420px, 0.7fr) minmax(760px, 2.3fr);
  gap: 14px;
  padding: 12px;
}
@media (max-width: 1100px) {
  .grid { grid-template-columns: 1fr; }
}
</style>

