<template>
  <Teleport to="body">
    <transition name="panel">
      <div v-if="open" class="cfg-overlay" @click.self="cerrar">
        <aside class="cfg-panel" role="dialog" aria-label="Configuración">

          <!-- Cabecera -->
          <div class="cfg-header">
            <div class="cfg-header__title">
              <i class="pi pi-sliders-h" />
              Configuración
            </div>
            <div class="cfg-header__actions">
              <button v-if="store.dirty" class="cfg-btn cfg-btn--ghost" @click="store.reset()" title="Descartar cambios">
                <i class="pi pi-undo" />
              </button>
              <button class="cfg-btn cfg-btn--close" @click="cerrar" title="Cerrar">
                <i class="pi pi-times" />
              </button>
            </div>
          </div>

          <!-- Grupos -->
          <div class="cfg-body">

            <!-- Grupo especial: Sistema (info live + acciones) -->
            <div class="cfg-grupo">
              <button class="cfg-grupo__cabecera" @click="toggleGrupo('__sistema')" type="button">
                <i class="pi pi-server" />
                <span>Sistema y mantenimiento</span>
                <i class="pi cfg-grupo__chevron"
                   :class="abiertos.has('__sistema') ? 'pi-chevron-up' : 'pi-chevron-down'" />
              </button>

              <div v-if="abiertos.has('__sistema')" class="cfg-grupo__body">
                <!-- Info del sistema -->
                <div v-if="sysLoading" class="sys-loading">
                  <i class="pi pi-spin pi-spinner" /> Cargando información del sistema…
                </div>
                <template v-else-if="sysInfo">
                  <div class="sys-grid">
                    <div class="sys-item"><span class="sys-label">PHP</span><span class="sys-val">{{ sysInfo.php_version }}</span></div>
                    <div class="sys-item"><span class="sys-label">Laravel</span><span class="sys-val">{{ sysInfo.laravel_version }}</span></div>
                    <div class="sys-item"><span class="sys-label">Base de datos</span><span class="sys-val">{{ sysInfo.db_version }}</span></div>
                    <div class="sys-item"><span class="sys-label">Entorno</span><span class="sys-val">{{ sysInfo.app_env }}</span></div>
                    <div class="sys-item"><span class="sys-label">Disco libre</span><span class="sys-val">{{ sysInfo.disk_free_gb }} GB</span></div>
                    <div class="sys-item"><span class="sys-label">Disco total</span><span class="sys-val">{{ sysInfo.disk_total_gb }} GB</span></div>
                    <div class="sys-item"><span class="sys-label">Upload max</span><span class="sys-val">{{ formatBytes(sysInfo.max_upload_bytes) }}</span></div>
                    <div class="sys-item"><span class="sys-label">Memoria</span><span class="sys-val">{{ sysInfo.memory_limit }}</span></div>
                  </div>

                  <!-- Conteos de registros -->
                  <div class="sys-section-label">Registros en BD</div>
                  <div class="sys-grid sys-grid--3">
                    <div class="sys-item" v-for="(n, k) in sysInfo.conteos" :key="k">
                      <span class="sys-label">{{ k }}</span><span class="sys-val sys-val--num">{{ n.toLocaleString() }}</span>
                    </div>
                  </div>

                  <!-- Papelera -->
                  <div class="sys-section-label">En papelera</div>
                  <div class="sys-grid sys-grid--3">
                    <div class="sys-item" v-for="(n, k) in sysInfo.papelera" :key="k">
                      <span class="sys-label">{{ k }}</span>
                      <span class="sys-val sys-val--num" :class="n > 0 ? 'sys-val--warn' : ''">{{ n }}</span>
                    </div>
                  </div>
                </template>

                <!-- Acciones de mantenimiento -->
                <div class="sys-section-label">Acciones</div>
                <div class="sys-actions">
                  <button class="sys-btn" :disabled="sysAction === 'cache'" @click="limpiarCache">
                    <i class="pi" :class="sysAction === 'cache' ? 'pi-spin pi-spinner' : 'pi-eraser'" />
                    Limpiar caché
                  </button>
                  <button class="sys-btn" :disabled="sysAction === 'optimize'" @click="optimizarBD">
                    <i class="pi" :class="sysAction === 'optimize' ? 'pi-spin pi-spinner' : 'pi-database'" />
                    Optimizar tablas BD
                  </button>
                  <button class="sys-btn sys-btn--primary" :disabled="sysAction === 'backup'" @click="descargarBackup">
                    <i class="pi" :class="sysAction === 'backup' ? 'pi-spin pi-spinner' : 'pi-download'" />
                    Descargar backup SQL
                  </button>
                </div>
                <div v-if="sysMsg" :class="['sys-msg', sysMsg.ok ? 'sys-msg--ok' : 'sys-msg--err']">
                  <i :class="sysMsg.ok ? 'pi pi-check-circle' : 'pi pi-times-circle'" />
                  {{ sysMsg.text }}
                </div>
              </div>
            </div>

            <!-- Grupos de settings normales desde BD -->
            <div
              v-for="(items, grupo) in store.grupos"
              :key="grupo"
              class="cfg-grupo"
            >
              <button class="cfg-grupo__cabecera" @click="toggleGrupo(grupo)" type="button">
                <i :class="`pi ${iconoGrupo(grupo)}`" />
                <span>{{ etiquetaGrupo(grupo) }}</span>
                <i class="pi cfg-grupo__chevron"
                   :class="abiertos.has(grupo) ? 'pi-chevron-up' : 'pi-chevron-down'" />
              </button>

              <div v-if="abiertos.has(grupo)" class="cfg-grupo__body">
                <div v-for="setting in items" :key="setting.clave" class="cfg-field">
                  <label class="cfg-field__label">{{ setting.etiqueta }}</label>
                  <p v-if="setting.descripcion" class="cfg-field__desc">{{ setting.descripcion }}</p>

                  <!-- Color -->
                  <div v-if="setting.tipo === 'color'" class="cfg-color-wrap">
                    <input
                      type="color"
                      class="cfg-color-input"
                      :value="setting.valor"
                      @input="store.setLocal(setting.clave, $event.target.value)"
                    />
                    <input
                      type="text"
                      class="cfg-text-input cfg-text-input--sm"
                      :value="setting.valor"
                      maxlength="7"
                      @change="store.setLocal(setting.clave, $event.target.value)"
                    />
                    <button class="cfg-btn cfg-btn--ghost cfg-btn--xs"
                            @click="resetColor(setting)"
                            title="Restaurar color por defecto">
                      <i class="pi pi-refresh" />
                    </button>
                  </div>

                  <!-- Booleano -->
                  <label v-else-if="setting.tipo === 'booleano'" class="cfg-toggle">
                    <input
                      type="checkbox"
                      class="cfg-toggle__input"
                      :checked="setting.valor === '1'"
                      @change="store.setLocal(setting.clave, $event.target.checked ? '1' : '0')"
                    />
                    <span class="cfg-toggle__track">
                      <span class="cfg-toggle__thumb" />
                    </span>
                    <span class="cfg-toggle__text">{{ setting.valor === '1' ? 'Activado' : 'Desactivado' }}</span>
                  </label>

                  <!-- Select -->
                  <select
                    v-else-if="setting.tipo === 'select'"
                    class="cfg-select"
                    :value="setting.valor"
                    @change="store.setLocal(setting.clave, $event.target.value)"
                  >
                    <option v-for="op in setting.opciones" :key="op.valor" :value="op.valor">
                      {{ op.etiqueta }}
                    </option>
                  </select>

                  <!-- Número -->
                  <input
                    v-else-if="setting.tipo === 'numero'"
                    type="number"
                    class="cfg-text-input"
                    :value="setting.valor"
                    @change="store.setLocal(setting.clave, $event.target.value)"
                  />

                  <!-- Texto -->
                  <input
                    v-else
                    type="text"
                    class="cfg-text-input"
                    :value="setting.valor"
                    @input="store.setLocal(setting.clave, $event.target.value)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="cfg-footer">
            <span v-if="store.dirty" class="cfg-footer__aviso">
              <i class="pi pi-exclamation-circle" /> Cambios sin guardar
            </span>
            <span v-else class="cfg-footer__ok">
              <i class="pi pi-check-circle" /> Todo guardado
            </span>
            <div class="cfg-footer__btns">
              <button class="cfg-btn cfg-btn--secondary" @click="cerrar">Cerrar</button>
              <button
                class="cfg-btn cfg-btn--primary"
                :disabled="saving || !store.dirty"
                @click="guardar"
              >
                <i v-if="saving" class="pi pi-spin pi-spinner" />
                <i v-else class="pi pi-save" />
                Guardar
              </button>
            </div>
          </div>

        </aside>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const props = defineProps({ open: Boolean });
