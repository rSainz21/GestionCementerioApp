<template>
  <div class="usu-page">
    <div class="usu-header">
      <div>
        <h1 class="usu-title"><i class="pi pi-users" /> Gestión de usuarios</h1>
        <p class="usu-subtitle">Administra los usuarios con acceso a la aplicación y sus roles.</p>
      </div>
      <button class="btn btn--primary" @click="abrirNuevo">
        <i class="pi pi-plus" /> Nuevo usuario
      </button>
    </div>

    <!-- Tabla -->
    <div class="usu-card">
      <div class="usu-card__toolbar">
        <input v-model="q" class="usu-search" placeholder="Buscar por nombre, email…" @input="filtrar" />
        <span class="usu-count">{{ filtrados.length }} usuario{{ filtrados.length !== 1 ? 's' : '' }}</span>
      </div>

      <div v-if="loading" class="usu-loading"><i class="pi pi-spin pi-spinner" /> Cargando…</div>

      <table v-else class="usu-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario / Email</th>
            <th>Roles</th>
            <th>Permisos extra</th>
            <th>Alta</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filtrados" :key="u.id">
            <td class="td-name">
              <span class="user-avatar">{{ u.name[0]?.toUpperCase() }}</span>
              {{ u.name }}
            </td>
            <td>
              <div>{{ u.username || '—' }}</div>
              <div class="td-meta">{{ u.email }}</div>
            </td>
            <td>
              <span v-for="r in u.roles" :key="r" class="badge badge--role">{{ r }}</span>
              <span v-if="!u.roles.length" class="td-empty">Sin rol</span>
            </td>
            <td>
              <span v-for="p in u.permissions" :key="p" class="badge badge--perm">{{ p }}</span>
              <span v-if="!u.permissions.length" class="td-empty">—</span>
            </td>
            <td class="td-date">{{ u.created_at }}</td>
            <td class="td-actions">
              <button class="icon-btn" title="Editar" @click="abrirEditar(u)"><i class="pi pi-pencil" /></button>
              <button class="icon-btn icon-btn--roles" title="Roles y permisos" @click="abrirRoles(u)">
                <i class="pi pi-shield" />
              </button>
              <button class="icon-btn icon-btn--danger" title="Eliminar" @click="confirmarBorrar(u)"
                :disabled="u.id === authUser?.id">
                <i class="pi pi-trash" />
              </button>
            </td>
          </tr>
          <tr v-if="filtrados.length === 0 && !loading">
            <td colspan="6" class="td-empty-row">No hay usuarios que coincidan.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal crear / editar usuario -->
    <Teleport to="body">
      <div v-if="modal.open" class="m-overlay" @click.self="modal.open = false">
        <div class="m-panel">
          <div class="m-header">
            <span><i class="pi pi-user" /> {{ modal.id ? 'Editar usuario' : 'Nuevo usuario' }}</span>
            <button class="m-close" @click="modal.open = false"><i class="pi pi-times" /></button>
          </div>
          <form @submit.prevent="guardarUsuario" class="m-body">
            <div class="f-group">
              <label>Nombre completo <span class="req">*</span></label>
              <input v-model="modal.name" class="f-input" required placeholder="p. ej. Ana García" />
            </div>
            <div class="f-row">
              <div class="f-group">
                <label>Usuario (login)</label>
                <input v-model="modal.username" class="f-input" placeholder="ana.garcia" />
              </div>
              <div class="f-group">
                <label>Email <span class="req">*</span></label>
                <input v-model="modal.email" class="f-input" type="email" required placeholder="ana@ayto.es" />
              </div>
            </div>
            <div class="f-group">
              <label>{{ modal.id ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña' }} <span v-if="!modal.id" class="req">*</span></label>
              <input v-model="modal.password" class="f-input" type="password"
                :required="!modal.id" placeholder="mínimo 8 caracteres" />
            </div>
            <div v-if="errMsg" class="m-err"><i class="pi pi-times-circle" /> {{ errMsg }}</div>
            <div class="m-footer">
              <button type="button" class="btn btn--secondary" @click="modal.open = false">Cancelar</button>
              <button type="submit" class="btn btn--primary" :disabled="saving">
                <i v-if="saving" class="pi pi-spin pi-spinner" />
                {{ modal.id ? 'Guardar cambios' : 'Crear usuario' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal roles y permisos -->
    <Teleport to="body">
      <div v-if="rolesModal.open" class="m-overlay" @click.self="rolesModal.open = false">
        <div class="m-panel m-panel--lg">
          <div class="m-header">
            <span><i class="pi pi-shield" /> Roles y permisos — {{ rolesModal.nombre }}</span>
            <button class="m-close" @click="rolesModal.open = false"><i class="pi pi-times" /></button>
          </div>
          <div class="m-body">
            <div class="roles-section">
              <h3 class="roles-title">Roles</h3>
              <p class="roles-desc">Los roles agrupan conjuntos de permisos. Asigna al usuario los roles que correspondan.</p>
              <div class="roles-grid">
                <label v-for="r in allRoles" :key="r" class="roles-check">
                  <input type="checkbox" :value="r" v-model="rolesModal.roles" />
                  <span class="badge badge--role">{{ r }}</span>
                </label>
              </div>
            </div>
            <div class="roles-section">
              <h3 class="roles-title">Permisos directos</h3>
              <p class="roles-desc">Permisos asignados directamente (además de los heredados del rol).</p>
              <div class="roles-grid">
                <label v-for="p in allPermissions" :key="p" class="roles-check">
                  <input type="checkbox" :value="p" v-model="rolesModal.permissions" />
                  <span class="badge badge--perm">{{ p }}</span>
                </label>
              </div>
            </div>
            <div v-if="rolesErrMsg" class="m-err"><i class="pi pi-times-circle" /> {{ rolesErrMsg }}</div>
          </div>
          <div class="m-footer m-footer--border">
            <button type="button" class="btn btn--secondary" @click="rolesModal.open = false">Cancelar</button>
            <button class="btn btn--primary" :disabled="saving" @click="guardarRoles">
              <i v-if="saving" class="pi pi-spin pi-spinner" />
              Guardar roles y permisos
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm borrar -->
    <Teleport to="body">
      <div v-if="confirmBorrar" class="m-overlay" @click.self="confirmBorrar = null">
        <div class="m-panel m-panel--sm">
          <div class="m-header m-header--danger">
            <span><i class="pi pi-exclamation-triangle" /> Eliminar usuario</span>
            <button class="m-close" @click="confirmBorrar = null"><i class="pi pi-times" /></button>
          </div>
          <div class="m-body">
            <p>¿Eliminar al usuario <strong>{{ confirmBorrar.name }}</strong>? Esta acción no se puede deshacer.</p>
          </div>
          <div class="m-footer m-footer--border">
            <button class="btn btn--secondary" @click="confirmBorrar = null">Cancelar</button>
            <button class="btn btn--danger" :disabled="saving" @click="borrarUsuario">
              <i v-if="saving" class="pi pi-spin pi-spinner" />
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const authUser = computed(() => auth.user);

const usuarios     = ref([]);
const allRoles      = ref([]);
const allPermissions = ref([]);
const loading      = ref(false);
const saving       = ref(false);
const q            = ref('');
const errMsg       = ref('');
const rolesErrMsg  = ref('');
const confirmBorrar = ref(null);

const modal = ref({ open: false, id: null, name: '', username: '', email: '', password: '' });
const rolesModal = ref({ open: false, id: null, nombre: '', roles: [], permissions: [] });

const filtrados = computed(() => {
  if (!q.value.trim()) return usuarios.value;
  const lq = q.value.toLowerCase();
  return usuarios.value.filter(u =>
    u.name.toLowerCase().includes(lq) ||
    u.email.toLowerCase().includes(lq) ||
    (u.username || '').toLowerCase().includes(lq)
  );
});

function filtrar() {}

async function cargar() {
  loading.value = true;
  try {
    const { data } = await api.get('/api/admin/users');
    usuarios.value = data.users ?? [];
    allRoles.value = data.roles ?? [];
    allPermissions.value = data.permissions ?? [];
  } catch { /* silencioso */ }
  finally { loading.value = false; }
}

function abrirNuevo() {
  errMsg.value = '';
  modal.value = { open: true, id: null, name: '', username: '', email: '', password: '' };
}

function abrirEditar(u) {
  errMsg.value = '';
  modal.value = { open: true, id: u.id, name: u.name, username: u.username || '', email: u.email, password: '' };
}

function abrirRoles(u) {
  rolesErrMsg.value = '';
  rolesModal.value = {
    open: true,
    id: u.id,
    nombre: u.name,
    roles: [...(u.roles ?? [])],
    permissions: [...(u.permissions ?? [])],
  };
}

function confirmarBorrar(u) {
  confirmBorrar.value = u;
}

async function guardarUsuario() {
  errMsg.value = '';
  saving.value = true;
  try {
    const payload = {
      name: modal.value.name,
      username: modal.value.username || undefined,
      email: modal.value.email,
      password: modal.value.password || undefined,
    };
    if (modal.value.id) {
      const { data } = await api.put(`/api/admin/users/${modal.value.id}`, payload);
      const idx = usuarios.value.findIndex(u => u.id === modal.value.id);
      if (idx !== -1) usuarios.value[idx] = data.user;
    } else {
      const { data } = await api.post('/api/admin/users', payload);
      usuarios.value.unshift(data.user);
    }
    modal.value.open = false;
  } catch (e) {
    errMsg.value = e?.response?.data?.message
      ?? Object.values(e?.response?.data?.errors ?? {}).flat().join(' ')
      ?? 'Error al guardar.';
  } finally {
    saving.value = false;
  }
}

async function guardarRoles() {
  rolesErrMsg.value = '';
  saving.value = true;
  try {
    const id = rolesModal.value.id;
    const [r1, r2] = await Promise.all([
      api.put(`/api/admin/users/${id}/roles`, { roles: rolesModal.value.roles }),
      api.put(`/api/admin/users/${id}/permissions`, { permissions: rolesModal.value.permissions }),
    ]);
    const updated = r1.data.user;
    const idx = usuarios.value.findIndex(u => u.id === id);
    if (idx !== -1) usuarios.value[idx] = updated;
    rolesModal.value.open = false;
  } catch (e) {
    rolesErrMsg.value = e?.response?.data?.message ?? 'Error al guardar roles.';
  } finally {
    saving.value = false;
  }
}

async function borrarUsuario() {
  saving.value = true;
  try {
    await api.delete(`/api/admin/users/${confirmBorrar.value.id}`);
    usuarios.value = usuarios.value.filter(u => u.id !== confirmBorrar.value.id);
    confirmBorrar.value = null;
  } catch (e) {
    alert(e?.response?.data?.message ?? 'Error al eliminar el usuario.');
  } finally {
    saving.value = false;
  }
}

onMounted(cargar);
</script>

<style scoped>
.usu-page { display: flex; flex-direction: column; gap: 18px; }

.usu-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
}
.usu-title { font-size: 20px; font-weight: 800; color: var(--c2-text,#17231f); margin: 0 0 4px; display: flex; align-items: center; gap: 8px; }
.usu-title .pi { color: var(--c2-primary,#118652); font-size: 18px; }
.usu-subtitle { font-size: 13px; color: #6b7a77; margin: 0; }

.usu-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(23,35,31,.08);
  box-shadow: 0 1px 4px rgba(23,35,31,.06);
  overflow: hidden;
}
.usu-card__toolbar {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(23,35,31,.07);
}
.usu-search {
  flex: 1; max-width: 320px;
  padding: 7px 11px; border: 1px solid #d4dbd9; border-radius: 8px;
  font-size: 13px; outline: none;
}
.usu-search:focus { border-color: var(--c2-primary,#118652); box-shadow: 0 0 0 3px rgba(17,134,82,.1); }
.usu-count { font-size: 12px; color: #6b7a77; margin-left: auto; }
.usu-loading { padding: 32px; text-align: center; color: #6b7a77; font-size: 13px; }

.usu-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.usu-table th {
  text-align: left; padding: 8px 14px;
  background: #f5f7f4; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .05em; color: #4a5e59;
  border-bottom: 1px solid rgba(23,35,31,.08);
}
.usu-table td { padding: 10px 14px; border-bottom: 1px solid rgba(23,35,31,.06); vertical-align: middle; }
.usu-table tr:last-child td { border-bottom: none; }
.usu-table tr:hover td { background: #f9fbfa; }

.user-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--c2-primary,#118652); color: #fff;
  font-size: 12px; font-weight: 700; flex-shrink: 0; margin-right: 8px;
}
.td-name { display: flex; align-items: center; font-weight: 600; }
.td-meta { font-size: 11px; color: #6b7a77; margin-top: 1px; }
.td-date { font-size: 12px; color: #6b7a77; white-space: nowrap; }
.td-empty { font-size: 11px; color: #9aada8; }
.td-empty-row { text-align: center; color: #9aada8; padding: 28px 14px; font-size: 13px; }
.td-actions { display: flex; gap: 4px; }

.badge {
  display: inline-block; padding: 2px 8px; border-radius: 999px;
  font-size: 11px; font-weight: 700; margin: 1px 2px; white-space: nowrap;
}
.badge--role { background: #dcfce7; color: #166534; }
.badge--perm { background: #e0f2fe; color: #0369a1; }

.icon-btn {
  display: grid; place-items: center;
  width: 30px; height: 30px; border-radius: 7px;
  border: 1px solid #e2e8e6; background: #fafbfa;
  cursor: pointer; font-size: 13px; color: #374240;
  transition: background 100ms;
}
.icon-btn:hover { background: #eef1f0; }
.icon-btn--roles { color: var(--c2-primary,#118652); }
.icon-btn--danger:hover { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Botones ─────────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 8px; border: none;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background 120ms, opacity 120ms;
}
.btn--primary { background: var(--c2-primary,#118652); color: #fff; }
.btn--primary:hover:not(:disabled) { filter: brightness(1.08); }
.btn--secondary { background: #eef1f0; color: #374240; }
.btn--secondary:hover { background: #e3e9e7; }
.btn--danger { background: #dc2626; color: #fff; }
.btn--danger:hover:not(:disabled) { background: #b91c1c; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Modales ─────────────────────────────────────────────── */
.m-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.38); z-index: 300;
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.m-panel {
  background: #fff; border-radius: 14px; width: 100%; max-width: 480px;
  box-shadow: 0 8px 40px rgba(0,0,0,.18); display: flex; flex-direction: column;
  max-height: 90vh; overflow: hidden;
}
.m-panel--lg { max-width: 580px; }
.m-panel--sm { max-width: 380px; }
.m-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid #e8eceb;
  font-size: 14px; font-weight: 700; color: var(--c2-text,#17231f);
  flex-shrink: 0;
}
.m-header--danger { background: #fef2f2; color: #991b1b; }
.m-close {
  background: none; border: none; cursor: pointer; color: #9aada8;
  font-size: 14px; padding: 4px; border-radius: 6px;
}
.m-close:hover { background: #f5f7f4; color: #374240; }
.m-body { padding: 18px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.m-footer {
  display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px; flex-shrink: 0;
}
.m-footer--border { border-top: 1px solid #e8eceb; }
.m-err {
  padding: 9px 12px; background: #fee2e2; border-radius: 8px;
  font-size: 12.5px; color: #b91c1c; display: flex; align-items: center; gap: 6px;
}

/* ── Form ────────────────────────────────────────────────── */
.f-group { display: flex; flex-direction: column; gap: 5px; }
.f-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.f-group label { font-size: 12.5px; font-weight: 600; color: #2c3e39; }
.req { color: #dc2626; }
.f-input {
  padding: 8px 11px; border: 1px solid #d4dbd9; border-radius: 8px;
  font-size: 13px; outline: none;
}
.f-input:focus { border-color: var(--c2-primary,#118652); box-shadow: 0 0 0 3px rgba(17,134,82,.1); }

/* ── Roles ───────────────────────────────────────────────── */
.roles-section { display: flex; flex-direction: column; gap: 10px; }
.roles-title { font-size: 13px; font-weight: 700; color: #2c3e39; margin: 0; }
.roles-desc { font-size: 12px; color: #6b7a77; margin: 0; }
.roles-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.roles-check {
  display: flex; align-items: center; gap: 7px; cursor: pointer;
  padding: 6px 10px; border: 1px solid #e2e8e6; border-radius: 8px;
  background: #fafbfa; transition: border-color 100ms, background 100ms;
}
.roles-check:hover { background: #f0f5f3; border-color: var(--c2-primary,#118652); }
.roles-check input[type=checkbox] { accent-color: var(--c2-primary,#118652); }
</style>
