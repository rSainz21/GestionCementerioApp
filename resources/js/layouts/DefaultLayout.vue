<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand__title">Conect@ 2.0</div>
        <div class="brand__subtitle">Cementerio</div>
      </div>

      <nav class="nav">
        <router-link class="nav__item" to="/cementerio" exact-active-class="nav__item--active">
          <i class="pi pi-chart-bar" /> <span>Dashboard</span>
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
        <div class="topbar__title">{{ title }}</div>
      </div>
      <div class="content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const auth = useAuthStore();

const title = computed(() => route.meta?.title || 'Cementerio');

async function logout() {
  await auth.logout();
  location.href = '/login';
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px 1fr;
  background: var(--c2-bg, #F5F7F4);
}

.sidebar {
  background: var(--c2-sidebar-bg, #0E2F2A);
  color: rgba(255, 255, 255, 0.88);
  padding: 14px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 14px;
}

.brand {
  border-radius: 14px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
}
.brand__title { font-weight: 900; letter-spacing: 0.2px; }
.brand__subtitle { margin-top: 4px; font-size: 12px; opacity: 0.85; }

.nav { display: grid; gap: 6px; }
.nav__item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.88);
  border: 1px solid transparent;
}
.nav__item:hover { background: rgba(255, 255, 255, 0.06); }
.nav__item--active {
  background: rgba(17, 134, 82, 0.22);
  border-color: rgba(17, 134, 82, 0.35);
}

.sidebar__footer {
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
  padding: 0 18px;
  background: white;
  border-bottom: 1px solid rgba(23, 35, 31, 0.10);
}
.topbar__title { font-weight: 900; color: var(--c2-text, #17231F); }

.content { padding: 18px; }

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
  .layout { grid-template-columns: 1fr; }
  .sidebar { grid-template-rows: auto auto auto; }
}
</style>

