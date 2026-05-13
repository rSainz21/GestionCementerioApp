<template>
  <div class="papelera">

    <div class="papelera__header">
      <div class="papelera__title">
        <i class="pi pi-trash" />
        Papelera
      </div>
      <div class="papelera__sub">
        Los registros eliminados permanecen aquí {{ retentionDays }} días antes de borrarse definitivamente.
      </div>
      <button v-if="total > 0" class="btn-vaciar" @click="confirmarVaciar" :disabled="loading">
        <i class="pi pi-trash" /> Vaciar papelera ({{ total }})
      </button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ 'tab--active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <i :class="`pi ${tab.icon}`" />
        {{ tab.label }}
        <span v-if="counts[tab.key]" class="tab-badge">{{ counts[tab.key] }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-empty">
      <i class="pi pi-spin pi-spinner" style="font-size:24px;opacity:.4" />
      <span>Cargando…</span>
    </div>

    <!-- Lista vacía -->
    <div v-else-if="!listaActiva.length" class="state-empty">
      <i class="pi pi-check-circle" style="font-size:32px;color:#0F7A4A;opacity:.5" />
      <span>No hay {{ tabActiva?.label?.toLowerCase() }} en la papelera</span>
    </div>

    <!-- Lista de registros -->
    <div v-else class="lista">
      <div v-for="r in listaActiva" :key="r.id" class="item">
        <div class="item__icon">
          <i :class="`pi ${tabActiva?.icon}`" />
        </div>
        <div class="item__body">
          <div class="item__titulo">{{ r.titulo }}</div>
          <div class="item__sub muted">{{ r.subtitulo }}</div>
          <div class="item__fecha muted">
            <i class="pi pi-clock" style="font-size:10px" />
            Eliminado el {{ r.eliminado_en }}
          </div>
        </div>
        <div class="item__actions">
          <button
            class="ibtn ibtn--restore"
            :disabled="saving === r.id"
            @click="restaurar(r)"
            title="Restaurar registro"
          >
            <i class="pi" :class="saving === r.id ? 'pi-spin pi-spinner' : 'pi-arrow-circle-up'" />
            Restaurar
          </button>
          <button
            class="ibtn ibtn--delete"
            :disabled="saving === r.id"
            @click="borrarDefinitivo(r)"
            title="Eliminar definitivamente"
          >
            <i class="pi pi-times-circle" />
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmación vaciar -->
    <div v-if="showConfirm" class="confirm-overlay" @click.self="showConfirm = false">
      <div class="confirm-box">
        <i class="pi pi-exclamation-triangle confirm-box__icon" />
        <div class="confirm-box__title">¿Vaciar papelera?</div>
        <div class="confirm-box__sub">
          Se eliminarán definitivamente {{ total }} registro{{ total !== 1 ? 's' : '' }}.
          Esta acción <strong>no se puede deshacer</strong>.
        </div>
        <div class="confirm-box__actions">
          <button class="cbtn" @click="showConfirm = false">Cancelar</button>
          <button class="cbtn cbtn--danger" :disabled="vaciarLoading" @click="vaciar">
            <i class="pi" :class="vaciarLoading ? 'pi-spin pi-spinner' : 'pi-trash'" />
            {{ vaciarLoading ? 'Vaciando…' : 'Sí, vaciar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="msg" :class="['toast', msg.ok ? 'toast--ok' : 'toast--err']">
        <i :class="msg.ok ? 'pi pi-check-circle' : 'pi pi-times-circle'" />
        {{ msg.text }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import api from '@/services/api';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();

const retentionDays = computed(() => settings.get('papelera_retention_days', '60'));

const tabs = [
  { key: 'difuntos',    label: 'Difuntos',    icon: 'pi-user' },
  { key: 'concesiones', label: 'Concesiones', icon: 'pi-file' },
  { key: 'terceros',    label: 'Terceros',     icon: 'pi-users' },
];

const activeTab    = ref('difuntos');
const tabActiva    = computed(() => tabs.find(t => t.key === activeTab.value));
const loading      = ref(false);
const saving       = ref(null);
const showConfirm  = ref(false);
const vaciarLoading = ref(false);
const msg          = ref(null);
let msgTimer       = null;

const data = ref({ difuntos: [], concesiones: [], terceros: [] });

const listaActiva = computed(() => data.value[activeTab.value] ?? []);
const counts      = computed(() => ({
  difuntos:    data.value.difuntos.length,
  concesiones: data.value.concesiones.length,
  terceros:    data.value.terceros.length,
}));
const total = computed(() => counts.value.difuntos + counts.value.concesiones + counts.value.terceros);

function showMsg(ok, text) {
  msg.value = { ok, text };
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => { msg.value = null; }, 3500);
}

async function load() {
  loading.value = true;
  try {
    const { data: d } = await api.get('/api/cementerio/papelera');
    data.value = d;
  } catch {
    showMsg(false, 'Error al cargar la papelera.');
  } finally {
    loading.value = false;
  }
}

async function restaurar(r) {
  saving.value = r.id;
  try {
    await api.post(`/api/cementerio/papelera/${r.tipo}/${r.id}/restore`);
    data.value[r.tipo] = data.value[r.tipo].filter(x => x.id !== r.id);
    showMsg(true, `"${r.titulo}" restaurado correctamente.`);
  } catch (e) {
    showMsg(false, e?.response?.data?.message ?? 'Error al restaurar.');
  } finally {
    saving.value = null; }
}

async function borrarDefinitivo(r) {
  if (!confirm(`¿Eliminar definitivamente "${r.titulo}"? No hay vuelta atrás.`)) return;
  saving.value = r.id;
  try {
    await api.delete(`/api/cementerio/papelera/${r.tipo}/${r.id}`);
    data.value[r.tipo] = data.value[r.tipo].filter(x => x.id !== r.id);
    showMsg(true, 'Eliminado definitivamente.');
  } catch (e) {
    showMsg(false, e?.response?.data?.message ?? 'Error al eliminar.');
  } finally {
    saving.value = null; }
}

function confirmarVaciar() { showConfirm.value = true; }

async function vaciar() {
  vaciarLoading.value = true;
  try {
    await api.delete('/api/cementerio/papelera');
    data.value = { difuntos: [], concesiones: [], terceros: [] };
    showConfirm.value = false;
    showMsg(true, 'Papelera vaciada.');
  } catch (e) {
    showMsg(false, e?.response?.data?.message ?? 'Error al vaciar la papelera.');
  } finally {
    vaciarLoading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.papelera { display: flex; flex-direction: column; gap: 14px; }

.papelera__header {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 10px;
}
.papelera__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 800;
  color: var(--c2-text, #17231F);
  flex: 1;
}
.papelera__title .pi { color: #A61B1B; font-size: 18px; }
.papelera__sub { width: 100%; font-size: 12.5px; color: rgba(23,35,31,.55); margin-top: -6px; }

.btn-vaciar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid rgba(166,27,27,.35);
  background: rgba(166,27,27,.06);
  color: #A61B1B;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 100ms;
}
.btn-vaciar:hover:not(:disabled) { background: rgba(166,27,27,.12); }
.btn-vaciar:disabled { opacity: .5; cursor: not-allowed; }

/* ── Tabs ── */
.tabs {
  display: flex;
  gap: 4px;
  background: #f0f2f1;
  border-radius: 10px;
  padding: 4px;
}
.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 7px;
  border: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: rgba(23,35,31,.65);
  cursor: pointer;
  transition: background 100ms, color 100ms;
}
.tab:hover { background: rgba(255,255,255,.7); color: rgba(23,35,31,.9); }
.tab--active {
  background: #fff;
  color: var(--c2-primary, #118652);
  box-shadow: 0 1px 4px rgba(23,35,31,.10);
  font-weight: 800;
}
.tab-badge {
  background: #A61B1B;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 999px;
}

/* ── Estado vacío ── */
.state-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 20px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(23,35,31,.08);
  color: rgba(23,35,31,.45);
  font-size: 13px;
}

/* ── Lista ── */
.lista {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid rgba(23,35,31,.08);
  box-shadow: 0 1px 4px rgba(23,35,31,.04);
}
.item__icon {
  width: 36px; height: 36px;
  border-radius: 9px;
  background: rgba(166,27,27,.08);
  border: 1px solid rgba(166,27,27,.15);
  display: grid; place-items: center;
  color: #A61B1B;
  font-size: 13px;
  flex-shrink: 0;
}
.item__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.item__titulo { font-size: 13.5px; font-weight: 700; color: #1c2d29; }
.item__sub { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item__fecha { font-size: 11px; display: flex; align-items: center; gap: 4px; }
.muted { color: rgba(23,35,31,.50); }
.item__actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.ibtn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 10px; border-radius: 7px;
  border: 1px solid rgba(23,35,31,.14);
  background: #fafbfa;
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  transition: background 100ms;
}
.ibtn:disabled { opacity:.5; cursor:not-allowed; }
.ibtn--restore { color: var(--c2-primary, #118652); border-color: rgba(17,134,82,.25); }
.ibtn--restore:hover:not(:disabled) { background: rgba(17,134,82,.07); }
.ibtn--delete { color: #A61B1B; border-color: rgba(166,27,27,.22); padding: 6px 8px; }
.ibtn--delete:hover:not(:disabled) { background: rgba(166,27,27,.07); }

/* ── Confirmación vaciar ── */
.confirm-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  z-index: 300;
  display: flex; align-items: center; justify-content: center;
}
.confirm-box {
  background: #fff;
  border-radius: 14px;
  padding: 28px 24px;
  max-width: 380px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,.2);
}
.confirm-box__icon { font-size: 36px; color: #A61B1B; margin-bottom: 12px; }
.confirm-box__title { font-size: 17px; font-weight: 900; margin-bottom: 8px; color: #1c2d29; }
.confirm-box__sub { font-size: 13px; color: rgba(23,35,31,.65); margin-bottom: 20px; line-height: 1.5; }
.confirm-box__actions { display: flex; gap: 8px; justify-content: center; }
.cbtn {
  padding: 9px 18px; border-radius: 9px; border: 1px solid rgba(23,35,31,.18);
  background: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
  transition: background 100ms;
}
.cbtn:hover { background: #f0f2f1; }
.cbtn--danger {
  background: #A61B1B; color: #fff; border-color: transparent;
  display: flex; align-items: center; gap: 6px;
}
.cbtn--danger:hover:not(:disabled) { filter: brightness(1.1); }
.cbtn--danger:disabled { opacity:.5; cursor:not-allowed; }

/* ── Toast ── */
.toast {
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px;
  padding: 11px 18px; border-radius: 12px;
  font-size: 13px; font-weight: 700;
  box-shadow: 0 8px 24px rgba(0,0,0,.18);
  z-index: 400;
}
.toast--ok { background: var(--c2-primary, #118652); color: #fff; }
.toast--err { background: #A61B1B; color: #fff; }
.toast-enter-active { transition: opacity 200ms, transform 200ms; }
.toast-leave-active { transition: opacity 150ms; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(8px); }
.toast-leave-to  { opacity: 0; }
</style>
