<template>
  <div class="page">
    <div class="card">
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="0">Cementerios</Tab>
          <Tab value="1">Zonas</Tab>
          <Tab value="2">Bloques</Tab>
          <Tab value="3">Sepulturas</Tab>
          <Tab value="4">Concesiones</Tab>
          <Tab value="5">Terceros</Tab>
          <Tab value="6">Difuntos</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="0" lazy><CrudCementerios /></TabPanel>
          <TabPanel value="1" lazy><CrudZonas /></TabPanel>
          <TabPanel value="2" lazy><CrudBloques /></TabPanel>
          <TabPanel value="3" lazy><CrudSepulturas /></TabPanel>
          <TabPanel value="4" lazy><CrudConcesiones /></TabPanel>
          <TabPanel value="5" lazy><CrudTerceros /></TabPanel>
          <TabPanel value="6" lazy><CrudDifuntos /></TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>
</template>

<script setup>
import { provide, ref } from 'vue';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import CrudCementerios from '@/components/cementerio/admin/CrudCementerios.vue';
import CrudZonas from '@/components/cementerio/admin/CrudZonas.vue';
import CrudBloques from '@/components/cementerio/admin/CrudBloques.vue';
import CrudSepulturas from '@/components/cementerio/admin/CrudSepulturas.vue';
import CrudConcesiones from '@/components/cementerio/admin/CrudConcesiones.vue';
import CrudTerceros from '@/components/cementerio/admin/CrudTerceros.vue';
import CrudDifuntos from '@/components/cementerio/admin/CrudDifuntos.vue';

// Tab values: '0'=Cementerios, '1'=Zonas, '2'=Bloques, '3'=Sepulturas, '4'=Concesiones, '5'=Terceros, '6'=Difuntos
const activeTab = ref('0');
provide('navigateToTab', (index) => { activeTab.value = String(index); });
</script>

<style scoped>
.page {
  display: grid;
  gap: 12px;
}
.card {
  background: white;
  border-radius: 14px;
  border: 1px solid rgba(23, 35, 31, 0.10);
  box-shadow: 0 6px 18px rgba(23, 35, 31, 0.06);
  overflow: hidden;
}
</style>