const emit  = defineEmits(['close']);

const store  = useSettingsStore();
const saving = ref(false);
const abiertos = ref(new Set(['apariencia']));

const DEFAULTS = {
    color_primario: '#118652',
    color_sidebar:  '#0E2F2A',
    color_acento:   '#C9A227',
};

const ICONOS = {
    apariencia:    'pi-palette',
    cementerio:    'pi-building',
    alertas:       'pi-bell',
    pdf:           'pi-file-pdf',
    sistema:       'pi-cog',
    base_de_datos: 'pi-database',
    api:           'pi-bolt',
};

const ETIQUETAS = {
    apariencia:    'Apariencia',
    cementerio:    'Cementerio',
    alertas:       'Alertas',
    pdf:           'PDF e Informes',
    sistema:       'Sistema',
    base_de_datos: 'Base de datos',
    api:           'API y límites',
};

function iconoGrupo(g) { return ICONOS[g] ?? 'pi-folder'; }
function etiquetaGrupo(g) { return ETIQUETAS[g] ?? g; }

// ── Sistema live ──────────────────────────────────────────────────────────────
const sysInfo    = ref(null);
const sysLoading = ref(false);
const sysAction  = ref(null);
const sysMsg     = ref(null);
let sysMsgTimer  = null;

function showSysMsg(ok, text) {
    sysMsg.value = { ok, text };
    clearTimeout(sysMsgTimer);
    sysMsgTimer = setTimeout(() => { sysMsg.value = null; }, 4000);
}

