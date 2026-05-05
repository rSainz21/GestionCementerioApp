<template>
  <div class="layout">
    <!-- Overlay sólo en móvil -->
    <div v-if="sidebarOpen" class="overlay" @click="sidebarOpen = false" />

    <aside class="sidebar" :class="{ 'sidebar--open': sidebarOpen }" aria-label="Navegación Cementerio">
      <div class="brand">
        <i class="pi pi-building brand__icon" />
        <div>
          <div class="brand__title">Cementerio</div>
          <div class="brand__subtitle">Somahoz</div>
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

        <div class="nav__divider" />
        <div class="nav__section">SOPORTE</div>
        <router-link class="nav__item" to="/cementerio/ayuda" active-class="nav__item--active">
          <i class="pi pi-book" />
          <span>Ayuda</span>
        </router-link>
      </nav>

      <div class="sidebar__footer">
        <div class="user" v-if="auth.user">
          <i class="pi pi-user user__icon" />
          <div class="user__info">
            <div class="user__name">{{ auth.user.name }}</div>
            <div class="user__meta">{{ auth.user.username || auth.user.email }}</div>
          </div>
        </div>
        <button class="logout-btn" type="button" @click="logout">
          <i class="pi pi-sign-out" />
          <span>Salir</span>
        </button>
      </div>
    </aside>

    <div class="main-wrap">
      <header class="topbar">
        <button class="hamburger" type="button" aria-label="Abrir menú" @click="sidebarOpen = !sidebarOpen">
          <i class="pi pi-bars" />
        </button>
        <div class="topbar__title">{{ title }}</div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const auth = useAuthStore();
const sidebarOpen = ref(false);

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
.nav__divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 8px 0;
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

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
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
