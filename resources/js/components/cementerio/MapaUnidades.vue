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
import { onMounted, ref } from 'vue';
import api from '@/services/api';
import SelectorNichosGrid from '@/components/cementerio/SelectorNichosGrid.vue';
import SepulturaInfoPanel from '@/components/cementerio/SepulturaInfoPanel.vue';

const zonas = ref([]);
const bloques = ref([]);
const selectedId = ref(null);

async function loadCatalogo() {
  const res = await api.get('/api/cementerio/catalogo');
  zonas.value = res.data?.zonas ?? [];
  bloques.value = res.data?.bloques ?? [];
}

function onSelected(sepultura) {
  selectedId.value = sepultura?.id ?? null;
}

onMounted(loadCatalogo);
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 14px;
  padding: 12px;
}
@media (max-width: 1100px) {
  .grid { grid-template-columns: 1fr; }
}
</style>