async function loadSistema() {
    sysLoading.value = true;
    try {
        const { data } = await import('@/services/api').then(m => m.default.get('/api/cementerio/sistema'));
        sysInfo.value = data;
    } catch { sysInfo.value = null; }
    finally { sysLoading.value = false; }
}

async function limpiarCache() {
    sysAction.value = 'cache';
    try {
        await import('@/services/api').then(m => m.default.post('/api/cementerio/sistema/cache-clear'));
        showSysMsg(true, 'Caché limpiada correctamente.');
    } catch (e) {
        showSysMsg(false, e?.response?.data?.message ?? 'Error al limpiar la caché.');
    } finally { sysAction.value = null; }
}

async function optimizarBD() {
    sysAction.value = 'optimize';
    try {
        await import('@/services/api').then(m => m.default.post('/api/cementerio/sistema/optimize-db'));
        showSysMsg(true, 'Tablas optimizadas correctamente.');
    } catch (e) {
        showSysMsg(false, e?.response?.data?.message ?? 'Error al optimizar.');
    } finally { sysAction.value = null; }
}

function descargarBackup() {
    sysAction.value = 'backup';
    const token = localStorage.getItem('conecta2_token') || localStorage.getItem('cementerio_token');
    const a = document.createElement('a');
    a.href = '/api/cementerio/backup/download';
    // Usar fetch para pasar el token en cabecera
    fetch(a.href, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.blob())
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `cementerio_backup_${new Date().toISOString().slice(0,10)}.sql`;
            link.click();
            URL.revokeObjectURL(url);
            showSysMsg(true, 'Backup descargado correctamente.');
        })
        .catch(() => showSysMsg(false, 'Error al generar el backup.'))
        .finally(() => { sysAction.value = null; });
}

