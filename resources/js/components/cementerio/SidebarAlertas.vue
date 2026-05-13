<template>
  <div class="alertas" v-if="store.total > 0 || store.loading">

    <div class="alertas__header">
      <span class="alertas__label">ALERTAS</span>
      <button class="alertas__refresh" :class="{ 'alertas__refresh--spin': store.loading }"
              @click="store.fetch(true)" title="Actualizar alertas" type="button">
        <i class="pi pi-refresh" />
      </button>
      <span v-if="store.total > 0" class="alertas__badge"
            :class="store.hayCriticas ? 'alertas__badge--rojo' : 'alertas__badge--naranja'">
        {{ store.total }}
      </span>
    </div>

    <div v-if="store.loading && store.total === 0" class="alertas__cargando">
      <i class="pi pi-spin pi-spinner" /> Cargando…
    </div>

    <div v-for="grupo in store.grupos" :key="grupo.clave" class="grupo">

      <!-- Cabecera del grupo -->
      <button
        class="grupo__fila"
        :class="`grupo__fila--${grupo.nivel}`"
        @click="toggle(grupo.clave)"
        type="button"
      >
        <i :class="`pi ${grupo.icono} grupo__icono`" />
        <span class="grupo__titulo">{{ grupo.titulo }}</span>
        <span class="grupo__count">{{ grupo.total }}</span>
        <i class="pi grupo__chevron"
           :class="abierto(grupo.clave) ? 'pi-chevron-up' : 'pi-chevron-down'" />
      </button>

      <!-- Lista de items expandida -->
      <div v-if="abierto(grupo.clave)" class="grupo__items">
        <button
          v-for="item in grupo.items"
          :key="item.id"
          class="alert-item"
          :class="{ 'alert-item--urgente': item.urgente }"
          type="button"
          @click="navegar(grupo.clave, item)"
        >
          <!-- Difuntos sin ubicar -->
          <template v-if="grupo.clave === 'sin_ubicar'">
            <div class="alert-item__row">
              <span class="alert-item__nombre">{{ item.nombre_completo }}</span>
              <i class="pi pi-arrow-right alert-item__arrow" />
            </div>
            <div class="alert-item__meta">
              {{ item.fecha_fallecimiento ? '† ' + item.fecha_fallecimiento : 'Sin fecha' }}
            </div>
          </template>

          <!-- Concesiones sin nicho asignado -->
          <template v-else-if="grupo.clave === 'concesiones_sin_asignar'">
            <div class="alert-item__row">
              <span class="alert-item__nombre">{{ item.concesionario ?? 'Sin titular' }}</span>
              <i class="pi pi-arrow-right alert-item__arrow" />
            </div>
            <div class="alert-item__meta">
              Exp. {{ item.numero_expediente ?? '—' }} · Sin nicho
            </div>
          </template>

          <!-- Concesiones caducadas / próximas -->
          <template v-else>
            <div class="alert-item__row">
              <span class="alert-item__codigo">{{ item.sepultura_codigo ?? '—' }}</span>
              <i class="pi pi-arrow-right alert-item__arrow" />
            </div>
            <div class="alert-item__nombre">{{ item.concesionario ?? 'Sin titular' }}</div>
            <div class="alert-item__meta">
              <template v-if="grupo.clave === 'proximas'">
                <span :class="item.urgente ? 'text-rojo' : 'text-naranja'">
                  {{ item.dias_restantes }}d
                </span>
                · {{ item.fecha_vencimiento }}
              </template>
              <template v-else>
                Venció {{ item.fecha_vencimiento }}
              </template>
            </div>
          </template>
        </button>

        <!-- "Ver más" clickable -->
        <button
          v-if="grupo.total > grupo.items.length"
          class="grupo__mas"
          type="button"
          @click="navegar(grupo.clave, null)"
        >
          Ver {{ grupo.total - grupo.items.length }} más →
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAlertasStore } from '@/stores/alertas';

const store  = useAlertasStore();
const router = useRouter();

const abiertos = ref(new Set());

function toggle(clave) {
  if (abiertos.value.has(clave)) abiertos.value.delete(clave);
  else abiertos.value.add(clave);
}

function abierto(clave) {
  return abiertos.value.has(clave);
}

function navegar(clave, item) {
  if (clave === 'sin_ubicar' || clave === 'concesiones_sin_asignar') {
    router.push({ path: '/cementerio', query: { regularizaciones: '1', t: Date.now() } });
    return;
  }

  // Concesiones caducadas / próximas
  if (item && item.sepultura_id) {
    router.push({ path: '/cementerio', query: { sepultura: item.sepultura_id, t: Date.now() } });
  } else {
    router.push({ path: '/cementerio', query: { regularizaciones: '1', t: Date.now() } });
  }
}
</script>

