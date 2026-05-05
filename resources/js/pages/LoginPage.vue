<template>
  <div class="page">
    <div class="card">
      <div class="card__header">
        <h2 class="title">Acceso</h2>
        <div class="subtitle">Inicia sesión para acceder al módulo de Cementerio.</div>
      </div>

      <form class="card__body" @submit.prevent="doLogin">
        <div class="field">
          <label class="label" for="login-user">Usuario o email</label>
          <input id="login-user" v-model="username" class="input" autocomplete="username" />
        </div>
        <div class="field">
          <label class="label" for="login-pass">Contraseña</label>
          <input id="login-pass" v-model="password" class="input" type="password" autocomplete="current-password" />
        </div>

        <button class="btn btn--primary" type="submit" :disabled="loading">
          {{ loading ? 'Entrando…' : 'Entrar' }}
        </button>

        <div v-if="error" class="error">{{ error }}</div>
        <div class="help muted">
          Credenciales de dev: <strong>admin</strong> / <strong>admin2026</strong>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { toApiErrorMessage } from '@/utils/apiErrors';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const username = ref('admin');
const password = ref('admin2026');
const loading = ref(false);
const error = ref(null);

async function doLogin() {
  loading.value = true;
  error.value = null;
  try {
    await auth.login({ username: username.value, password: password.value });
    const redirect = route.query.redirect ? String(route.query.redirect) : '/cementerio';
    await router.replace(redirect);
  } catch (e) {
    error.value = toApiErrorMessage(e, 'No se pudo iniciar sesión.');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 18px;
  background: var(--c2-bg, #F5F7F4);
}

.card {
  width: min(520px, 100%);
  background: white;
  border-radius: 14px;
  border: 1px solid rgba(23, 35, 31, 0.10);
  box-shadow: 0 6px 18px rgba(23, 35, 31, 0.06);
}

.card__header {
  padding: 16px;
  border-bottom: 1px solid rgba(23, 35, 31, 0.08);
}

.title {
  margin: 0;
  font-size: 20px;
}

.subtitle {
  margin-top: 4px;
  color: rgba(23, 35, 31, 0.65);
  font-size: 13px;
}

.card__body {
  padding: 16px;
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(23, 35, 31, 0.75);
}

.input {
  border-radius: 10px;
  border: 1px solid rgba(23, 35, 31, 0.18);
  padding: 10px 10px;
  outline: none;
}

.input:focus {
  border-color: var(--c2-primary, #118652);
  box-shadow: 0 0 0 4px rgba(17, 134, 82, 0.12);
}

.btn {
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(23, 35, 31, 0.14);
  background: white;
  cursor: pointer;
  font-weight: 800;
}
.btn--primary {
  background: var(--c2-primary, #118652);
  color: white;
  border-color: rgba(17, 134, 82, 0.55);
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.muted { color: rgba(23, 35, 31, 0.60); }
.help { font-size: 12px; }
.error { color: var(--c2-danger, #A61B1B); font-size: 13px; }
</style>

