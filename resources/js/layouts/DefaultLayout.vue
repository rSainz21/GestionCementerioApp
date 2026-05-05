<template>
  <div class="layout" :class="{ 'layout--sidebar-open': sidebarOpen }">
    <div v-if="sidebarOpen" class="overlay" @click="sidebarOpen = false" />

    <aside class="sidebar" :class="{ 'sidebar--open': sidebarOpen }" aria-label="Navegación Cementerio">
      <div class="brand">
        <div class="brand__title">Conect@ 2.0</div>
        <div class="brand__subtitle">Cementerio</div>
      </div>

      <nav class="nav">
        <router-link class="nav__item" to="/cementerio" exact-active-class="nav__item--active">
          <i class="pi pi-chart-bar" /> <span>Inicio</span>
        </router-link>
        <router-link class="nav__item" to="/cementerio/gestion" exact-active-class="nav__item--active">
          <i class="pi pi-sliders-h" /> <span>Gestión</span>
        </router-link>
        <router-link class="nav__item" to="/cementerio/nuevo" exact-active-class="nav__item--active">
          <i class="pi pi-plus-circle" /> <span>Nuevo caso</span>
        </router-link>
      </nav>

      <div class="sidebar__footer">
        <div class="user" v-if="auth.user">
          <div class="user__name">{{ auth.user.name }}</div>
          <div class="user__meta">{{ auth.user.username || auth.user.email }}</div>
        </div>
        <button class="btn btn--ghost" type="button" @click="logout">
          <i class="pi pi-sign-out" /> <span>Salir</span>
        </button>
      </div>
    </aside>

    <main class="main">
      <div class="topbar">
        <button class="iconbtn" type="button" aria-label="Abrir menú" @click="sidebarOpen = !sidebarOpen">
          <i class="pi pi-bars" />
        </button>
        <div class="topbar__title">{{ title }}</div>
      </div>
      <div class="content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const sidebarOpen = ref(false);

const title = computed(() => route.meta?.title || 'Cementerio');

async function logout() {
  await auth.logout();
  await router.push({ path: '/login' });
}

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false;
  }
);
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr;
  background: var(--c2-bg, #F5F7F4);
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(1px);
  z-index: 40;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 280px;
  transform: translateX(-102%);
  transition: transform 160ms ease;
  z-index: 50;
  background: var(--c2-sidebar-bg, #0E2F2A);
  color: rgba(255, 255, 255, 0.88);
  padding: 14px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 14px;
  box-shadow: 10px 0 26px rgba(0, 0, 0, 0.22);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar--open {
  transform: translateX(0);
}

.brand {
  position: relative;
  border-radius: 12px;
  padding: 10px 12px;
  background: transparent;
  border: 0;
}
.brand__title { font-weight: 900; letter-spacing: 0.2px; }
.brand__subtitle { margin-top: 4px; font-size: 12px; opacity: 0.72; }

.nav { position: relative; display: grid; gap: 2px; }
.nav__item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.90);
  border: 0;
  font-size: 13px;
  line-height: 1.1;
  opacity: 0.9;
}
.nav__item :deep(.pi) {
  font-size: 14px;
  opacity: 0.9;
}

.nav__item:hover {
  background: rgba(255, 255, 255, 0.06);
  opacity: 1;
}
.nav__item--active {
  background: rgba(255, 255, 255, 0.08);
  opacity: 1;
}

.sidebar__footer {
  position: relative;
  display: grid;
  gap: 10px;
}
.user__name { font-weight: 800; }
.user__meta { font-size: 12px; opacity: 0.8; }

.main {
  display: grid;
  grid-template-rows: auto 1fr;
}
.topbar {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid rgba(23, 35, 31, 0.10);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 10;
}
.topbar__title { font-weight: 900; color: var(--c2-text, #17231F); }

.content { padding: 18px; }
.content :deep(.page) { max-width: 1180px; margin: 0 auto; }

.iconbtn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(23, 35, 31, 0.12);
  background: rgba(245, 247, 244, 0.9);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.iconbtn:hover {
  background: rgba(245, 247, 244, 1);
  box-shadow: 0 6px 16px rgba(23, 35, 31, 0.08);
}

.btn {
  height: 38px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: transparent;
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.btn:hover { background: rgba(255, 255, 255, 0.06); }
.btn--ghost { border-color: rgba(255, 255, 255, 0.14); }

@media (max-width: 980px) {
  .sidebar { width: min(88vw, 320px); }
}

@media (min-width: 1024px) {
  .layout {
    grid-template-columns: 280px 1fr;
  }
  .overlay { display: none; }
  .sidebar {
    position: sticky;
    transform: none;
    top: 0;
    box-shadow: 0 0 0 rgba(0,0,0,0);
  }
  .main { min-height: 100vh; }
  .iconbtn { display: none; }
}
</style>

