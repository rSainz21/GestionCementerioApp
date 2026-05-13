<template>
  <Dialog v-model:visible="visible" modal header="Zona" :style="{ width: '560px' }">
    <div class="form">
      <div class="field">
        <label>Cementerio</label>
        <Dropdown v-model="form.cementerio_id" :options="cementerios" optionLabel="nombre" optionValue="id" placeholder="Selecciona…" />
      </div>
      <div class="field">
        <label>Código</label>
        <InputText v-model="form.codigo" />
      </div>
      <div class="field">
        <label>Nombre</label>
        <InputText v-model="form.nombre" />
      </div>
      <div class="field">
        <label>Descripción</label>
        <InputText v-model="form.descripcion" />
      </div>

      <div class="field">
        <label class="label-map">
          <i class="pi pi-map-marker" style="color:var(--c2-primary,#118652)" />
          Área de la zona en el mapa
          <span class="label-map__hint">Obligatorio para mostrar la zona en el mapa · marca 4 puntos</span>
        </label>
        <ZonaAreaPicker
          v-model="form.polygon"
          :defaultLat="43.248730"
          :defaultLon="-4.057985"
          :defaultZoom="17"
        />
      </div>

      <div v-if="error" class="error">{{ error }}</div>
    </div>

    <template #footer>
      <Button label="Cancelar" severity="secondary" @click="visible = false" />
      <Button label="Guardar" :loading="saving" @click="save" />
    </template>
  </Dialog>
</template>

<script setup>
import { computed, reactive, watch } from 'vue';
import api from '@/services/api';
import { ref } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import ZonaAreaPicker from '@/components/cementerio/ZonaAreaPicker.vue';

const props = defineProps({
  modelValue:  { type: Boolean, default: false },
  cementerios: { type: Array, default: () => [] },
  editData:    { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'saved']);

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const saving = ref(false);
const error  = ref(null);

const form = reactive({
  id: null, cementerio_id: null, codigo: '', nombre: '',
  descripcion: '', lat: null, lon: null, polygon: [],
});

watch(visible, (v) => {
  if (v) {
    error.value = null;
    if (props.editData) {
      Object.assign(form, {
        id: props.editData.id,
        cementerio_id: props.editData.cementerio_id,
        codigo: props.editData.codigo ?? '',
        nombre: props.editData.nombre ?? '',
        descripcion: props.editData.descripcion ?? '',
        lat: props.editData.lat ?? null,
        lon: props.editData.lon ?? null,
        polygon: props.editData.polygon ?? [],
      });
    } else {
      Object.assign(form, {
        id: null,
        cementerio_id: props.cementerios[0]?.id ?? null,
        codigo: '', nombre: '', descripcion: '',
        lat: null, lon: null, polygon: [],
      });
    }
  }
});

async function save() {
  saving.value = true;
  error.value  = null;
  try {
    if (form.id) {
      await api.put(`/api/cementerio/admin/zonas/${form.id}`, form);
    } else {
      await api.post('/api/cementerio/admin/zonas', form);
    }
    visible.value = false;
    emit('saved');
  } catch (e) {
    error.value = e?.response?.data?.message
      ?? Object.values(e?.response?.data?.errors ?? {}).flat().join(' ')
      ?? 'Error al guardar la zona.';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.form { display: grid; gap: 10px; }
.field { display: grid; gap: 6px; }
.error { color: var(--c2-danger, #A61B1B); font-size: 13px; }
.label-map { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; }
.label-map__hint { font-size: 11px; color: rgba(23,35,31,.50); font-weight: 400; }
</style>
