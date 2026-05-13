import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';

const LS_KEY = 'cementerio_activo_id';

export const useCementerioStore = defineStore('cementerio', () => {
    const lista       = ref([]);
    const loading     = ref(false);
    const _activoId   = ref(parseInt(localStorage.getItem(LS_KEY) || '0') || null);

    const activo = computed(() => lista.value.find(c => c.id === _activoId.value) ?? lista.value[0] ?? null);
    const activoId = computed(() => activo.value?.id ?? null);

    async function cargar() {
        if (lista.value.length) return;
        loading.value = true;
        try {
            const { data } = await api.get('/api/cementerio/admin/cementerios');
            lista.value = data.items ?? [];
            // Si el id guardado ya no existe, usar el primero
            if (_activoId.value && !lista.value.find(c => c.id === _activoId.value)) {
                seleccionar(lista.value[0]?.id ?? null);
            }
            if (!_activoId.value && lista.value.length) {
                seleccionar(lista.value[0].id);
            }
        } catch {
            // silencioso
        } finally {
            loading.value = false;
        }
    }

    function seleccionar(id) {
        _activoId.value = id;
        if (id) localStorage.setItem(LS_KEY, String(id));
        else localStorage.removeItem(LS_KEY);
    }

    return { lista, loading, activo, activoId, cargar, seleccionar };
});