<style scoped>
/* ── Contenedor ──────────────────────────────────── */
.alertas {
  margin: 6px 8px 4px;
  border-top: 1px solid rgba(255,255,255,0.07);
  padding-top: 8px;
}

/* ── Cabecera sección ────────────────────────────── */
.alertas__header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 2px 4px;
}

.alertas__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  opacity: 0.45;
  text-transform: uppercase;
  flex: 1;
}

.alertas__refresh {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: rgba(255,255,255,0.40);
  font-size: 11px;
  line-height: 1;
  border-radius: 4px;
  transition: color 120ms, transform 120ms;
}
.alertas__refresh:hover { color: rgba(255,255,255,0.80); }
.alertas__refresh--spin .pi { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.alertas__badge {
  font-size: 10px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 999px;
  line-height: 1.4;
}
.alertas__badge--rojo   { background: #A61B1B; color: #fff; }
.alertas__badge--naranja{ background: #C44536; color: #fff; }

.alertas__cargando {
  font-size: 11px;
  opacity: 0.50;
  padding: 4px 4px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ── Grupo ───────────────────────────────────────── */
.grupo { margin-bottom: 2px; }

.grupo__fila {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 5px 8px;
  border-radius: 7px;
  border: none;
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.82);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 120ms;
}
.grupo__fila:hover { background: rgba(255,255,255,0.08); }

.grupo__fila--critico { border-left: 3px solid #ef4444; }
.grupo__fila--aviso   { border-left: 3px solid #f97316; }
.grupo__fila--info    { border-left: 3px solid #60a5fa; }

.grupo__icono { font-size: 12px; opacity: 0.75; flex-shrink: 0; }
.grupo__fila--critico .grupo__icono { color: #ef4444; opacity: 1; }
.grupo__fila--aviso   .grupo__icono { color: #f97316; opacity: 1; }
.grupo__fila--info    .grupo__icono { color: #60a5fa; opacity: 1; }

.grupo__titulo {
  flex: 1;
  font-weight: 600;
  font-size: 11.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grupo__count { font-weight: 800; font-size: 12px; flex-shrink: 0; }
.grupo__fila--critico .grupo__count { color: #ef4444; }
.grupo__fila--aviso   .grupo__count { color: #f97316; }
.grupo__fila--info    .grupo__count { color: #60a5fa; }

.grupo__chevron { font-size: 10px; opacity: 0.55; flex-shrink: 0; }

/* ── Items expandidos ────────────────────────────── */
.grupo__items {
  padding: 3px 4px 2px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.alert-item {
  width: 100%;
  padding: 5px 7px;
  border-radius: 6px;
  background: rgba(255,255,255,0.03);
  border: none;
  border-left: 2px solid rgba(255,255,255,0.08);
  cursor: pointer;
  text-align: left;
  transition: background 100ms;
}
.alert-item:hover {
  background: rgba(255,255,255,0.09);
}
.alert-item--urgente {
  border-left-color: #ef4444;
  background: rgba(239,68,68,0.06);
}
.alert-item--urgente:hover { background: rgba(239,68,68,0.12); }

.alert-item__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.alert-item__arrow {
  font-size: 9px;
  opacity: 0;
  color: rgba(255,255,255,0.60);
  flex-shrink: 0;
  transition: opacity 100ms, transform 100ms;
}
.alert-item:hover .alert-item__arrow {
  opacity: 1;
  transform: translateX(2px);
}

.alert-item__codigo {
  font-size: 10px;
  font-weight: 800;
  opacity: 0.70;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.alert-item__nombre {
  font-size: 11.5px;
  font-weight: 500;
  color: rgba(255,255,255,0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.alert-item__meta {
  font-size: 10.5px;
  opacity: 0.52;
  margin-top: 1px;
}

.text-rojo   { color: #ef4444; font-weight: 700; }
.text-naranja{ color: #f97316; font-weight: 700; }

.grupo__mas {
  font-size: 10.5px;
  color: rgba(255,255,255,0.50);
  padding: 3px 6px;
  font-style: italic;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  border-radius: 4px;
  transition: color 100ms, background 100ms;
  width: 100%;
}
.grupo__mas:hover {
  color: rgba(255,255,255,0.85);
  background: rgba(255,255,255,0.06);
}
</style>
