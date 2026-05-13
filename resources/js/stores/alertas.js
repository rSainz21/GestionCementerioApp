import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import { useSettingsStore } from '@/stores/settings';

export const useAlertasStore = defineStore('alertas', () => {
    const grupos    = ref([]);
    const total     = ref(0);
    const loading   = ref(false);
    const lastFetch = ref(null);

    const hayCriticas = computed(() =>
        grupos.value.some(g => g.nivel === 'critico' && g.total > 0)
    );

    function intervaloMs() {
        const settings = useSettingsStore();
        const min = Number(settings.get('intervalo_refresco_min', 5));
        return min > 0 ? min * 60 * 1000 : Infinity;
    }

    async function fetch(force = false) {
        const ms = intervaloMs();
        if (!force && lastFetch.value && (Date.now() - lastFetch.value) < ms) {
            return;
        }
        loading.value = true;
        try {
            const res = await api.get('/api/cementerio/alertas');
            grupos.value    = res.data.grupos ?? [];
            total.value     = res.data.total  ?? 0;
            lastFetch.value = Date.now();
        } catch {
            // silencioso — no rompemos el layout si falla
        } finally {
            loading.value = false;
        }
    }

    function invalidar() {
        lastFetch.value = null;
    }

    return { grupos, total, loading, hayCriticas, fetch, invalidar };
});
