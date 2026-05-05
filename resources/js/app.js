import { createApp, h } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory, RouterView } from 'vue-router';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';

import NuevoCasoWizard from '@/pages/cementerio/NuevoCasoWizard.vue';
import DashboardPage from '@/pages/cementerio/DashboardPage.vue';
import LoginPage from '@/pages/LoginPage.vue';
import { useAuthStore } from '@/stores/auth';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import GestionPage from '@/pages/cementerio/GestionPage.vue';
import AyudaPage from '@/pages/cementerio/AyudaPage.vue';
import 'primeicons/primeicons.css';
import './styles/app.css';

const routes = [
  { path: '/', redirect: '/cementerio' },
  { path: '/login', component: LoginPage, meta: { public: true } },
  {
    path: '/cementerio',
    component: DefaultLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', component: DashboardPage, meta: { title: 'Cementerio · Inicio' } },
{ path: 'gestion', component: GestionPage, meta: { title: 'Cementerio · Gestión' } },
      { path: 'nuevo', component: NuevoCasoWizard, meta: { title: 'Cementerio · Nuevo caso' } },
      { path: 'ayuda', component: AyudaPage, meta: { title: 'Cementerio · Ayuda' } },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  if (to.meta?.public) return true;

  const auth = useAuthStore();
  const requiresAuth = !!to.meta?.requiresAuth;

  if (!requiresAuth) return true;

  if (!auth.token) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  if (!auth.user && !auth.loadingMe) {
    try {
      await auth.me();
    } catch {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
  }

  return true;
});

const app = createApp({
  render: () => h(RouterView),
});

app.use(createPinia());
app.use(router);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
});

app.mount('#app');

