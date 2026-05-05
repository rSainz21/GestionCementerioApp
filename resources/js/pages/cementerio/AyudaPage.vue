<template>
  <div class="ayuda">

    <!-- ── Cabecera ──────────────────────────────────────── -->
    <div class="ayuda__header">
      <div class="ayuda__header-left">
        <div class="ayuda__header-icon">
          <i class="pi pi-book" />
        </div>
        <div>
          <h1 class="ayuda__title">Manual de usuario</h1>
          <p class="ayuda__subtitle">Guía completa de la aplicación de gestión del cementerio</p>
        </div>
      </div>
      <div class="ayuda__search-wrap">
        <i class="pi pi-search ayuda__search-icon" />
        <input
          v-model="query"
          class="ayuda__search"
          type="text"
          placeholder="Buscar en el manual…"
          autocomplete="off"
          @keydown.escape="query = ''"
        />
        <button v-if="query" class="ayuda__search-clear" @click="query = ''" title="Limpiar">
          <i class="pi pi-times" />
        </button>
      </div>
    </div>

    <!-- ── Cuerpo ────────────────────────────────────────── -->
    <div class="ayuda__body">

      <!-- Tabla de contenidos (TOC) -->
      <aside class="ayuda__toc" v-if="!query">
        <div class="toc__title">Índice</div>
        <nav class="toc__nav">
          <a
            v-for="h in headings"
            :key="h.id"
            :href="'#' + h.id"
            class="toc__link"
            :class="{
              'toc__link--h1': h.level === 1,
              'toc__link--h2': h.level === 2,
              'toc__link--h3': h.level === 3,
              'toc__link--active': activeHeading === h.id
            }"
            @click.prevent="scrollTo(h.id)"
          >
            {{ h.text }}
          </a>
        </nav>
      </aside>

      <!-- Contenido principal -->
      <div class="ayuda__content-wrap" ref="contentWrap">

        <!-- Modo búsqueda -->
        <div v-if="query">
          <div class="search-header">
            <span v-if="searchResults.length">
              {{ searchResults.length }} resultado{{ searchResults.length !== 1 ? 's' : '' }} para
              <strong>"{{ query }}"</strong>
            </span>
            <span v-else class="search-empty">
              Sin resultados para <strong>"{{ query }}"</strong>
            </span>
          </div>
          <div v-if="searchResults.length" class="search-results">
            <div
              v-for="(r, i) in searchResults"
              :key="i"
              class="search-result"
              @click="query = ''; nextTick(() => scrollTo(r.id))"
            >
              <div class="search-result__section">{{ r.section }}</div>
              <div class="search-result__snippet" v-html="r.snippet" />
            </div>
          </div>
        </div>

        <!-- Modo lectura -->
        <article
          v-else
          class="prose"
          ref="article"
          v-html="renderedMarkdown"
        />

      </div>
    </div>

    <!-- Botón volver arriba -->
    <button
      v-show="showScrollTop"
      class="scroll-top"
      title="Volver arriba"
      @click="scrollToTop"
    >
      <i class="pi pi-arrow-up" />
    </button>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { marked } from 'marked';
import rawMarkdown from '../../../../docs/MANUAL_USUARIO.md?raw';

// ── Configurar marked ─────────────────────────────────────────────
marked.setOptions({ breaks: true, gfm: true });

// Renderer personalizado: añade id a los headings para anclar el TOC
const renderer = new marked.Renderer();
const slugify = (text) =>
  text.toLowerCase()
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');

renderer.heading = function ({ text, depth }) {
  const id = slugify(text);
  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};

const renderedMarkdown = computed(() => marked(rawMarkdown, { renderer }));

