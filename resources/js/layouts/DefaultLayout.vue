<template>
  <div class="layout">
    <!-- Overlay sólo en móvil -->
    <div v-if="sidebarOpen" class="overlay" @click="sidebarOpen = false" />

    <aside class="sidebar" :class="{ 'sidebar--open': sidebarOpen }" aria-label="Navegación Cementerio">
      <div class="brand">
        <i class="pi pi-building brand__icon" />
        <div>
          <div class="brand__title">{{ settings.get('nombre', 'Cementerio') }}</div>
          <div class="brand__subtitle">{{ settings.get('subtitulo', 'Somahoz') }}</div>
        </div>
      </div>

      <nav class="nav">
        <div class="nav__section">MÓDULO</div>
        <router-link class="nav__item" to="/cementerio" exact-active-class="nav__item--active">
          <i class="pi pi-home" />
          <span>Inicio</span>
        </router-link>
<router-link class="nav__item" to="/cementerio/gestion" active-class="nav__item--active">
          <i class="pi pi-database" />
          <span>Gestión</span>
        </router-link>
        <router-link class="nav__item" to="/cementerio/nuevo" active-class="nav__item--active">
          <i class="pi pi-plus-circle" />
          <span>Nuevo caso</span>
        </router-link>

        <div v-if="auth.hasPermission('cementerio.admin')" class="nav__section" style="margin-top:8px">ADMINISTRACIÓN</div>
        <router-link v-if="auth.hasPermission('cementerio.admin')" class="nav__item" to="/cementerio/usuarios" active-class="nav__item--active">
          <i class="pi pi-users" />
          <span>Usuarios</span>
        </router-link>

        <div class="nav__section" style="margin-top:8px">SOPORTE</div>
        <router-link class="nav__item" to="/cementerio/regularizacion" active-class="nav__item--active">
          <i class="pi pi-link" />
          <span>Regularización</span>
          <span v-if="pendientesReg > 0" class="nav__badge nav__badge--warn">{{ pendientesReg }}</span>
        </router-link>
        <router-link class="nav__item" to="/cementerio/papelera" active-class="nav__item--active">
          <i class="pi pi-trash" />
          <span>Papelera</span>
        </router-link>
        <router-link class="nav__item" to="/cementerio/ayuda" active-class="nav__item--active">
          <i class="pi pi-book" />
          <span>Ayuda</span>
        </router-link>
      </nav>

      <SidebarAlertas />

      <div class="sidebar__footer">
        <div class="user" v-if="auth.user">
          <i class="pi pi-user user__icon" />
          <div class="user__info">
            <div class="user__name">{{ auth.user.name }}</div>
            <div class="user__meta">{{ auth.user.username || auth.user.email }}</div>
          </div>
        </div>
        <div class="footer-actions">
          <button class="footer-icon-btn" type="button" @click="configOpen = true" title="Configuración">
            <i class="pi pi-cog" />
          </button>
          <button class="logout-btn" type="button" @click="logout">
            <i class="pi pi-sign-out" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      <PanelConfiguracion :open="configOpen" @close="configOpen = false" />
    </aside>

    <div class="main-wrap">
      <header class="topbar">
        <button class="hamburger" type="button" aria-label="Abrir menú" @click="sidebarOpen = !sidebarOpen">
          <i class="pi pi-bars" />
        </button>
        <div class="topbar__title">{{ title }}</div>

        <!-- Selector de cementerio -->
        <div class="topbar__cem-selector" v-if="cementerio.lista.length > 1">
          <i class="pi pi-building topbar__cem-icon" />
          <select
            class="topbar__cem-select"
            :value="cementerio.activoId"
            @change="cementerio.seleccionar(Number($event.target.value))"
          >
            <option v-for="c in cementerio.lista" :key="c.id" :value="c.id">
              {{ c.nombre }}
            </option>
          </select>
        </div>
        <div class="topbar__cem-single" v-else-if="cementerio.activo">
          <i class="pi pi-building" />
          <span>{{ cementerio.activo.nombre }}</span>
        </div>

        <div class="topbar__right">
          <BuscadorGlobal ref="buscadorRef" />
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAlertasStore } from '@/stores/alertas';
import { useSettingsStore } from '@/stores/settings';
import { useCementerioStore } from '@/stores/cementerio';
import SidebarAlertas from '@/components/cementerio/SidebarAlertas.vue';
import PanelConfiguracion from '@/components/cementerio/PanelConfiguracion.vue';
import BuscadorGlobal from '@/components/cementerio/BuscadorGlobal.vue';

const route = useRoute();
const auth = useAuthStore();
const alertas = useAlertasStore();
const settings = useSettingsStore();
const cementerio = useCementerioStore();
const sidebarOpen  = ref(false);
const configOpen   = ref(false);
const buscadorRef  = ref(null);

const pendientesReg = computed(() => {
  const sinUbicar = alertas.grupos.find?.(g => g?.clave === 'sin_ubicar')?.total ?? 0;
  const sinAsig   = alertas.grupos.find?.(g => g?.clave === 'concesiones_sin_asignar')?.total ?? 0;
  return sinUbicar + sinAsig;
});

