import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';

export const useSettingsStore = defineStore('settings', () => {
    const grupos  = ref({});
    const loading = ref(false);
    const dirty   = ref(false);

    // Mapa plano clave → objeto setting
    const map = computed(() => {
        const result = {};
        Object.values(grupos.value).forEach(lista => {
            lista.forEach(s => { result[s.clave] = s; });
        });
        return result;
    });

    function get(clave, fallback = null) {
        return map.value[clave]?.valor ?? fallback;
    }

    function getNum(clave, fallback = 0) {
        const v = get(clave);
        return v !== null ? Number(v) : fallback;
    }

    async function fetch() {
        loading.value = true;
        try {
            const { data } = await api.get('/api/cementerio/settings');
            grupos.value = data;
            applyCssVars();
        } catch {
            // silencioso si el usuario no tiene permiso aún
        } finally {
            loading.value = false;
        }
    }

    function setLocal(clave, valor) {
        const s = map.value[clave];
        if (s) {
            s.valor = valor;
            dirty.value = true;
            if (['color_primario', 'color_sidebar', 'color_acento', 'densidad'].includes(clave)) {
                applyCssVars();
            }
        }
    }

    async function save() {
        const payload = Object.values(map.value).map(s => ({ clave: s.clave, valor: s.valor }));
        await api.put('/api/cementerio/settings', { settings: payload });
        dirty.value = false;
        applyCssVars();
    }

    async function reset() {
        dirty.value = false;
        await fetch();
    }

    function applyCssVars() {
        const root = document.documentElement;
        const primario = get('color_primario', '#118652');
        const sidebar  = get('color_sidebar',  '#0E2F2A');
        const acento   = get('color_acento',   '#C9A227');

        root.style.setProperty('--c2-primary',     primario);
        root.style.setProperty('--c2-primary-dark', shadeColor(primario, -15));
        root.style.setProperty('--c2-sidebar-bg',  sidebar);
        root.style.setProperty('--c2-secondary',   acento);

        const densidad = get('densidad', 'normal');
        document.body.classList.toggle('layout--compacta', densidad === 'compacta');
    }

    function shadeColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
        return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
    }

    return { grupos, loading, dirty, map, get, getNum, fetch, setLocal, save, reset, applyCssVars };
});