// ── Tabla de contenidos ───────────────────────────────────────────
const headings = computed(() => {
  const results = [];
  const regex = /^(#{1,3})\s+(.+)$/gm;
  let m;
  while ((m = regex.exec(rawMarkdown)) !== null) {
    const text = m[2].replace(/\*\*/g, '').replace(/`/g, '').trim();
    if (text.startsWith('ÍNDICE')) continue;
    results.push({ level: m[1].length, text, id: slugify(text) });
  }
  return results;
});

// ── Heading activo (highlight en TOC) ────────────────────────────
const activeHeading = ref('');
const contentWrap = ref(null);
const article = ref(null);
const showScrollTop = ref(false);

function updateActiveHeading() {
  if (!article.value) return;
  const els = article.value.querySelectorAll('h1,h2,h3');
  let current = '';
  for (const el of els) {
    if (el.getBoundingClientRect().top <= 100) current = el.id;
  }
  activeHeading.value = current;
  showScrollTop.value = (contentWrap.value?.scrollTop ?? window.scrollY) > 300;
}

// ── Navegación ────────────────────────────────────────────────────
function scrollTo(id) {
  nextTick(() => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function scrollToTop() {
  if (contentWrap.value) contentWrap.value.scrollTo({ top: 0, behavior: 'smooth' });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Búsqueda ──────────────────────────────────────────────────────
const query = ref('');

const searchResults = computed(() => {
  if (!query.value || query.value.length < 2) return [];
  const q = query.value.toLowerCase();
  const results = [];
  const lines = rawMarkdown.split('\n');
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (hMatch) { currentSection = hMatch[2].replace(/\*\*/g, '').trim(); continue; }

    if (line.toLowerCase().includes(q)) {
      const id = slugify(currentSection);
      // Contexto: línea anterior + coincidente + siguiente
      const ctx = [lines[i - 1] || '', line, lines[i + 1] || ''].join(' ').trim();
      const escaped = query.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const snippet = ctx.replace(
        new RegExp(escaped, 'gi'),
        (m) => `<mark>${m}</mark>`
      ).slice(0, 200) + (ctx.length > 200 ? '…' : '');

      // Evitar duplicados de sección
      const last = results[results.length - 1];
      if (!last || last.id !== id || last.snippet !== snippet) {
        results.push({ section: currentSection, id, snippet });
      }
      if (results.length >= 20) break;
    }
  }
  return results;
});

// ── Lifecycle ────────────────────────────────────────────────────
onMounted(() => {
  window.addEventListener('scroll', updateActiveHeading, { passive: true });
  if (contentWrap.value) {
    contentWrap.value.addEventListener('scroll', updateActiveHeading, { passive: true });
  }
});

onUnmounted(() => {
  window.removeEventListener('scroll', updateActiveHeading);
  if (contentWrap.value) {
    contentWrap.value.removeEventListener('scroll', updateActiveHeading);
  }
});

watch(query, (v) => {
  if (!v) nextTick(updateActiveHeading);
});
</script>

<style scoped>
/* ── Layout general ──────────────────────────────── */
.ayuda {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 52px);           /* restar topbar */
  overflow: hidden;
  background: var(--c2-bg, #F5F7F4);
}

/* ── Cabecera ─────────────────────────────────────── */
.ayuda__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 24px;
  background: white;
  border-bottom: 1px solid rgba(23, 35, 31, 0.09);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.ayuda__header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.ayuda__header-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--c2-primary, #118652);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  flex-shrink: 0;
}
.ayuda__title {
  font-size: 17px;
  font-weight: 800;
  color: var(--c2-text, #17231F);
  margin: 0;
}
.ayuda__subtitle {
  font-size: 12px;
  color: #6B7A74;
  margin: 2px 0 0;
}

/* Búsqueda */
.ayuda__search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.ayuda__search-icon {
  position: absolute;
  left: 11px;
  font-size: 13px;
  color: #8A9890;
  pointer-events: none;
}
.ayuda__search {
  width: 280px;
  padding: 8px 36px 8px 34px;
  border: 1.5px solid rgba(23, 35, 31, 0.15);
  border-radius: 9px;
  font-size: 13px;
  background: #F5F7F4;
  color: var(--c2-text, #17231F);
  outline: none;
  transition: border-color 150ms;
}
.ayuda__search:focus {
  border-color: var(--c2-primary, #118652);
  background: white;
}
.ayuda__search-clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #8A9890;
  font-size: 11px;
  padding: 2px;
  display: flex;
  align-items: center;
}
.ayuda__search-clear:hover { color: #333; }

/* ── Cuerpo ───────────────────────────────────────── */
.ayuda__body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── TOC ──────────────────────────────────────────── */
.ayuda__toc {
  width: 230px;
  flex-shrink: 0;
  border-right: 1px solid rgba(23, 35, 31, 0.08);
  background: white;
  overflow-y: auto;
  padding: 16px 0 24px;
}
.toc__title {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8A9890;
  padding: 0 16px 8px;
}
.toc__nav {
  display: flex;
  flex-direction: column;
}
.toc__link {
  display: block;
  padding: 4px 16px;
  font-size: 12px;
  color: #4A6060;
  text-decoration: none;
  border-left: 2px solid transparent;
  transition: all 100ms;
  line-height: 1.4;
}
.toc__link:hover {
  color: var(--c2-primary, #118652);
  background: rgba(17, 134, 82, 0.05);
}
.toc__link--active {
  color: var(--c2-primary, #118652);
  border-left-color: var(--c2-primary, #118652);
  font-weight: 700;
  background: rgba(17, 134, 82, 0.06);
}
.toc__link--h1 { font-weight: 700; font-size: 12px; padding-top: 10px; color: #1a2a24; }
.toc__link--h2 { padding-left: 22px; }
.toc__link--h3 { padding-left: 32px; font-size: 11px; color: #6B7A74; }

/* ── Contenido ────────────────────────────────────── */
.ayuda__content-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px 64px;
}

/* ── Búsqueda resultados ──────────────────────────── */
.search-header {
  margin-bottom: 20px;
  font-size: 14px;
  color: #4A6060;
}
.search-header strong { color: var(--c2-text, #17231F); }
.search-empty { color: #8A9890; }

.search-results { display: flex; flex-direction: column; gap: 12px; }
.search-result {
  background: white;
  border: 1px solid rgba(23, 35, 31, 0.10);
  border-radius: 10px;
  padding: 14px 18px;
  cursor: pointer;
  transition: border-color 120ms, box-shadow 120ms;
}
.search-result:hover {
  border-color: var(--c2-primary, #118652);
  box-shadow: 0 0 0 3px rgba(17, 134, 82, 0.08);
}
.search-result__section {
  font-size: 11px;
  font-weight: 700;
  color: var(--c2-primary, #118652);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}
.search-result__snippet {
  font-size: 13px;
  color: #4A6060;
  line-height: 1.5;
}
.search-result__snippet :deep(mark) {
  background: #fef08a;
  color: #78350f;
  border-radius: 2px;
  padding: 0 2px;
}

/* ── PROSE (estilos del markdown) ─────────────────── */
.prose {
  max-width: 820px;
  color: var(--c2-text, #17231F);
  font-size: 14.5px;
  line-height: 1.75;
}

/* Headings */
.prose :deep(h1) {
  font-size: 26px;
  font-weight: 900;
  color: var(--c2-text, #17231F);
  margin: 40px 0 8px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--c2-primary, #118652);
  line-height: 1.2;
}
.prose :deep(h1:first-child) { margin-top: 0; }

.prose :deep(h2) {
  font-size: 19px;
  font-weight: 800;
  color: var(--c2-text, #17231F);
  margin: 36px 0 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.prose :deep(h2)::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 1.1em;
  background: var(--c2-primary, #118652);
  border-radius: 2px;
  flex-shrink: 0;
}

.prose :deep(h3) {
  font-size: 15px;
  font-weight: 800;
  color: #2A4A3A;
  margin: 28px 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 13px;
}

.prose :deep(h4) {
  font-size: 14px;
  font-weight: 700;
  color: var(--c2-primary, #118652);
  margin: 20px 0 6px;
  border-left: 3px solid var(--c2-primary, #118652);
  padding-left: 10px;
}

/* Párrafos */
.prose :deep(p) {
  margin: 0 0 14px;
}

/* Negrita e itálica */
.prose :deep(strong) {
  font-weight: 800;
  color: #0E2A1E;
}
.prose :deep(em) { font-style: italic; color: #3A5A4A; }

/* Blockquote (los cuadros de nota/consejo) */
.prose :deep(blockquote) {
  background: rgba(17, 134, 82, 0.07);
  border-left: 4px solid var(--c2-primary, #118652);
  border-radius: 0 8px 8px 0;
  margin: 16px 0;
  padding: 12px 18px;
  font-size: 13.5px;
  color: #2A4A3A;
}
.prose :deep(blockquote p) { margin: 0; }
.prose :deep(blockquote p + p) { margin-top: 8px; }

/* Listas */
.prose :deep(ul),
.prose :deep(ol) {
  margin: 8px 0 14px 0;
  padding-left: 22px;
}
.prose :deep(li) {
  margin-bottom: 5px;
}
.prose :deep(li > ul),
.prose :deep(li > ol) {
  margin: 4px 0 4px 0;
}

/* Código inline */
.prose :deep(code) {
  background: rgba(17, 134, 82, 0.10);
  color: #0D6B42;
  border-radius: 4px;
  padding: 1px 6px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

/* Bloques de código */
.prose :deep(pre) {
  background: #0E2F2A;
  color: #d4f1e4;
  border-radius: 10px;
  padding: 18px 20px;
  overflow-x: auto;
  margin: 14px 0 20px;
  font-size: 13px;
  line-height: 1.6;
}
.prose :deep(pre code) {
  background: none;
  color: inherit;
  padding: 0;
  font-size: inherit;
}

/* Tablas */
.prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0 24px;
  font-size: 13.5px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(23, 35, 31, 0.10);
}
.prose :deep(thead) {
  background: var(--c2-primary, #118652);
  color: white;
}
.prose :deep(th) {
  padding: 10px 14px;
  text-align: left;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.04em;
}
.prose :deep(td) {
  padding: 9px 14px;
  border-bottom: 1px solid rgba(23, 35, 31, 0.07);
  vertical-align: top;
}
.prose :deep(tr:last-child td) { border-bottom: none; }
.prose :deep(tr:nth-child(even)) { background: rgba(23, 35, 31, 0.025); }
.prose :deep(tr:hover) { background: rgba(17, 134, 82, 0.04); }

/* Regla horizontal (separador) */
.prose :deep(hr) {
  border: none;
  height: 1px;
  background: rgba(23, 35, 31, 0.10);
  margin: 40px 0;
}

/* ── Botón volver arriba ───────────────────────────── */
.scroll-top {
  position: fixed;
  bottom: 28px;
  right: 28px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--c2-primary, #118652);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  box-shadow: 0 4px 16px rgba(17, 134, 82, 0.35);
  transition: background 150ms, transform 150ms;
  z-index: 100;
}
.scroll-top:hover {
  background: var(--c2-primary-dark, #0D6B42);
  transform: translateY(-2px);
}

/* ── Responsive ───────────────────────────────────── */
@media (max-width: 900px) {
  .ayuda__toc { display: none; }
  .ayuda__content-wrap { padding: 20px 18px 48px; }
  .ayuda__search { width: 200px; }
}
</style>
