<template>
  <div class="ssi">
    <template v-if="selected">
      <span class="ssi__selected">
        <span class="ssi__codigo">{{ selected.codigo }}</span>
        <span class="ssi__meta">{{ selected.zona_nombre }} · {{ selected.estado }}</span>
      </span>
      <button type="button" class="ssi__clear" @click="clear" title="Cambiar">
        <i class="pi pi-times" />
      </button>
    </template>
    <template v-else>
      <input
        v-model="q"
        type="text"
        class="ssi__input"
        placeholder="Código de sepultura…"
        @input="buscar"
        @keydown.esc="resultados = []"
      />
      <div v-if="resultados.length" class="ssi__dropdown">
        <button
          v-for="s in resultados"
          :key="s.id"
          type="button"
          class="ssi__item"
          @click="seleccionar(s)"
        >
          <span class="ssi__codigo">{{ s.codigo }}</span>
          <span class="ssi__meta">{{ s.zona_nombre }}{{ s.bloque_nombre ? ' · ' + s.bloque_nombre : '' }}</span>
          <span :class="['ssi__estado', `ssi__estado--${s.estado}`]">{{ s.estado }}</span>
        </button>
      </div>
      <div v-else-if="q.length >= 2 && !loading && buscado" class="ssi__empty">Sin resultados</div>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from '@/services/api';

const props = defineProps({ modelValue: { type: Object, default: null } });
const emit  = defineEmits(['update:modelValue']);

const q          = ref('');
const resultados = ref([]);
const loading    = ref(false);
const buscado    = ref(false);
const selected   = ref(props.modelValue ?? null);

let timer = null;

function buscar() {
  buscado.value = false;
  clearTimeout(timer);
  if (q.value.length < 2) { resultados.value = []; return; }
  loading.value = true;
  timer = setTimeout(async () => {
    try {
      const res = await api.get('/api/cementerio/sepulturas/search', { params: { q: q.value, limit: 10 } });
      resultados.value = res.data?.items ?? [];
      buscado.value = true;
    } finally {
      loading.value = false;
    }
  }, 250);
}

function seleccionar(s) {
  selected.value  = s;
  resultados.value = [];
  q.value = '';
  emit('update:modelValue', s);
}

function clear() {
  selected.value = null;
  emit('update:modelValue', null);
}
</script>

<style scoped>
.ssi { position: relative; display: flex; align-items: center; gap: 6px; }

.ssi__input {
  width: 100%; padding: 5px 8px; border: 1px solid #d4dbd9; border-radius: 6px;
  font-size: 12.5px; outline: none; background: #fafbfa;
}
.ssi__input:focus { border-color: var(--c2-primary, #118652); background: #fff; }

.ssi__dropdown {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
  background: #fff; border: 1px solid #d4dbd9; border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,.1);
  max-height: 200px; overflow-y: auto;
  margin-top: 3px;
}
.ssi__item {
  width: 100%; display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; background: none; border: none; cursor: pointer;
  text-align: left; font-size: 12.5px; transition: background .1s;
}
.ssi__item:hover { background: #f0f7f4; }

.ssi__codigo { font-weight: 700; color: #1c2d29; flex-shrink: 0; }
.ssi__meta   { flex: 1; color: #888; font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ssi__estado { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; flex-shrink: 0; }
.ssi__estado--libre  { background: #dcfce7; color: #166534; }
.ssi__estado--ocupada{ background: #fee2e2; color: #b91c1c; }

.ssi__empty { font-size: 12px; color: #aaa; padding: 4px 8px; }

.ssi__selected { display: flex; align-items: center; gap: 6px; flex: 1; }
.ssi__clear {
  background: none; border: none; cursor: pointer; padding: 2px 5px;
  color: #888; border-radius: 4px; transition: color .1s;
}
.ssi__clear:hover { color: #b91c1c; }
</style>