function formatBytes(b) {
    if (!b) return '—';
    if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
    if (b >= 1048576)    return (b / 1048576).toFixed(0) + ' MB';
    return (b / 1024).toFixed(0) + ' KB';
}

function toggleGrupo(g) {
    if (abiertos.value.has(g)) abiertos.value.delete(g);
    else abiertos.value.add(g);
}

function resetColor(setting) {
    store.setLocal(setting.clave, DEFAULTS[setting.clave] ?? setting.valor);
}

function cerrar() {
    emit('close');
}

async function guardar() {
    saving.value = true;
    try {
        await store.save();
    } finally {
        saving.value = false;
    }
}

watch(() => props.open, (val) => {
    if (val && Object.keys(store.grupos).length === 0) store.fetch();
});

// Cargar info sistema cuando se abre esa sección
watch(() => abiertos.value.has('__sistema'), (open) => {
    if (open && !sysInfo.value && !sysLoading.value) loadSistema();
}, { deep: true });
</script>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────── */
.cfg-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

/* ── Panel ───────────────────────────────────────────────── */
.cfg-panel {
  width: 380px;
  max-width: 95vw;
  height: 100dvh;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* ── Cabecera ────────────────────────────────────────────── */
.cfg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #e8eceb;
  flex-shrink: 0;
  background: var(--c2-sidebar-bg, #0E2F2A);
  color: #fff;
}
.cfg-header__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.02em;
}
.cfg-header__title .pi { font-size: 15px; opacity: 0.8; }
.cfg-header__actions { display: flex; gap: 4px; }

/* ── Body ────────────────────────────────────────────────── */
.cfg-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

