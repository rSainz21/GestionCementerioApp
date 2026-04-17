<template>
  <div class="page">
    <div class="card">
      <TabView :lazy="true">
        <TabPanel header="Cementerios">
          <CrudCementerios />
        </TabPanel>
        <TabPanel header="Zonas">
          <CrudZonas />
        </TabPanel>
        <TabPanel header="Bloques">
          <CrudBloques />
        </TabPanel>
        <TabPanel header="Unidades">
          <CrudSepulturas />
        </TabPanel>
        <TabPanel header="Concesiones">
          <CrudConcesiones />
        </TabPanel>
      </TabView>
    </div>
  </div>
</template>

<script setup>
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import CrudCementerios from '@/components/cementerio/admin/CrudCementerios.vue';
import CrudZonas from '@/components/cementerio/admin/CrudZonas.vue';
import CrudBloques from '@/components/cementerio/admin/CrudBloques.vue';
import CrudSepulturas from '@/components/cementerio/admin/CrudSepulturas.vue';
import CrudConcesiones from '@/components/cementerio/admin/CrudConcesiones.vue';
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