function onKeydown(e) {
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    buscadorRef.value?.focus();
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));

onMounted(() => {
  settings.fetch();
  alertas.fetch();
  cementerio.cargar();
});

const title = computed(() => route.meta?.title || 'Cementerio');

async function logout() {
  await auth.logout();
  location.href = '/login';
}

watch(() => route.fullPath, () => {
  sidebarOpen.value = false;
});
</script>

<style scoped>
/* ── Layout base ─────────────────────────────────── */
.layout {
  min-height: 100vh;
  display: flex;
  background: var(--c2-bg, #F5F7F4);
}

/* ── Overlay (solo móvil) ────────────────────────── */
.overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 40;
}

/* ── Sidebar ─────────────────────────────────────── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  min-height: 100vh;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  background: var(--c2-sidebar-bg, #0E2F2A);
  color: rgba(255, 255, 255, 0.90);
  display: flex;
  flex-direction: column;
  gap: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  z-index: 50;
}

/* ── Brand ───────────────────────────────────────── */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 14px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.brand__icon {
  font-size: 18px;
  opacity: 0.85;
  flex-shrink: 0;
}
.brand__title {
  font-weight: 800;
  font-size: 14px;
  line-height: 1.2;
}
.brand__subtitle {
  font-size: 11px;
  opacity: 0.60;
  margin-top: 1px;
}

/* ── Nav ─────────────────────────────────────────── */
.nav {
  flex: 1;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.nav__section {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  opacity: 0.45;
  padding: 8px 8px 4px;
  text-transform: uppercase;
}

.nav__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.82);
  font-size: 13px;
  font-weight: 500;
  transition: background 120ms ease, color 120ms ease;
}
.nav__item :deep(.pi) {
  font-size: 13px;
  opacity: 0.80;
  flex-shrink: 0;
}
.nav__item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.96);
}
.nav__item--active {
  background: rgba(255, 255, 255, 0.10);
  color: #fff;
  font-weight: 700;
}
.nav__item--active :deep(.pi) {
  opacity: 1;
}

.nav__badge {
  font-size: 10px; font-weight: 800;
  padding: 1px 5px; border-radius: 999px;
  line-height: 1.4; margin-left: auto;
}
.nav__badge--warn { background: #f97316; color: #fff; }

/* ── Footer ──────────────────────────────────────── */
.sidebar__footer {
  padding: 10px 10px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 2px;
}
.user__icon {
  font-size: 13px;
  opacity: 0.60;
}
.user__name {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
}
.user__meta {
  font-size: 11px;
  opacity: 0.55;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.footer-icon-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: rgba(255, 255, 255, 0.62);
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.footer-icon-btn:hover {
  background: rgba(255, 255, 255, 0.09);
  color: rgba(255, 255, 255, 0.92);
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  cursor: pointer;
  transition: background 120ms ease;
}
.logout-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.92);
}

/* ── Main wrap ───────────────────────────────────── */
.main-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ── Topbar ──────────────────────────────────────── */
.topbar {
  height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  background: white;
  border-bottom: 1px solid rgba(23, 35, 31, 0.09);
  flex-shrink: 0;
}
.topbar__title {
  font-weight: 800;
  font-size: 14px;
  color: var(--c2-text, #17231F);
  flex: 1;
}

/* ── Selector cementerio ─────────────────────────────────── */
.topbar__cem-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border-left: 1px solid rgba(23,35,31,0.09);
  border-right: 1px solid rgba(23,35,31,0.09);
  flex-shrink: 0;
}
.topbar__cem-icon {
  font-size: 13px;
  color: var(--c2-primary, #118652);
  flex-shrink: 0;
}
.topbar__cem-select {
  font-size: 13px;
  font-weight: 600;
  color: var(--c2-text, #17231F);
  background: transparent;
  border: none;
  outline: none;
  cursor: pointer;
  max-width: 240px;
  padding: 0 2px;
}
.topbar__cem-single {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border-left: 1px solid rgba(23,35,31,0.09);
  font-size: 13px;
  font-weight: 600;
  color: #374240;
  flex-shrink: 0;
}
.topbar__cem-single .pi { font-size: 13px; color: var(--c2-primary, #118652); }

.topbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}


.hamburger {
  display: none;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(23, 35, 31, 0.12);
  background: rgba(245, 247, 244, 0.9);
  cursor: pointer;
  place-items: center;
  flex-shrink: 0;
}

/* ── Content ─────────────────────────────────────── */
.content {
  flex: 1;
  padding: 18px 20px;
  overflow-y: auto;
}

/* ── Mobile ──────────────────────────────────────── */
@media (max-width: 1023px) {
  .overlay { display: block; }
  .hamburger { display: grid; }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    transform: translateX(-105%);
    transition: transform 160ms ease;
    z-index: 50;
  }
  .sidebar--open {
    transform: translateX(0);
  }
}
</style>