/* ── Grupo ───────────────────────────────────────────────── */
.cfg-grupo { border-bottom: 1px solid #f0f2f1; }

.cfg-grupo__cabecera {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 12.5px;
  font-weight: 700;
  color: #374240;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  transition: background 100ms;
}
.cfg-grupo__cabecera:hover { background: #f5f7f4; }
.cfg-grupo__cabecera .pi:first-child {
  font-size: 13px;
  color: var(--c2-primary, #118652);
  opacity: 0.85;
}
.cfg-grupo__chevron { font-size: 11px; margin-left: auto; opacity: 0.45; }

.cfg-grupo__body {
  padding: 4px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Field ───────────────────────────────────────────────── */
.cfg-field { display: flex; flex-direction: column; gap: 4px; }

.cfg-field__label {
  font-size: 12.5px;
  font-weight: 600;
  color: #2c3e39;
}
.cfg-field__desc {
  font-size: 11px;
  color: #6b7a77;
  margin: 0;
  line-height: 1.4;
}

/* ── Inputs ──────────────────────────────────────────────── */
.cfg-text-input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #d4dbd9;
  border-radius: 7px;
  font-size: 13px;
  color: #17231f;
  background: #fafbfa;
  outline: none;
  transition: border-color 120ms, box-shadow 120ms;
  box-sizing: border-box;
}
.cfg-text-input:focus {
  border-color: var(--c2-primary, #118652);
  box-shadow: 0 0 0 3px rgba(17, 134, 82, 0.12);
  background: #fff;
}
.cfg-text-input--sm { flex: 1; min-width: 0; }

.cfg-select {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #d4dbd9;
  border-radius: 7px;
  font-size: 13px;
  color: #17231f;
  background: #fafbfa;
  outline: none;
  cursor: pointer;
  box-sizing: border-box;
}
.cfg-select:focus {
  border-color: var(--c2-primary, #118652);
  box-shadow: 0 0 0 3px rgba(17, 134, 82, 0.12);
}

/* ── Color picker ────────────────────────────────────────── */
.cfg-color-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cfg-color-input {
  width: 36px;
  height: 32px;
  padding: 2px;
  border: 1px solid #d4dbd9;
  border-radius: 7px;
  cursor: pointer;
  background: #fafbfa;
  flex-shrink: 0;
}

/* ── Toggle ──────────────────────────────────────────────── */
.cfg-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.cfg-toggle__input { display: none; }
.cfg-toggle__track {
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: #cdd5d3;
  position: relative;
  transition: background 150ms;
  flex-shrink: 0;
}
.cfg-toggle__input:checked + .cfg-toggle__track {
  background: var(--c2-primary, #118652);
}
.cfg-toggle__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: left 150ms;
}
.cfg-toggle__input:checked ~ .cfg-toggle__track .cfg-toggle__thumb { left: 19px; }
.cfg-toggle__text { font-size: 12.5px; color: #4a5e59; }

/* ── Footer ──────────────────────────────────────────────── */
.cfg-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #e8eceb;
  flex-shrink: 0;
  background: #f9fbfa;
  gap: 8px;
}
.cfg-footer__aviso {
  font-size: 11.5px;
  color: #b45309;
  display: flex;
  align-items: center;
  gap: 4px;
}
.cfg-footer__ok {
  font-size: 11.5px;
  color: #166534;
  display: flex;
  align-items: center;
  gap: 4px;
}
.cfg-footer__btns { display: flex; gap: 6px; flex-shrink: 0; }

/* ── Buttons ─────────────────────────────────────────────── */
.cfg-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 600;
  transition: background 120ms, opacity 120ms;
}
.cfg-btn--primary {
  background: var(--c2-primary, #118652);
  color: #fff;
}
.cfg-btn--primary:hover:not(:disabled) { filter: brightness(1.08); }
.cfg-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
.cfg-btn--secondary {
  background: #eef1f0;
  color: #374240;
}
.cfg-btn--secondary:hover { background: #e3e9e7; }
.cfg-btn--ghost {
  background: transparent;
  color: rgba(255,255,255,0.65);
  padding: 6px 8px;
}
.cfg-btn--ghost:hover { background: rgba(255,255,255,0.12); color: #fff; }
.cfg-btn--close {
  background: transparent;
  color: rgba(255,255,255,0.70);
  padding: 6px 8px;
  border-radius: 6px;
}
.cfg-btn--close:hover { background: rgba(255,255,255,0.12); color: #fff; }
.cfg-btn--xs { padding: 4px 7px; font-size: 11px; }

/* ── Transición del panel ────────────────────────────────── */
.panel-enter-active,
.panel-leave-active { transition: opacity 180ms ease; }
.panel-enter-active .cfg-panel,
.panel-leave-active .cfg-panel { transition: transform 200ms ease; }
.panel-enter-from,
.panel-leave-to { opacity: 0; }
.panel-enter-from .cfg-panel { transform: translateX(100%); }
.panel-leave-to  .cfg-panel  { transform: translateX(100%); }

/* ── Sección Sistema ─────────────────────────────────────────── */
.sys-loading {
  font-size: 12px; color: #6b7a77;
  display: flex; align-items: center; gap: 6px; padding: 6px 0;
}

.sys-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 10px;
}
.sys-grid--3 { grid-template-columns: 1fr 1fr 1fr; }

.sys-item {
  background: #f5f7f4;
  border-radius: 6px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sys-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(23,35,31,0.45);
}
.sys-val {
  font-size: 12px;
  font-weight: 600;
  color: #1c2d29;
  word-break: break-all;
}
.sys-val--num  { font-variant-numeric: tabular-nums; }
.sys-val--warn { color: #b45309; }

.sys-section-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(23,35,31,0.40);
  margin: 10px 0 6px;
}

.sys-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}
.sys-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #d4dbd9;
  background: #fafbfa;
  font-size: 12.5px;
  font-weight: 600;
  color: #374240;
  cursor: pointer;
  transition: background 100ms, border-color 100ms;
}
.sys-btn:hover:not(:disabled) { background: #eef1f0; border-color: #b0bbb8; }
.sys-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.sys-btn--primary {
  background: var(--c2-primary, #118652);
  color: #fff;
  border-color: transparent;
}
.sys-btn--primary:hover:not(:disabled) { filter: brightness(1.08); }

.sys-msg {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.sys-msg--ok  { background: #dcfce7; color: #166534; }
.sys-msg--err { background: #fee2e2; color: #b91c1c; }
</style>
