<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Regularizaciones"
    :style="{ width: 'min(1400px, 96vw)', maxHeight: '90vh' }"
    :pt="{ content: { style: 'padding: 0; overflow: auto;' } }"
  >
    <div class="reg-header">
      <div class="reg-header__text">
        <span class="reg-header__title">Asignación de difuntos a sepulturas</span>
        <span class="reg-header__sub">Arrastra un difunto del panel derecho sobre una sepultura del mapa para vincularlo.</span>
      </div>
    </div>

    <MapaUnidades />

    <template #footer>
      <Button label="Cerrar" severity="secondary" @click="visible = false" />
    </template>
  </Dialog>
</template>

<script setup>
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import MapaUnidades from '@/components/cementerio/MapaUnidades.vue';

const visible = defineModel('visible', { type: Boolean, default: false });
</script>

<style scoped>
.reg-header {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(23,35,31,0.08);
  background: rgba(245,247,244,0.6);
}
.reg-header__title {
  display: block;
  font-weight: 900;
  font-size: 14px;
  color: rgba(23,35,31,0.92);
}
.reg-header__sub {
  display: block;
  font-size: 12px;
  color: rgba(23,35,31,0.60);
  margin-top: 2px;
}
</style>
