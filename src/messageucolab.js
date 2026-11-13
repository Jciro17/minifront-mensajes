/**
 * MessageUcoLab Widget
 * ------------------------------------------------------------------
 * Componente reutilizable para que cualquier aplicación de la universidad
 * administre y consuma el catálogo de mensajes MessageUcoLab (backend NosGraduamos-FC).
 *
 * Expone dos cosas:
 *
 *   1. mount(elemento, opciones)          -> microfrontend de administración
 *      (o la etiqueta <messageucolab-admin>)  de los mensajes de la aplicación.
 *
 *   2. createMessageClient(opciones)      -> cliente liviano para que la app
 *                                            muestre sus mensajes en tiempo
 *                                            de ejecución (con caché y respaldo).
 *
 * Autenticación: la administración usa la sesión BFF del componente de seguridad
 * (cookie SECURITY_BASELINE_SESSION), enviada con credentials: 'include'. El cliente de
 * mensajes usa las rutas de consumo /messages/consumer con esa misma sesión. El widget no maneja
 * tokens: una aplicación que muestra mensajes a usuarios sin sesión los pide a su propio backend,
 * que consulta MessageUcoLab con su identidad de servicio.
 *
 * Estilo adaptativo: por defecto (theme: 'auto') toma la tipografía, los colores de texto
 * y fondo, el color principal y el redondeo de la aplicación que lo monta. Ver resolveTheme().
 *
 * No tiene dependencias: funciona en React, Vue, Angular o HTML plano.
 * Los estilos viven en un Shadow DOM, así que no chocan con los del host.
 */

import { createMessageEventStream } from './message-events.js';

const VERSION = '0.4.0';
const DEFAULT_API_BASE_URL = '/messageucolab';
const DEFAULT_LOGIN_URL = 'http://localhost:5173/login';

// UUIDs del seed de SurrealDB (los mismos que usa el frontend administrativo).
// Se pueden sobrescribir con la opción `seeds` de mount().
const DEFAULT_SEEDS = {
  languages: [
    { id: 'bed4d574-4c7f-4d95-bc12-6dbbcdbbf4fc', name: 'Español' },
    { id: '6319ca87-47b3-4e0e-994f-3166378988f2', name: 'English' },
    { id: '8cc7ae54-db8c-4ef1-929b-22e17de58129', name: 'Français' }
  ],
  applicationStates: [
    { id: 'dfb7a7cb-66f6-4b73-a1d8-803336f72ebe', name: 'Activa' },
    { id: '2a0ddacd-2dcc-47e2-b56f-03db5207c443', name: 'Inactiva' }
  ],
  functionalityStates: [
    { id: '407de974-c8aa-43e2-a5cf-22dc7c44054b', name: 'Activa' },
    { id: '505cde87-96f2-4926-8dc6-b04529469bd3', name: 'Inactiva' }
  ]
};

const ICON_EYE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>`;
const ICON_PENCIL = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>`;
const ICON_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>`;

const TRANSLATION_LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Español' },
  { id: 'pt', name: 'Português' },
  { id: 'fr', name: 'Français' },
  { id: 'de', name: 'Deutsch' },
  { id: 'it', name: 'Italiano' }
];

/* ================================================================== */
/*  Utilidades                                                         */
/* ================================================================== */

export class MessageUcoLabError extends Error {
  constructor(message, { status = 0, code = '', body = null } = {}) {
    super(message);
    this.name = 'MessageUcoLabError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

function trimSlash(url) {
  return String(url || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
}

/** Normaliza un código: "welcome" -> "MSG_WELCOME". */
export function toMessageCode(raw) {
  const value = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/^MSG_+/, '');
  return value ? `MSG_${value.replace(/ /g, '_')}` : '';
}

/** Reemplaza {variables} dentro del contenido de un mensaje. */
export function formatMessage(text, vars = {}) {
  return String(text ?? '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nameOf(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.name || '';
}

function sameText(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—'
    : new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function environmentTone(name) {
  if (isProduction(name)) return 'production';
  return sameText(name, 'Develop') ? 'develop' : sameText(name, 'Testing') ? 'testing' : '';
}

function environmentBadge(environment) {
  const name = nameOf(environment);
  return `<span class="pill environment ${environmentTone(name)}">${escapeHtml(name)}</span>`;
}

function statusBadge(status) {
  const name = nameOf(status);
  const tone = isActiveState(name) ? 'active' : isInactiveState(name) ? 'inactive' : '';
  return `<span class="pill status ${tone}">${escapeHtml(name || 'Sin estado')}</span>`;
}

// El catálogo pasó a español; se aceptan ambos nombres mientras queden datos antiguos.
const isActiveState = (name) => ['Activo', 'Activa', 'Active'].some((state) => sameText(name, state));
const isInactiveState = (name) => ['Inactivo', 'Inactiva', 'Inactive'].some((state) => sameText(name, state));
function functionalityActivity(item) {
  if (typeof item?.active === 'boolean') return item.active;
  const state = nameOf(item?.state || item?.status);
  return isActiveState(state) ? true : isInactiveState(state) ? false : null;
}
const isProduction = (name) => sameText(name, 'Produccion') || sameText(name, 'Producción') || sameText(name, 'Production');

/** Descarga un Blob como archivo desde el documento del host (el Shadow DOM no sirve de ancla). */
function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ================================================================== */
/*  Tema adaptativo                                                     */
/* ================================================================== */

// Variables CSS habituales de los sistemas de diseño para el color principal.
const ACCENT_TOKENS = [
  '--mu-accent', '--primary', '--color-primary', '--primary-color', '--brand', '--brand-color',
  '--color-brand', '--accent', '--accent-color', '--bs-primary', '--md-sys-color-primary',
  '--el-color-primary', '--p-primary-color', '--mantine-primary-color-filled', '--ion-color-primary',
  '--mdc-theme-primary', '--theme-primary'
];
const RADIUS_TOKENS = ['--mu-radius', '--radius', '--border-radius', '--bs-border-radius', '--el-border-radius-base'];
const FALLBACK_ACCENT = '#2563eb';

let probeContext = null;

/** Convierte cualquier color CSS a [r, g, b, a] (0-255, a 0-1), o null si no es un color. */
function parseColor(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  // Tokens tipo shadcn/Tailwind: "222.2 47.4% 11.2%" (componentes HSL sin función).
  const text = /^-?\d+(\.\d+)?(deg)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(raw) ? `hsl(${raw})` : raw;
  if (typeof CSS !== 'undefined' && CSS.supports && !CSS.supports('color', text)) return null;
  if (typeof document === 'undefined') return null;
  if (!probeContext) probeContext = document.createElement('canvas').getContext('2d');
  if (!probeContext) return null;
  probeContext.fillStyle = '#010203';
  probeContext.fillStyle = text;
  const normalized = probeContext.fillStyle;
  if (normalized === '#010203' && !/^#010203$/i.test(text)) return null;
  if (normalized.startsWith('#')) {
    const n = parseInt(normalized.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = normalized.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = '1'] = m[1].split(',').map((x) => x.trim());
  return [Number(r), Number(g), Number(b), Number(a)];
}

function toCss(rgba) {
  const [r, g, b] = rgba;
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function luminance([r, g, b]) {
  const ch = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function saturation([r, g, b]) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const l = (max + min) / 2;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

/** Primer fondo opaco subiendo desde el contenedor del widget. */
function backgroundOf(element) {
  let node = element;
  while (node && node.nodeType === 1) {
    const color = parseColor(getComputedStyle(node).backgroundColor);
    if (color && color[3] > 0.5) return color;
    node = node.parentElement || node.getRootNode()?.host || null;
  }
  return [255, 255, 255, 1];
}

/** Busca un botón "principal" visible de la aplicación host (colorido, no gris). */
function hostPrimaryButton(host) {
  if (typeof document === 'undefined') return null;
  const selectors = [
    '.btn-primary', 'button.primary', '.button-primary', '.p-button:not(.p-button-secondary)',
    '.el-button--primary', '.mat-mdc-unelevated-button', '.ant-btn-primary',
    'button[type="submit"]', 'button', '.btn', 'a.button', '[role="button"]'
  ];
  for (const selector of selectors) {
    for (const el of document.querySelectorAll(selector)) {
      if (host.contains(el) || el.closest('messageucolab-admin')) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const color = parseColor(style.backgroundColor);
      if (!color || color[3] < 0.6) continue;
      const lum = luminance(color);
      if (saturation(color) < 0.25 || lum > 0.85 || lum < 0.02) continue;
      return { color, radius: style.borderRadius };
    }
  }
  return null;
}

function tokenValue(style, names) {
  for (const name of names) {
    const value = style.getPropertyValue(name).trim();
    if (value) return value;
  }
  return '';
}

/**
 * Calcula los tokens de color del widget a partir de la aplicación host.
 *
 *   theme: 'auto' (por defecto)  -> detecta todo desde el host
 *   theme: { accent, background, text, radius, fontFamily, fontSize, ... } -> sobrescribe lo indicado
 *   theme: 'none'                -> paleta neutra, sin detección
 *
 * El host también puede fijar cualquier token con variables CSS en el contenedor
 * o en :root: --mu-accent, --mu-bg, --mu-text, --mu-radius, --mu-font, --mu-font-size.
 */
export function resolveTheme(host, theme = 'auto') {
  const overrides = theme && typeof theme === 'object' ? theme : {};
  const detect = theme !== 'none';
  const style = detect && typeof getComputedStyle !== 'undefined' ? getComputedStyle(host) : null;

  const background = parseColor(overrides.background) || (style ? backgroundOf(host) : [255, 255, 255, 1]);
  const text = parseColor(overrides.text) || (style ? parseColor(style.color) : null) || [23, 32, 28, 1];
  const dark = luminance(background) < 0.35;

  let accent = parseColor(overrides.accent);
  let radius = overrides.radius || '';
  let source = accent ? 'option' : '';
  if (!accent && style) {
    const token = tokenValue(style, ACCENT_TOKENS);
    accent = parseColor(token);
    if (accent) source = 'css-variable';
  }
  if (!accent && style) {
    const button = hostPrimaryButton(host);
    if (button) {
      accent = button.color;
      source = 'host-button';
      if (!radius && button.radius && button.radius !== '0px') radius = button.radius;
    }
  }
  if (!accent) {
    accent = parseColor(FALLBACK_ACCENT);
    source = 'default';
  }
  if (!radius && style) radius = tokenValue(style, RADIUS_TOKENS);
  if (!radius) radius = '10px';

  // Texto sobre el color principal: el de mejor contraste.
  const onAccent = parseColor(overrides.accentText) ||
    (luminance(accent) > 0.45 ? [17, 24, 39, 1] : [255, 255, 255, 1]);

  const tokens = {
    '--accent': toCss(accent),
    '--on-accent': toCss(onAccent),
    '--bg': toCss(background),
    '--ink': toCss(text),
    '--radius': radius,
    '--danger': overrides.danger || (dark ? '#f97066' : '#b42318'),
    '--ok': overrides.success || (dark ? '#47cd89' : '#127a4b')
  };
  if (overrides.fontFamily) tokens['--ufont'] = overrides.fontFamily;
  if (overrides.fontSize) tokens['--ufont-size'] = overrides.fontSize;
  if (overrides.surface) tokens['--panel'] = overrides.surface;
  if (overrides.border) tokens['--line'] = overrides.border;
  if (overrides.muted) tokens['--muted'] = overrides.muted;

  // El host puede ganar siempre con variables --mu-* (heredan a través del Shadow DOM).
  const css = Object.entries(tokens)
    .map(([name, value]) => `${name}: var(--mu-${name.replace(/^--u?/, '')}, ${value})`)
    .join('; ');
  return { css, dark, source, tokens };
}

/* ================================================================== */
/*  Cliente HTTP (contrato de /messageucolab/v1)                        */
/* ================================================================== */

/**
 * Crea un cliente HTTP del contrato MessageUcoLab.
 * opciones:
 *  - apiBaseUrl: URL hasta /messageucolab (por defecto relativo: "/messageucolab").
 *  - credentials: modo de credenciales de fetch (por defecto "include": viaja la cookie de sesión).
 *  - timeoutMs: tiempo máximo por petición (por defecto 10 s).
 *  - onUnauthorized(error): se invoca ante un 401 (sesión ausente o vencida).
 */
export function createApi(options = {}) {
  const base = `${trimSlash(options.apiBaseUrl)}/v1`;
  const timeoutMs = options.timeoutMs ?? 10000;

  async function request(path, { method = 'GET', body, applicationId, environmentId, envelope = false,
                                 download = false, timeout = timeoutMs } = {}) {
    // Los Excel viajan como multipart; el navegador pone el Content-Type con su boundary.
    const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = {
      Accept: download ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json' : 'application/json'
    };
    if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
    if (applicationId) headers['X-Application-Id'] = applicationId;
    if (environmentId) headers['X-Environment-Id'] = environmentId;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;

    let response;
    try {
      response = await fetch(base + path, {
        method,
        headers,
        body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
        credentials: options.credentials || 'include',
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      });
    } catch (error) {
      const aborted = error && error.name === 'AbortError';
      throw new MessageUcoLabError(
        aborted
          ? 'MessageUcoLab no respondió a tiempo.'
          : 'No fue posible conectar con MessageUcoLab. Revisa la URL de la API o el proxy.',
        { status: 0, code: aborted ? 'TIMEOUT' : 'NETWORK' }
      );
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (download && response.ok) return response.blob();
    const text = await response.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }

    const apiError = Array.isArray(json?.errors) && json.errors.length ? json.errors[0] : null;
    if (!response.ok || apiError) {
      const message =
        apiError?.message ||
        (response.status === 401
          ? 'Tu sesión del componente de seguridad no es válida o venció.'
          : response.status === 403
            ? 'No tienes permiso para esta operación.'
            : json?.detail || json?.message || `Error HTTP ${response.status}`);
      const error = new MessageUcoLabError(message, {
        status: response.status,
        code: apiError?.code || json?.code || (response.status === 401 ? 'SESSION_EXPIRED' : ''),
        body: json
      });
      if (response.status === 401 && typeof options.onUnauthorized === 'function') {
        try {
          options.onUnauthorized(error);
        } catch {
          /* el host decide qué hacer */
        }
      }
      throw error;
    }

    if (envelope) return json;
    if (json && typeof json === 'object' && 'data' in json && Array.isArray(json.errors)) return json.data;
    return json;
  }

  const list = (data) => (Array.isArray(data) ? data : data ? [data] : []);
  // La importación responde { data: {...} } sin la lista errors cuando todo va bien.
  const unwrap = (json) => (json && typeof json === 'object' && !Array.isArray(json) && 'data' in json ? json.data : json);

  return {
    request,
    // Sesión: aplicaciones propias del usuario, con su organización
    sessionApplications: async () => list(await request('/session/applications')),
    // Catálogos
    environments: async (applicationId) =>
      list(await request(`/catalog/applications/${encodeURIComponent(applicationId)}/environments`)),
    functionalities: async (applicationId) =>
      list(await request(`/catalog/applications/${encodeURIComponent(applicationId)}/functionalities`)),
    messageTypes: async () => list(await request('/catalog/message-types')),
    messageCategories: async () => list(await request('/catalog/message-categories')),
    messageStates: async () => list(await request('/catalog/message-states')),
    // Mensajes (siempre en el alcance de una aplicación)
    listMessages: async (applicationId, { page = 1, size = 10, environmentIds = [], code = '',
      title = '', statusId = '', functionalityId = '', sort = 'ASC', columnSort = 'code' } = {}) => {
      const query = new URLSearchParams({ page, size, sort, columnSort });
      if (environmentIds.length) query.set('filterEnvironments', environmentIds.join(','));
      if (code) query.set('filterCode', code);
      if (title) query.set('filterTitle', title);
      if (statusId) query.set('filterStatusId', statusId);
      if (functionalityId) query.set('filterFunctionalityId', functionalityId);
      const json = await request(`/messages?${query}`, { applicationId, envelope: true });
      const outer = json?.data;
      const pageObj = Array.isArray(outer) ? outer.find((x) => x && Array.isArray(x.data)) : outer;
      if (pageObj && Array.isArray(pageObj.data)) {
        return {
          items: pageObj.data,
          page,
          totalItems: pageObj.totalItems ?? pageObj.data.length,
          totalPages: pageObj.totalPages ?? 1
        };
      }
      const items = Array.isArray(outer) ? outer : [];
      return { items, page, totalItems: items.length, totalPages: 1 };
    },
    findMessage: async (applicationId, code) => {
      const data = await request(`/messages?code=${encodeURIComponent(toMessageCode(code))}`, { applicationId });
      if (Array.isArray(data)) return data[0] ?? null;
      return data ?? null;
    },
    // Rutas de consumo con la sesión: sin idioma devuelve el texto original; con idioma, la traducción.
    consumerMessage: (applicationId, environmentId, code, language = '') => {
      const query = `?code=${encodeURIComponent(toMessageCode(code))}`;
      return language
        ? request(`/messages/consumer/translations${query}`, { method: 'POST', body: { targetLanguage: language },
            applicationId, environmentId, timeout: Math.max(timeoutMs, 60000) })
        : request(`/messages/consumer${query}`, { applicationId, environmentId });
    },
    consumerMessages: (applicationId, environmentId) => request('/messages/consumer', { applicationId, environmentId }),
    // Importación por Excel: se valida todo el archivo y solo se guarda al confirmar.
    importTemplate: (applicationId) => request('/messages/imports/template', { applicationId, download: true }),
    validateImport: (applicationId, file, environmentIds) => {
      const body = new FormData();
      body.append('file', file);
      const query = new URLSearchParams({ environmentIds: environmentIds.join(',') });
      return request(`/messages/imports/validate?${query}`, { method: 'POST', body, applicationId, timeout: 60000 }).then(unwrap);
    },
    importPreview: (applicationId, importId) =>
      request(`/messages/imports/${encodeURIComponent(importId)}`, { applicationId }).then(unwrap),
    importErrors: (applicationId, importId) =>
      request(`/messages/imports/${encodeURIComponent(importId)}/errors`, { applicationId, download: true }),
    confirmImport: (applicationId, importId, productionConfirmed) =>
      request(`/messages/imports/${encodeURIComponent(importId)}/confirm`, {
        method: 'POST', body: { productionConfirmed }, applicationId, timeout: 60000
      }).then(unwrap),
    createMessage: (applicationId, payload) => request('/messages', { method: 'POST', body: payload, applicationId }),
    updateMessage: (applicationId, code, payload) =>
      request(`/messages/${encodeURIComponent(toMessageCode(code))}`, { method: 'PUT', body: payload, applicationId }),
    deleteMessage: (applicationId, code) =>
      request(`/messages/${encodeURIComponent(toMessageCode(code))}`, { method: 'DELETE', applicationId }),
    translateMessage: async (applicationId, code, targetLanguage, sourceLanguage = 'auto') => {
      const data = await request(`/messages/${encodeURIComponent(toMessageCode(code))}/translations`, {
        method: 'POST',
        body: { sourceLanguage, targetLanguage },
        applicationId, timeout: Math.max(timeoutMs, 60000)
      });
      return Array.isArray(data) ? data[0] ?? null : data;
    },
    createApplication: (payload) => request('/application', { method: 'POST', body: payload }),
    createFunctionality: (payload) => request('/application/functionality', { method: 'POST', body: payload }),
    updateFunctionalityState: (applicationId, functionalityId, stateId) =>
      request(`/application/functionality/${encodeURIComponent(functionalityId)}/state`, {
        method: 'PATCH', applicationId, body: { applicationId, stateId }
      }),
    messageEvents: (applicationId, callbacks = {}) => createMessageEventStream({
      url: `${base}/messages/events`, applicationId, credentials: options.credentials || 'include',
      onEvent: callbacks.onEvent, onStatus: callbacks.onStatus,
      onUnauthorized: callbacks.onUnauthorized || (() => options.onUnauthorized?.(
        new MessageUcoLabError('Tu sesión de seguridad venció.', { status: 401, code: 'SESSION_EXPIRED' })))
    })
  };
}

/**
 * Resuelve el espacio de trabajo (organización, aplicación y ambientes) de la sesión.
 * Devuelve { organizationId, organization, applicationId, application, environments, environmentId, environment }.
 */
export async function resolveWorkspace(api, { applicationName, environmentName } = {}) {
  const apps = await api.sessionApplications();
  const app = apps.find((a) => !applicationName || sameText(a.name, applicationName));
  if (!app) {
    const error = new MessageUcoLabError(
      applicationName
        ? `Tu usuario no administra una aplicación llamada "${applicationName}" en MessageUcoLab.`
        : 'Tu usuario aún no tiene aplicaciones en MessageUcoLab.',
      { code: 'APPLICATION_NOT_FOUND' }
    );
    error.applications = apps;
    throw error;
  }
  return workspaceFor(api, app, environmentName);
}

async function workspaceFor(api, app, environmentName) {
  const environments = await api.environments(app.id);
  const env =
    environments.find((e) => environmentName && sameText(e.name, environmentName)) ||
    environments.find((e) => sameText(e.name, 'Develop')) ||
    environments[0] ||
    null;
  return {
    organizationId: app.organization?.id || '',
    organization: app.organization?.name || '',
    applicationId: app.id,
    application: app.name,
    environments,
    environmentId: env?.id || '',
    environment: env?.name || ''
  };
}

/** Compatibilidad con la versión 0.1: ahora el contexto es el espacio de trabajo de la sesión. */
export const ensureContext = resolveWorkspace;

/* ================================================================== */
/*  Cliente de mensajes para tiempo de ejecución                        */
/* ================================================================== */

/**
 * Cliente para que una aplicación muestre sus mensajes desde el navegador.
 *
 *   const mensajes = createMessageClient({
 *     apiBaseUrl: '/messageucolab',
 *     applicationId: '...', environmentId: '...',        // requiere la sesión del propietario
 *     language: 'en',                                    // opcional: idioma de los textos
 *     fallbacks: { MSG_STOCKLOW: { title: 'Stock bajo', content: 'Quedan {qty} unidades' } }
 *   });
 * Con applicationName / environmentName en lugar de los IDs, los resuelve con la sesión del usuario.
 *   const m = await mensajes.get('MSG_STOCKLOW', { qty: 3 });
 *   // m = { code, title, content, source: 'api' | 'cache' | 'fallback', error? }
 *
 * get() nunca lanza excepción: si el servicio falla devuelve el respaldo,
 * para que la aplicación consumidora siga funcionando.
 */
export function createMessageClient(options = {}) {
  const api = createApi({ timeoutMs: 4000, ...options });
  const cacheTtlMs = options.cacheTtlMs ?? 5 * 60 * 1000;
  const missTtlMs = options.missTtlMs ?? 30 * 1000;
  const fallbacks = { ...(options.fallbacks || {}) };
  const cache = new Map();
  const misses = new Map();
  const inflight = new Map();
  let target = null;

  async function scope() {
    if (options.applicationId && options.environmentId) {
      return { applicationId: options.applicationId, environmentId: options.environmentId };
    }
    if (!target) {
      target = resolveWorkspace(api, options).catch((error) => {
        target = null; // reintenta en la siguiente llamada
        throw error;
      });
    }
    return target;
  }

  function fallbackFor(code, error) {
    const fb = fallbacks[code];
    const base =
      typeof fb === 'string' ? { title: fb, content: fb } : fb || { title: code, content: code };
    return { code, title: base.title ?? code, content: base.content ?? '', source: 'fallback', error };
  }

  function applyVars(message, vars) {
    if (!vars) return message;
    return { ...message, title: formatMessage(message.title, vars), content: formatMessage(message.content, vars) };
  }

  async function getStrict(rawCode, vars) {
    const code = toMessageCode(rawCode);
    const hit = cache.get(code);
    if (hit && Date.now() - hit.at < cacheTtlMs) return applyVars({ ...hit.value, source: 'cache' }, vars);
    const miss = misses.get(code);
    if (miss && Date.now() - miss.at < missTtlMs) throw miss.error;
    if (!inflight.has(code)) {
      inflight.set(
        code,
        scope()
          .then(({ applicationId, environmentId }) =>
            api.consumerMessage(applicationId, environmentId, code, options.language || ''))
          .then((m) => {
            const value = { code: m.code || code, title: m.title || '', content: m.content || '' };
            cache.set(code, { at: Date.now(), value });
            misses.delete(code);
            return value;
          })
          .catch((error) => {
            if (error.status === 404) misses.set(code, { at: Date.now(), error });
            throw error;
          })
          .finally(() => inflight.delete(code))
      );
    }
    const value = await inflight.get(code);
    return applyVars({ ...value, source: 'api' }, vars);
  }

  async function get(rawCode, vars) {
    const code = toMessageCode(rawCode);
    try {
      return await getStrict(code, vars);
    } catch (error) {
      if (typeof options.onError === 'function') {
        try {
          options.onError(error, code);
        } catch {
          /* ignorar */
        }
      }
      return applyVars(fallbackFor(code, error), vars);
    }
  }

  return {
    get,
    getStrict,
    /** Atajo: devuelve solo el contenido. */
    text: async (code, vars) => (await get(code, vars)).content,
    /** Carga varios códigos en paralelo (útil al iniciar la app). */
    preload: (codes) => Promise.all(codes.map((c) => get(c))),
    clearCache: () => {
      cache.clear();
      misses.clear();
    },
    setFallbacks: (more) => Object.assign(fallbacks, more || {}),
    api
  };
}

/* ================================================================== */
/*  Microfrontend de administración                                     */
/* ================================================================== */

// Los colores salen de resolveTheme(); aquí solo se derivan tonos con color-mix().
const STYLES = `
:host { display: block; }
* { box-sizing: border-box; }
.mu {
  --accent-soft: color-mix(in srgb, var(--accent) 14%, var(--bg));
  --accent-line: color-mix(in srgb, var(--accent) 35%, var(--bg));
  --muted: var(--mu-muted, color-mix(in srgb, var(--ink) 62%, var(--bg)));
  --line: var(--mu-line, color-mix(in srgb, var(--ink) 15%, var(--bg)));
  --panel: var(--mu-panel, color-mix(in srgb, var(--ink) 4%, var(--bg)));
  --field: var(--mu-field, color-mix(in srgb, var(--ink) 2%, var(--bg)));
  font-family: var(--ufont, var(--mu-font, inherit));
  font-size: var(--ufont-size, var(--mu-font-size, 14px));
  line-height: 1.45;
  color: var(--ink);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  min-width: 0;
  max-width: 100%;
  container-type: inline-size;
}
.top { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; padding: 20px 24px; border-bottom: 1px solid var(--line); background: var(--panel); }
.brand { display: flex; align-items: center; gap: 10px; margin-right: auto; min-width: 0; }
.mark { width: 38px; height: 38px; flex-shrink: 0; border-radius: var(--radius); background: var(--accent); color: var(--on-accent); display: grid; place-items: center; font-weight: 700; font-size: 1.2em; }
.brand strong { display: block; font-size: 1.07em; }
.brand small { color: var(--muted); font-size: .86em; }
.ctx { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-width: 0; max-width: 100%; font-size: .86em; color: var(--muted); background: var(--panel); border: 1px solid var(--line); border-radius: 999px; padding: 4px 6px 4px 12px; }
.ctx b { color: var(--ink); font-weight: 600; }
.ctx select { width: auto; padding: 2px 6px; font-size: 1em; border-radius: 999px; }
.tabs { display: flex; gap: 4px; padding: 6px 16px 0; border-bottom: 1px solid var(--line); overflow-x: auto; }
.tabs button { background: none; border: 0; border-bottom: 2px solid transparent; border-radius: 0; color: var(--muted); padding: 10px 12px; font-weight: 600; white-space: nowrap; }
.tabs button.on { color: var(--accent); border-bottom-color: var(--accent); }
.body { padding: 24px; }
.page-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 20px; }
.page-heading h3 { font-size: 1.4em; letter-spacing: -.03em; }
.page-heading p { margin: 6px 0 0; }
.page-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.search-panel { display: grid; gap: 14px; padding: 16px; margin-bottom: 20px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); }
.search-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.filter-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)) auto; align-items: end; gap: 14px; }
.search-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.empty-state { display: grid; justify-items: center; gap: 10px; padding: 38px 18px; border: 1px dashed var(--line); border-radius: var(--radius); text-align: center; }
.empty-state p { max-width: 420px; margin: 0; }
.empty-mark { display: grid; place-items: center; width: 48px; height: 48px; border-radius: var(--radius); background: var(--accent-soft); color: var(--accent); font-size: 1.4em; }
h3 { margin: 0 0 4px; font-size: 1.15em; }
h4 { margin: 18px 0 8px; font-size: .93em; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
p { margin: 0 0 12px; }
.hint { color: var(--muted); font-size: .93em; }
button, .btn {
  font: inherit; font-weight: 600; cursor: pointer; border-radius: calc(var(--radius) - 3px);
  border: 1px solid var(--accent); background: var(--accent); color: var(--on-accent); padding: 8px 14px;
}
button:hover { filter: brightness(1.06); }
button.ghost { background: transparent; color: var(--accent); }
button.ghost:hover { background: var(--accent-soft); filter: none; }
button.link { background: none; border: 0; color: var(--accent); padding: 2px 4px; }
button.small { padding: 4px 10px; font-size: .86em; }
button:disabled { opacity: .5; cursor: not-allowed; }
button:focus-visible, summary:focus-visible { outline: 3px solid var(--accent-line); outline-offset: 3px; }
fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
fieldset:disabled { opacity: .7; }
input, select, textarea {
  font: inherit; color: var(--ink); width: 100%; padding: 8px 10px; background: var(--field);
  border: 1px solid var(--line); border-radius: calc(var(--radius) - 3px);
}
input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent-soft); border-color: var(--accent); }
textarea { resize: vertical; min-height: 70px; }
label { display: grid; gap: 4px; align-content: start; font-size: .93em; font-weight: 600; min-width: 0; }
label small { font-weight: 400; color: var(--muted); }
label small.bad { color: var(--danger); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr)); gap: 16px; }
.form-section { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--line); }
.form-section h4 { margin: 0 0 14px; color: var(--ink); text-transform: none; letter-spacing: 0; font-size: 1em; }
.environment-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr)); gap: 10px; }
.environment-options .check { justify-content: space-between; min-height: 52px; }
.environment-options .check span { min-width: 0; overflow-wrap: anywhere; }
.environment-options .check input { order: 1; flex-shrink: 0; }
.environment-options .check.production { border-color: color-mix(in srgb, var(--ok) 40%, var(--bg)); }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.functionality-form { margin-top: 24px; gap: 16px; align-items: end; }
.full { grid-column: 1 / -1; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.row input { flex: 1 1 220px; width: auto; }
.checks { display: flex; flex-wrap: wrap; gap: 8px; }
.check { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; padding: 6px 10px; border: 1px solid var(--line); border-radius: calc(var(--radius) - 3px); background: var(--field); cursor: pointer; }
.check input { width: auto; accent-color: var(--accent); }
.check.on { border-color: var(--accent-line); background: var(--accent-soft); }
.table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: calc(var(--radius) - 3px); }
table { width: 100%; border-collapse: collapse; font-size: .93em; }
th, td { text-align: left; padding: 14px 12px; border-bottom: 1px solid var(--line); vertical-align: middle; }
th { background: var(--panel); font-size: .86em; color: var(--muted); font-weight: 600; }
tr:last-child td { border-bottom: 0; }
tbody tr:hover { background: var(--field); }
.message-title { min-width: 180px; max-width: 340px; }
.message-title strong { display: block; font-weight: 600; overflow-wrap: anywhere; }
.message-preview { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--muted); font-size: .86em; margin-top: 4px; overflow-wrap: anywhere; }
.message-code { text-align: left; overflow-wrap: anywhere; }
.date-cell { color: var(--muted); white-space: nowrap; font-size: .86em; }
button.table-sort { display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; border-radius: 2px; background: none; color: inherit; font: inherit; white-space: nowrap; }
button.table-sort:hover { color: var(--accent); filter: none; }
th[aria-sort=ascending], th[aria-sort=descending] { color: var(--accent); }
code, .code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .86em; }
.pill { display: inline-block; font-size: .79em; padding: 2px 8px; margin: 0 4px 4px 0; border-radius: 999px; background: var(--panel); border: 1px solid var(--line); color: var(--muted); }
.pill.accent { background: var(--accent-soft); border-color: var(--accent-line); color: var(--ink); }
.pill.environment, .pill.status { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.pill.environment::before, .pill.status::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.pill.develop { color: var(--accent); border-color: var(--accent-line); background: var(--accent-soft); }
.pill.testing { color: var(--ink); border-style: dashed; }
.pill.production, .pill.status.active { color: var(--ok); background: color-mix(in srgb, var(--ok) 10%, var(--bg)); border-color: color-mix(in srgb, var(--ok) 25%, var(--bg)); }
.pill.status.inactive { color: var(--danger); background: color-mix(in srgb, var(--danger) 8%, var(--bg)); border-color: color-mix(in srgb, var(--danger) 22%, var(--bg)); }
.alert { padding: 10px 12px; border-radius: calc(var(--radius) - 3px); margin-bottom: 12px; font-size: .93em; }
.alert.err { background: color-mix(in srgb, var(--danger) 10%, var(--bg)); color: var(--danger); border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--bg)); }
.alert.ok { background: color-mix(in srgb, var(--ok) 10%, var(--bg)); color: var(--ok); border: 1px solid color-mix(in srgb, var(--ok) 30%, var(--bg)); }
.alert.info { background: var(--panel); color: var(--muted); border: 1px solid var(--line); }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.card { border: 1px solid var(--line); border-radius: calc(var(--radius) - 3px); padding: 12px; display: grid; gap: 4px; background: var(--field); }
.card strong { font-size: 1em; }
.card span { color: var(--muted); font-size: .86em; }
.card button { margin-top: 8px; }
.detail { border: 1px solid var(--line); border-radius: calc(var(--radius) - 3px); padding: 14px; display: grid; gap: 8px; }
.detail dl { display: grid; grid-template-columns: 130px 1fr; gap: 6px 12px; margin: 0; }
.detail dt { color: var(--muted); font-size: .86em; }
.detail dd { margin: 0; }
pre { background: color-mix(in srgb, var(--ink) 90%, var(--bg)); color: var(--bg); padding: 12px; border-radius: calc(var(--radius) - 3px); overflow-x: auto; font-size: .86em; margin: 0; }
.pager { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; justify-content: space-between; margin-top: 18px; font-size: .86em; color: var(--muted); }
.pager-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.page-size { display: flex; align-items: center; gap: 8px; font-weight: 400; }
.page-size select { width: auto; padding: 5px 8px; }
.loading { color: var(--muted); padding: 18px 0; }
.foot { padding: 8px 18px; border-top: 1px solid var(--line); font-size: .79em; color: var(--muted); display: flex; justify-content: space-between; gap: 8px; }
.foot span { overflow-wrap: anywhere; min-width: 0; }
[data-live-status]:not(:empty) { padding: 14px 24px 0; }
[data-live-status] .alert { margin: 0; }
.sync-status { display: inline-flex; align-items: center; gap: 6px; }
.sync-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--muted); }
.sync-status.connected::before { background: var(--ok); }
.actions-cell { display: flex; gap: 2px; align-items: center; }
.icon-btn { display: inline-grid; place-items: center; min-width: 32px; min-height: 32px; background: none; border: 0; cursor: pointer; padding: 6px; border-radius: 6px; color: var(--muted); line-height: 1; }
.icon-btn:hover { background: var(--panel); color: var(--ink); filter: none; }
.icon-btn.edit { color: var(--accent); }
.icon-btn.edit:hover { background: var(--accent-soft); }
.icon-btn.danger { color: var(--danger); }
.icon-btn.danger:hover { background: color-mix(in srgb, var(--danger) 10%, var(--bg)); }
.icon-btn:disabled { opacity: .4; cursor: not-allowed; }
.steps { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 0 0 14px; padding: 0; list-style: none; font-size: .86em; color: var(--muted); }
.steps li.on { color: var(--accent); font-weight: 700; }
.steps li.done { color: var(--ok); }
.drop { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 16px; margin: 12px 0; border: 1px dashed var(--accent-line); border-radius: calc(var(--radius) - 3px); background: var(--panel); }
.drop.over { background: var(--accent-soft); }
.drop div { flex: 1 1 220px; min-width: 0; }
.drop strong { display: block; overflow-wrap: anywhere; }
.drop input[type=file] { display: none; }
.summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
.summary div { border: 1px solid var(--line); border-radius: calc(var(--radius) - 3px); padding: 10px; background: var(--field); }
.summary strong { display: block; font-size: 1.4em; }
.summary span { color: var(--muted); font-size: .86em; }
.summary .bad strong { color: var(--danger); }
.summary .good strong { color: var(--ok); }
.scroll { max-height: 340px; overflow: auto; }
.issue { display: block; color: var(--danger); font-size: .86em; }
.valid { color: var(--ok); font-weight: 600; }
.between { display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; align-items: center; margin-top: 14px; }
@media (max-width: 700px) { .filter-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } .search-actions { grid-column: 1 / -1; } }
@media (max-width: 560px) { .detail dl { grid-template-columns: 1fr; } .top { padding: 16px; } .body { padding: 16px; } .search-fields, .filter-fields { grid-template-columns: minmax(0, 1fr); } .ctx { border-radius: var(--radius); } [data-live-status]:not(:empty) { padding: 12px 16px 0; } }
@container (max-width: 700px) { .filter-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } .search-actions { grid-column: 1 / -1; } }
@container (max-width: 560px) { .search-fields, .filter-fields, .detail dl { grid-template-columns: minmax(0, 1fr); } .top, .body { padding: 16px; } .ctx { border-radius: var(--radius); } }
`;

class AdminWidget {
  constructor(host, options = {}) {
    this.host = host;
    this.options = { apiBaseUrl: DEFAULT_API_BASE_URL, theme: 'auto', ...options };
    this.seeds = { ...DEFAULT_SEEDS, ...(options.seeds || {}) };
    this.api = createApi({
      ...this.options,
      onUnauthorized: (error) => {
        this.sessionLost = true;
        this.stopRealtime();
        if (this.state) this.set({ view: 'session', busy: false });
        if (typeof this.options.onUnauthorized === 'function') this.options.onUnauthorized(error);
      }
    });
    this.root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    this.state = {
      view: 'loading',
      tab: 'list',
      error: '',
      notice: '',
      catalogError: '',
      listError: '',
      context: null,
      applications: [],
      catalogs: { types: [], categories: [], states: [], functionalities: [] },
      list: { items: [], page: 1, size: options.pageSize || 10, totalItems: 0, totalPages: 0, loading: false,
        query: '', title: '', statusId: '', functionalityId: '', sort: 'ASC', columnSort: 'code' },
      detail: null,
      detailError: '',
      consumerView: null,
      translation: null,
      editing: null,
      importing: null,
      eventsStatus: 'disconnected',
      busy: false
    };
    this.contextVersion = 0;
    this.messagesVersion = 0;
    this.catalogsVersion = 0;
    this.catalogRevision = 0;
    this.realtimeGeneration = 0;
    this.realtimeTimer = null;
    this.realtimePending = null;
    this.realtimeInFlight = false;
    this.onClick = this.onClick.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.onInput = this.onInput.bind(this);
    this.onChange = this.onChange.bind(this);
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('submit', this.onSubmit);
    this.root.addEventListener('input', this.onInput);
    this.root.addEventListener('change', this.onChange);
    this.onDrag = this.onDrag.bind(this);
    for (const type of ['dragover', 'dragleave', 'drop']) this.root.addEventListener(type, this.onDrag);
    this.applyTheme();
    this.watchTheme();
    this.render();
    this.start();
  }

  /* ---------- tema ---------- */

  applyTheme() {
    this.theme = resolveTheme(this.host, this.options.theme);
    const shell = this.root.querySelector('.mu');
    if (shell) shell.setAttribute('style', this.theme.css);
  }

  /** Recalcula el tema si la aplicación host cambia de tema (clase, atributo o modo oscuro). */
  watchTheme() {
    if (this.options.theme === 'none' || typeof window === 'undefined') return;
    let pending = 0;
    const refresh = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => this.applyTheme());
    };
    if (typeof MutationObserver !== 'undefined') {
      this.themeObserver = new MutationObserver(refresh);
      for (const el of [document.documentElement, document.body]) {
        if (el) this.themeObserver.observe(el, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-bs-theme', 'data-mode'] });
      }
    }
    if (window.matchMedia) {
      this.schemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.schemeQuery.addEventListener?.('change', refresh);
      this.schemeRefresh = refresh;
    }
  }

  /* ---------- ciclo de vida ---------- */

  destroy() {
    this.destroyed = true;
    this.contextVersion++;
    this.messagesVersion++;
    this.catalogsVersion++;
    this.stopRealtime();
    this.root.removeEventListener('click', this.onClick);
    this.root.removeEventListener('submit', this.onSubmit);
    this.root.removeEventListener('input', this.onInput);
    this.root.removeEventListener('change', this.onChange);
    for (const type of ['dragover', 'dragleave', 'drop']) this.root.removeEventListener(type, this.onDrag);
    this.themeObserver?.disconnect();
    this.schemeQuery?.removeEventListener?.('change', this.schemeRefresh);
    this.root.innerHTML = '';
  }

  emit(name, detail) {
    this.host.dispatchEvent(new CustomEvent(`messageucolab:${name}`, { detail, bubbles: true, composed: true }));
    if (typeof this.options.onEvent === 'function') {
      try {
        this.options.onEvent(name, detail);
      } catch {
        /* el host decide */
      }
    }
  }

  set(patch) {
    if (this.destroyed) return;
    Object.assign(this.state, patch);
    this.render();
  }

  fail(error, where = 'error') {
    const message = error?.message || String(error);
    this.emit('error', { message, status: error?.status, code: error?.code, where });
    if (error?.status === 401) {
      this.stopRealtime();
      this.set({ view: 'session' });
    }
    return message;
  }

  get appId() {
    return this.state.context?.applicationId || '';
  }

  async start() {
    const version = ++this.contextVersion;
    this.stopRealtime();
    this.sessionLost = false;
    this.set({ view: 'loading', error: '', context: null, busy: false });
    const { applicationName, environmentName } = this.options;
    try {
      const apps = await this.api.sessionApplications();
      if (this.destroyed || version !== this.contextVersion) return;
      this.state.applications = apps;
      const visible = applicationName ? apps.filter((a) => sameText(a.name, applicationName)) : apps;
      if (visible.length === 1) {
        await this.useApplication(visible[0], environmentName);
      } else {
        this.set({
          view: 'applications',
          error: applicationName && !visible.length
            ? `Tu usuario no administra una aplicación llamada "${applicationName}" en MessageUcoLab.`
            : ''
        });
      }
    } catch (error) {
      if (this.destroyed || version !== this.contextVersion) return;
      const message = this.fail(error, 'start');
      if (error.status !== 401) this.set({ view: 'fatal', error: message });
    }
  }

  async useApplication(app, environmentName = this.options.environmentName) {
    const version = ++this.contextVersion;
    this.stopRealtime();
    this.set({ view: 'loading', error: '', context: null, editing: null, detail: null, consumerView: null,
      translation: null, catalogError: '', listError: '', catalogs: { types: [], categories: [], states: [], functionalities: [] },
      list: { ...this.state.list, items: [], page: 1, query: '', title: '', statusId: '', functionalityId: '',
        sort: 'ASC', columnSort: 'code', totalItems: 0, totalPages: 0 } });
    try {
      const ctx = await workspaceFor(this.api, app, environmentName);
      if (this.destroyed || version !== this.contextVersion) return;
      this.state.context = ctx;
      this.state.importing = null; // la plantilla es de una sola aplicación
      this.emit('context', ctx);
      await Promise.all([this.loadCatalogs(), this.loadMessages(1)]);
      if (this.destroyed || version !== this.contextVersion) return;
      if (this.state.view !== 'session') {
        this.set({ view: 'ready' });
        this.startRealtime();
      }
    } catch (error) {
      if (this.destroyed || version !== this.contextVersion) return;
      const message = this.fail(error, 'context');
      if (error.status !== 401) this.set({ view: 'fatal', error: message });
    }
  }

  async loadCatalogs() {
    const appId = this.appId;
    const contextVersion = this.contextVersion;
    const version = ++this.catalogsVersion;
    const results = await Promise.allSettled([
      this.api.messageTypes(), this.api.messageCategories(), this.api.messageStates(),
      appId ? this.api.functionalities(appId) : Promise.resolve([])
    ]);
    if (this.destroyed || appId !== this.appId || contextVersion !== this.contextVersion
      || version !== this.catalogsVersion || this.sessionLost) return;
    const keys = ['types', 'categories', 'states', 'functionalities'];
    this.state.catalogs = Object.fromEntries(keys.map((key, index) => [key,
      results[index].status === 'fulfilled' ? results[index].value : this.state.catalogs[key]]));
    const failure = results.find((result) => result.status === 'rejected');
    this.state.catalogError = failure ? `No se pudieron actualizar los catálogos: ${failure.reason?.message || 'error de conexión'}` : '';
    this.catalogRevision++;
  }

  async loadMessages(page = this.state.list.page, code = this.state.list.query, { silent = false } = {}) {
    const list = this.state.list;
    const appId = this.appId;
    const envId = this.state.context?.environmentId;
    const contextVersion = this.contextVersion;
    const version = ++this.messagesVersion;
    const current = () => !this.destroyed && !this.sessionLost && version === this.messagesVersion
      && contextVersion === this.contextVersion && appId === this.appId
      && envId === this.state.context?.environmentId;
    if (!appId) return;
    this.state.list = { ...list, loading: true, page, query: code };
    if (!silent) this.render();
    try {
      const res = await this.api.listMessages(appId, {
        page,
        size: list.size,
        environmentIds: envId ? [envId] : [],
        code: code ? toMessageCode(code) : '',
        title: list.title,
        statusId: list.statusId,
        functionalityId: list.functionalityId,
        sort: list.sort,
        columnSort: list.columnSort
      });
      if (!current()) return;
      const lastPage = Math.max(1, res.totalPages || 1);
      if (page > lastPage) return this.loadMessages(lastPage, code, { silent });
      this.state.list = { ...this.state.list, ...res, loading: false, query: code };
      this.state.listError = '';
    } catch (error) {
      if (!current()) return;
      this.state.list = { ...this.state.list, ...(silent ? {} : { items: [] }), loading: false };
      this.state.listError = this.fail(error, 'list');
    }
    if (current()) {
      if (silent) this.renderLiveData();
      else this.render();
    }
  }

  /* ---------- actualizaciones administrativas en tiempo real ---------- */

  stopRealtime() {
    this.realtimeGeneration = (this.realtimeGeneration || 0) + 1;
    const stream = this.eventStream;
    this.eventStream = null;
    stream?.stop();
    if (this.realtimeTimer !== null) clearTimeout(this.realtimeTimer);
    this.realtimeTimer = null;
    this.realtimePending = null;
    this.realtimeInFlight = false;
    if (this.state) this.state.eventsStatus = 'disconnected';
  }

  startRealtime() {
    this.stopRealtime();
    const appId = this.appId;
    const version = this.contextVersion;
    const generation = this.realtimeGeneration;
    const current = () => !this.destroyed && !this.sessionLost && this.state.view === 'ready'
      && this.appId === appId && this.contextVersion === version && this.realtimeGeneration === generation;
    if (!appId || !current()) return;
    this.eventStream = this.api.messageEvents(appId, {
      onEvent: (event) => { if (current()) this.onMessageEvent(event); },
      onStatus: (status) => {
        if (!current()) return;
        this.state.eventsStatus = status;
        this.renderLiveStatus();
        this.emit('events-status', { status, applicationId: appId });
      }
    });
    this.eventStream.start();
  }

  onMessageEvent({ event, data, id }) {
    const payload = data && typeof data === 'object' ? data : {};
    const type = event === 'message' ? payload.type : event;
    if (!['connected', 'MessageCreated', 'MessageUpdated', 'MessageDeleted', 'MessageChanged', 'MessagesChanged'].includes(type)) return;
    if (payload.applicationId && payload.applicationId !== this.appId) return;
    const environmentId = this.state.context?.environmentId;
    if (payload.environmentId && environmentId && payload.environmentId !== environmentId) return;
    this.emit('server-event', { ...payload, type, id: payload.id || id, applicationId: this.appId });
    this.scheduleRealtimeRefresh({ type, catalogs: type === 'connected' || type === 'MessagesChanged' });
  }

  scheduleRealtimeRefresh(event = { type: 'MessageUpdated' }) {
    if (this.destroyed || this.sessionLost || !this.appId || this.state.view !== 'ready') return;
    const previous = this.realtimePending;
    const priority = ['MessageDeleted', 'MessagesChanged', 'connected', 'MessageCreated', 'MessageUpdated', 'MessageChanged'];
    const previousPriority = previous ? priority.indexOf(previous.type) : -1;
    const nextPriority = priority.indexOf(event.type);
    const type = previousPriority !== -1 && (nextPriority === -1 || previousPriority < nextPriority)
      ? previous.type : event.type;
    this.realtimePending = { type, catalogs: Boolean(previous?.catalogs || event.catalogs) };
    if (this.realtimeTimer !== null || this.realtimeInFlight) return;
    this.realtimeTimer = setTimeout(() => {
      this.realtimeTimer = null;
      this.refreshRealtime();
    }, 150);
  }

  async refreshRealtime() {
    const pending = this.realtimePending;
    if (!pending || this.realtimeInFlight || this.destroyed || this.sessionLost || this.state.view !== 'ready') return;
    this.realtimePending = null;
    this.realtimeInFlight = true;
    const generation = this.realtimeGeneration;
    try {
      const list = this.state.list;
      const page = pending.type === 'MessageDeleted' || (list.query && pending.type !== 'MutationAccepted') ? 1 : list.page;
      await Promise.all([
        this.loadMessages(page, list.query, { silent: true }),
        pending.catalogs ? this.loadCatalogs() : Promise.resolve()
      ]);
      if (generation === this.realtimeGeneration) this.renderLiveData();
    } finally {
      if (generation === this.realtimeGeneration) {
        this.realtimeInFlight = false;
        if (this.realtimePending) this.scheduleRealtimeRefresh(this.realtimePending);
      }
    }
  }

  renderLiveStatus() {
    if (this.destroyed) return;
    const badge = this.root.querySelector('[data-sync-status]');
    if (badge) {
      const status = this.state.eventsStatus;
      badge.className = `sync-status ${status === 'connected' ? 'connected' : ''}`;
      badge.textContent = status === 'connected' ? 'Actualización en vivo'
        : status === 'connecting' ? 'Conectando actualizaciones…'
          : status === 'forbidden' ? 'Actualización no autorizada' : 'Actualización pausada';
    }
    const region = this.root.querySelector('[data-live-status]');
    if (!region) return;
    const status = this.state.eventsStatus;
    const message = status === 'forbidden'
      ? 'La actualización automática está bloqueada. Solicita revisar el permiso GET /messageucolab/v1/messages/events en seguridad.'
      : ['error', 'reconnecting', 'disconnected'].includes(status)
        ? 'Se perdió la conexión de actualizaciones. Los mensajes se sincronizarán al reconectar.' : '';
    region.innerHTML = message && this.state.view === 'ready'
      ? `<div class="alert info" role="status">${escapeHtml(message)} <button class="link small" data-action="events-reconnect">Reconectar actualizaciones</button></div>` : '';
  }

  renderLiveData() {
    if (this.destroyed || this.state.view !== 'ready') return;
    const results = this.root.querySelector('[data-message-results]');
    if (results) results.innerHTML = this.renderListResults();
    const functionalities = this.root.querySelector('[data-functionalities]');
    if (functionalities) functionalities.innerHTML = this.renderFunctionalityList();
    for (const [name, items] of [['statusId', this.state.catalogs.states],
      ['functionalityId', this.state.catalogs.functionalities]]) {
      const filter = this.root.querySelector(`form[data-form="search"] select[name="${name}"]`);
      if (!filter || filter.dataset.catalogVersion === String(this.catalogRevision)) continue;
      const value = filter.value;
      filter.innerHTML = `<option value="">${name === 'statusId' ? 'Todos' : 'Todas'}</option>`
        + this.options_(items, { selected: value || '-' });
      filter.value = value;
      filter.dataset.catalogVersion = String(this.catalogRevision);
    }
    const feedback = this.root.querySelector('[data-feedback]');
    if (feedback) feedback.innerHTML = this.renderAlertContents();
    // Do not replace forms: keep drafts, focus, file inputs and import confirmations intact.
    const selection = this.root.querySelector('form[data-form="create"] select[name="functionalityId"], form[data-form="edit"] select[name="functionalityId"]');
    if (selection) {
      const creating = this.state.tab === 'create';
      const items = creating ? this.state.catalogs.functionalities.filter((f) => functionalityActivity(f) === true)
        : this.state.catalogs.functionalities;
      const value = selection.value;
      if (selection.dataset.catalogVersion !== String(this.catalogRevision)) {
        selection.innerHTML = '<option value="">Seleccionar…</option>' + this.options_(items, { selected: value || '-' });
        selection.value = items.some((item) => item.id === value) ? value : '';
        selection.disabled = creating && !items.length;
        selection.dataset.catalogVersion = String(this.catalogRevision);
      }
      if (creating) {
        const submit = this.root.querySelector('form[data-form="create"] button[type="submit"]');
        if (submit) submit.disabled = this.state.busy || !items.length;
        const notice = this.root.querySelector('[data-functionality-availability]');
        if (notice) notice.innerHTML = this.renderFunctionalityAvailability(!items.length);
      }
    }
    this.renderLiveStatus();
  }

  async toggleFunctionality(id) {
    if (this.state.busy || this.destroyed || this.sessionLost) return;
    const functionality = this.state.catalogs.functionalities.find((item) => item.id === id);
    const active = functionalityActivity(functionality);
    if (!functionality || active === null) return;
    const target = this.seeds.functionalityStates.find((state) => active
      ? isInactiveState(state.name) : isActiveState(state.name));
    if (!target) return this.set({ error: 'No está configurado el estado destino de funcionalidades.' });
    const warning = active
      ? 'Todos sus mensajes pasarán a inactivos en todos los ambientes y dejarán de estar disponibles para consumo. No se eliminarán.'
      : 'Los mensajes conservarán su estado. Activar la funcionalidad no reactiva automáticamente sus mensajes.';
    if (!confirm(`¿${active ? 'Inactivar' : 'Activar'} la funcionalidad "${functionality.name}"? ${warning}`)) return;
    const appId = this.appId;
    const version = this.contextVersion;
    const current = () => !this.destroyed && !this.sessionLost && appId === this.appId && version === this.contextVersion;
    this.set({ busy: true, error: '', notice: '' });
    try {
      await this.api.updateFunctionalityState(appId, id, target.id);
      if (!current()) return;
      this.state.catalogs.functionalities = this.state.catalogs.functionalities.map((item) => item.id === id
        ? { ...item, active: !active, stateId: target.id, state: active ? 'Inactivo' : 'Activo' } : item);
      this.catalogRevision++;
      this.emit('functionality-state-changed', { applicationId: appId, functionalityId: id, stateId: target.id, active: !active });
      this.set({ busy: false, notice: active ? 'Funcionalidad inactivada. Sus mensajes están inactivos.'
        : 'Funcionalidad activada. Sus mensajes conservan su estado.' });
      this.scheduleRealtimeRefresh({ type: 'MutationAccepted', catalogs: true });
    } catch (error) {
      if (!current()) return;
      this.set({ busy: false, error: error.status === 403
        ? 'No tienes permiso para cambiar el estado. Solicita revisar el permiso PATCH de funcionalidades en seguridad.'
        : this.fail(error, 'functionality-state') });
    }
  }

  async openDetail(code) {
    this.set({ tab: 'detail', detail: null, detailError: '', notice: '', error: '', consumerView: null, translation: null, busy: true });
    try {
      const message = await this.api.findMessage(this.appId, code);
      this.set({ detail: message, busy: false, detailError: message ? '' : `No se encontró ${toMessageCode(code)}.` });
    } catch (error) {
      this.set({ busy: false, detailError: this.fail(error, 'detail') });
    }
  }

  loginUrl() {
    const base = this.options.loginUrl || DEFAULT_LOGIN_URL;
    const back = typeof window !== 'undefined' ? window.location.href : '';
    return `${base}${base.includes('?') ? '&' : '?'}returnTo=${encodeURIComponent(back)}`;
  }

  /* ---------- importación por Excel ---------- */

  newImport() {
    const env = this.state.context?.environmentId;
    return {
      step: 1, environmentIds: env ? [env] : [], file: null, preview: null, receipt: null,
      filter: 'all', productionConfirmed: false, unknownOutcome: false, downloading: false, error: ''
    };
  }

  patchImport(patch) {
    this.set({ importing: { ...this.state.importing, ...patch } });
  }

  chooseImportFile(file) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name) || file.size === 0 || file.size > 5 * 1024 * 1024) {
      this.patchImport({ file: null, preview: null, error: 'Selecciona un archivo .xlsx no vacío de hasta 5 MB.' });
      return;
    }
    this.patchImport({ file, preview: null, productionConfirmed: false, error: '' });
  }

  async downloadImport(kind) {
    const imp = this.state.importing;
    if (imp.downloading) return;
    this.patchImport({ downloading: true, error: '' });
    try {
      const errors = kind === 'errors';
      const blob = errors
        ? await this.api.importErrors(this.appId, imp.preview.importId)
        : await this.api.importTemplate(this.appId);
      saveBlob(blob, errors ? 'errores-importacion.xlsx' : 'plantilla-mensajes.xlsx');
      this.patchImport({ downloading: false });
    } catch (error) {
      this.patchImport({ downloading: false, error: this.fail(error, 'import') });
    }
  }

  async validateImport() {
    const imp = this.state.importing;
    if (this.state.busy || !imp.file || !imp.environmentIds.length) return;
    this.set({ busy: true, importing: { ...imp, error: '' } });
    try {
      const preview = await this.api.validateImport(this.appId, imp.file, imp.environmentIds);
      this.set({ busy: false, importing: { ...this.state.importing, preview, step: 2, filter: 'all' } });
    } catch (error) {
      this.set({ busy: false, importing: { ...this.state.importing, error: this.fail(error, 'import') } });
    }
  }

  async confirmImport() {
    const imp = this.state.importing;
    if (this.state.busy || !imp.preview) return;
    this.set({ busy: true, importing: { ...imp, error: '' } });
    try {
      const receipt = await this.api.confirmImport(this.appId, imp.preview.importId, imp.productionConfirmed);
      this.emit('imported', receipt);
      this.set({ busy: false, importing: { ...this.state.importing, receipt, step: 3, unknownOutcome: false } });
      this.loadMessages(1);
    } catch (error) {
      const message = this.fail(error, 'import');
      // Sin respuesta no se sabe si se guardó; la confirmación es idempotente y se puede repetir.
      const unknownOutcome = !error.status || error.status >= 500;
      let preview = imp.preview;
      if (error.status === 409 || error.status === 422) {
        try {
          preview = await this.api.importPreview(this.appId, imp.preview.importId);
        } catch {
          /* se conserva el error de la confirmación */
        }
      }
      this.set({
        busy: false,
        importing: {
          ...this.state.importing, preview, unknownOutcome,
          error: unknownOutcome
            ? 'No se pudo conocer el resultado. Reintenta la confirmación: si el lote ya se guardó, el servidor lo devuelve sin duplicarlo.'
            : message
        }
      });
    }
  }

  onDrag(event) {
    const zone = event.target.closest?.('.drop');
    if (!zone || this.state.busy) return;
    event.preventDefault();
    zone.classList.toggle('over', event.type === 'dragover');
    if (event.type !== 'drop') return;
    const files = event.dataTransfer?.files || [];
    if (files.length !== 1) {
      this.patchImport({ error: 'Selecciona un solo archivo por importación.' });
      return;
    }
    this.chooseImportFile(files[0]);
  }

  /* ---------- eventos ---------- */

  onInput(event) {
    const target = event.target;
    const counter = target?.dataset?.count;
    if (!counter) return;
    const [min, max] = counter.split('-').map(Number);
    const out = this.root.querySelector(`[data-counter-for="${target.name}"]`);
    if (!out) return;
    const value = target.value.trim();
    const len = target.name === 'code' ? value.toUpperCase().replace(/^MSG_+/, '').length : value.length;
    out.textContent = target.name === 'code'
      ? `${len}/${max} · se guardará como ${toMessageCode(target.value) || 'MSG_…'}`
      : `${len}/${max} caracteres`;
    out.classList.toggle('bad', len > 0 && (len < min || len > max));
  }

  async onChange(event) {
    const target = event.target;
    if (target?.dataset?.action === 'environment') {
      if (this.state.busy) return;
      const env = this.state.context.environments.find((e) => e.id === target.value);
      if (!env && target.value) return;
      this.state.context = { ...this.state.context, environmentId: env?.id || '', environment: env?.name || '' };
      this.emit('context', this.state.context);
      this.state.consumerView = null;
      this.messagesVersion++;
      this.startRealtime();
      await this.loadMessages(1);
      return;
    }
    if (target?.dataset?.action === 'page-size') {
      const size = Number(target.value);
      if (this.state.list.loading || ![5, 10, 20, 50].includes(size)) return;
      this.state.list = { ...this.state.list, size };
      await this.loadMessages(1);
      return;
    }
    if (target?.dataset?.action === 'import-env') {
      const environmentIds = [...this.root.querySelectorAll('[data-action="import-env"]:checked')].map((i) => i.value);
      this.patchImport({ environmentIds, preview: null, productionConfirmed: false, error: '' });
      return;
    }
    if (target?.dataset?.action === 'import-file') {
      this.chooseImportFile(target.files?.[0]);
      return;
    }
    if (target?.dataset?.action === 'import-prod') {
      this.patchImport({ productionConfirmed: target.checked });
      return;
    }
    if (target?.type === 'checkbox' && target.closest('.check')) {
      target.closest('.check').classList.toggle('on', target.checked);
    }
  }

  async onClick(event) {
    const el = event.target.closest('[data-action]');
    if (!el || el.disabled || el.tagName === 'SELECT') return;
    const { action, arg } = el.dataset;
    if (this.state.busy && ['tab', 'pick-app', 'change-app', 'toggle-functionality', 'view', 'edit-msg', 'delete-msg',
      'refresh', 'page', 'clear-filters', 'sort-updated'].includes(action)) return;
    switch (action) {
      case 'tab':
        this.set({
          tab: arg, notice: '', error: '',
          ...(arg === 'import' && !this.state.importing ? { importing: this.newImport() } : {})
        });
        if (arg === 'list' && !this.state.list.items.length) this.loadMessages(1);
        if (arg === 'config' || arg === 'create' || arg === 'edit') {
          await this.loadCatalogs();
          this.renderLiveData();
        }
        break;
      case 'toggle-functionality':
        await this.toggleFunctionality(arg);
        break;
      case 'events-reconnect':
        this.startRealtime();
        break;
      case 'import-pick':
        this.root.querySelector('[data-action="import-file"]')?.click();
        break;
      case 'import-template':
        await this.downloadImport('template');
        break;
      case 'import-errors':
        await this.downloadImport('errors');
        break;
      case 'import-validate':
        await this.validateImport();
        break;
      case 'import-confirm':
        await this.confirmImport();
        break;
      case 'import-filter':
        this.patchImport({ filter: arg });
        break;
      case 'import-back':
        if (!this.state.busy && !this.state.importing.unknownOutcome) {
          this.patchImport({ step: 1, preview: null, productionConfirmed: false, error: '' });
        }
        break;
      case 'import-new':
        this.set({ importing: this.newImport() });
        break;
      case 'refresh':
        await this.loadMessages(this.state.list.page);
        break;
      case 'page':
        await this.loadMessages(Number(arg), this.state.list.query);
        break;
      case 'clear-filters':
        this.state.list = { ...this.state.list, title: '', statusId: '', functionalityId: '' };
        await this.loadMessages(1, '');
        break;
      case 'sort-updated': {
        const list = this.state.list;
        if (list.loading) return;
        this.state.list = { ...list, columnSort: 'updatedAt',
          sort: list.columnSort === 'updatedAt' && list.sort === 'DESC' ? 'ASC' : 'DESC' };
        await this.loadMessages(1);
        break;
      }
      case 'view':
        await this.openDetail(arg);
        break;
      case 'pick-app': {
        const app = this.state.applications[Number(arg)];
        if (app) await this.useApplication(app);
        break;
      }
      case 'change-app':
        this.contextVersion++;
        this.stopRealtime();
        this.set({ view: 'applications', context: null, error: '' });
        break;
      case 'retry':
        this.start();
        break;
      case 'login':
        if (typeof window !== 'undefined') window.location.href = this.loginUrl();
        break;
      case 'edit-msg': {
        const m = this.state.list.items.find((i) => i.code === arg);
        if (!m) return;
        const c = this.state.catalogs;
        const editing = {
          code: m.code,
          title: m.title || '',
          content: m.content || '',
          typeId: m.typeId || c.types.find((t) => sameText(t.name, nameOf(m.type)))?.id || '',
          categoryId: m.categoryId || c.categories.find((t) => sameText(t.name, nameOf(m.category)))?.id || '',
          statusId: m.statusId || c.states.find((t) => sameText(t.name, nameOf(m.status)))?.id || '',
          functionalityId: m.functionalityId || c.functionalities.find((f) => sameText(f.name, nameOf(m.functionality)))?.id || '',
          environmentIds: (m.environments || []).map((environment) => environment.id).filter(Boolean)
        };
        this.set({ tab: 'edit', editing, error: '', notice: '' });
        break;
      }
      case 'delete-msg': {
        if (!confirm(`¿Eliminar el mensaje "${arg}" de todos sus ambientes? Esta acción no se puede deshacer.`)) return;
        this.set({ busy: true, error: '' });
        try {
          await this.api.deleteMessage(this.appId, arg);
          this.emit('deleted', { code: arg });
          this.set({ busy: false });
          await this.loadMessages(this.state.list.page);
          this.set({ notice: `Mensaje ${arg} eliminado.` });
        } catch (error) {
          this.set({ busy: false, error: this.fail(error, 'delete') });
        }
        break;
      }
      case 'consumer-view': {
        const code = this.state.detail?.code;
        const ctx = this.state.context;
        if (!code || !ctx?.environmentId) return;
        this.set({ busy: true });
        try {
          const resolved = await this.api.consumerMessage(ctx.applicationId, ctx.environmentId, code);
          this.set({ consumerView: { ok: true, data: resolved }, busy: false });
        } catch (error) {
          this.set({ consumerView: { ok: false, error: error.message, status: error.status }, busy: false });
        }
        break;
      }
      default:
        break;
    }
  }

  async onSubmit(event) {
    event.preventDefault();
    if (this.state.busy || this.destroyed || this.sessionLost) return;
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const kind = form.dataset.form;

    if (kind === 'search') {
      this.state.list = { ...this.state.list, title: String(data.title || '').trim(),
        statusId: String(data.statusId || ''), functionalityId: String(data.functionalityId || '') };
      return this.loadMessages(1, String(data.q || '').trim());
    }
    if (kind === 'search-detail') return data.code && data.code.trim() ? this.openDetail(data.code) : undefined;

    if (kind === 'create') {
      const suffix = String(data.code || '').trim().toUpperCase().replace(/^MSG_+/, '');
      const environmentIds = formData.getAll('environmentIds');
      const problems = [];
      if (!suffix || suffix.length > 500 || !/^[A-Z0-9 ]+$/.test(suffix))
        problems.push('El código acepta entre 1 y 500 letras, números o espacios (sin MSG_). Ej.: STOCKLOW');
      if (!environmentIds.length) problems.push('Elige al menos un ambiente.');
      if (data.title.trim().length < 5 || data.title.trim().length > 1000)
        problems.push('El título debe tener entre 5 y 1000 caracteres.');
      if (data.content.trim().length < 5 || data.content.trim().length > 2000)
        problems.push('El contenido debe tener entre 5 y 2000 caracteres.');
      if (!data.functionalityId) problems.push('Selecciona una funcionalidad (créala en Configuración si no hay).');
      else if (functionalityActivity(this.state.catalogs.functionalities.find((f) => f.id === data.functionalityId)) !== true)
        problems.push('Selecciona una funcionalidad activa de esta aplicación.');
      if (!data.typeId || !data.categoryId || !data.statusId) problems.push('Tipo, categoría y estado son obligatorios.');
      if (problems.length) return this.set({ error: problems.join(' '), notice: '' });

      this.set({ busy: true, error: '' });
      try {
        await this.api.createMessage(this.appId, {
          code: suffix,
          title: data.title.trim(),
          content: data.content.trim(),
          typeId: data.typeId,
          categoryId: data.categoryId,
          statusId: data.statusId,
          functionalityId: data.functionalityId,
          environmentIds
        });
        const code = toMessageCode(suffix);
        this.emit('created', { code });
        this.set({ busy: false, tab: 'list', notice: `Mensaje ${code} creado.` });
        await this.loadMessages(1);
        this.set({ notice: `Mensaje ${code} creado.` });
      } catch (error) {
        this.set({ busy: false, error: this.fail(error, 'create') });
      }
      return;
    }

    if (kind === 'edit') {
      const code = this.state.editing?.code;
      if (!code) return;
      const environmentIds = formData.getAll('environmentIds');
      const problems = [];
      if (!environmentIds.length) problems.push('Elige al menos un ambiente.');
      if (environmentIds.some((id) => !this.state.context.environments.some((env) => env.id === id)))
        problems.push('Selecciona únicamente ambientes de esta aplicación.');
      if (data.title.trim().length < 5 || data.title.trim().length > 1000)
        problems.push('El título debe tener entre 5 y 1000 caracteres.');
      if (data.content.trim().length < 5 || data.content.trim().length > 2000)
        problems.push('El contenido debe tener entre 5 y 2000 caracteres.');
      if (!data.functionalityId) problems.push('Selecciona una funcionalidad.');
      const selectedFunctionality = this.state.catalogs.functionalities.find((f) => f.id === data.functionalityId);
      const selectedState = this.state.catalogs.states.find((state) => state.id === data.statusId);
      if (isActiveState(nameOf(selectedState)) && functionalityActivity(selectedFunctionality) !== true)
        problems.push('No se puede activar un mensaje mientras su funcionalidad esté inactiva.');
      if (!data.typeId || !data.categoryId || !data.statusId) problems.push('Tipo, categoría y estado son obligatorios.');
      if (problems.length) return this.set({ error: problems.join(' '), notice: '' });
      this.set({ busy: true, error: '' });
      try {
        await this.api.updateMessage(this.appId, code, {
          title: data.title.trim(),
          content: data.content.trim(),
          typeId: data.typeId,
          categoryId: data.categoryId,
          statusId: data.statusId,
          functionalityId: data.functionalityId,
          environmentIds
        });
        this.emit('updated', { code });
        this.set({ busy: false, tab: 'list', editing: null, notice: `Mensaje ${code} actualizado.` });
        await this.loadMessages(this.state.list.page);
        this.set({ notice: `Mensaje ${code} actualizado.` });
      } catch (error) {
        this.set({ busy: false, error: this.fail(error, 'edit') });
      }
      return;
    }

    if (kind === 'translate') {
      this.set({ busy: true, translation: null });
      try {
        const result = await this.api.translateMessage(this.appId, this.state.detail.code, data.targetLanguage);
        this.set({ busy: false, translation: { ok: true, data: result } });
      } catch (error) {
        this.set({ busy: false, translation: { ok: false, error: error.message } });
      }
      return;
    }

    if (kind === 'functionality') {
      if (!data.name.trim()) return this.set({ error: 'El nombre de la funcionalidad es obligatorio.' });
      this.set({ busy: true, error: '' });
      try {
        await this.api.createFunctionality({
          name: data.name.trim().slice(0, 50),
          applicationId: this.appId,
          stateId: data.stateId
        });
        this.emit('functionality-created', { name: data.name.trim() });
        await this.loadCatalogs();
        this.set({ busy: false, notice: `Funcionalidad "${data.name.trim()}" creada.` });
      } catch (error) {
        this.set({ busy: false, error: this.fail(error, 'functionality') });
      }
      return;
    }
  }

  /* ---------- render ---------- */

  captureEditor() {
    const form = this.root.querySelector('form[data-editor-key]');
    if (!form) return null;
    const active = this.root.activeElement;
    return {
      key: form.dataset.editorKey,
      fields: [...form.elements].filter((field) => field.name).map((field) => ({
        name: field.name, value: field.value, checked: field.checked
      })),
      focus: form.contains(active) ? active.name : '',
      selectionStart: active?.selectionStart,
      selectionEnd: active?.selectionEnd
    };
  }

  restoreEditor(draft) {
    const form = this.root.querySelector('form[data-editor-key]');
    if (!draft || !form || form.dataset.editorKey !== draft.key) return;
    for (const field of form.elements) {
      if (!field.name) continue;
      const saved = draft.fields.find((item) => item.name === field.name
        && (field.type !== 'checkbox' || item.value === field.value));
      if (!saved) continue;
      if (field.type === 'checkbox') {
        field.checked = saved.checked;
        field.closest('.check')?.classList.toggle('on', saved.checked);
      } else if (field.tagName !== 'SELECT' || [...field.options].some((option) => option.value === saved.value)) {
        field.value = saved.value;
      }
      if (field.dataset.count) this.onInput({ target: field });
    }
    const focus = [...form.elements].find((field) => field.name === draft.focus);
    if (focus && !this.state.busy) {
      focus.focus();
      if (typeof draft.selectionStart === 'number' && focus.setSelectionRange) {
        focus.setSelectionRange(draft.selectionStart, draft.selectionEnd);
      }
    }
  }

  render() {
    const draft = this.captureEditor();
    const s = this.state;
    const ctx = s.context;
    const title = this.options.title || 'Mensajes de la aplicación';
    const css = this.theme?.css || '';

    this.root.innerHTML = `
      <style>${STYLES}</style>
      <div class="mu" style="${escapeHtml(css)}">
        <div class="top">
          <div class="brand">
            <div class="mark">M</div>
            <div><strong>${escapeHtml(title)}</strong><small>Catálogo MessageUcoLab</small></div>
          </div>
          ${ctx && s.view === 'ready' ? this.renderContext(ctx) : ''}
        </div>
        ${s.view === 'ready' ? this.renderTabs() : ''}
        <div data-live-status aria-live="polite"></div>
        <div class="body">${this.renderBody()}</div>
        <div class="foot"><span>MessageUcoLab · v${VERSION}</span>${s.view === 'ready' ? '<span class="sync-status" data-sync-status role="status"></span>' : ''}</div>
      </div>`;
    this.restoreEditor(draft);
    this.renderLiveStatus();
  }

  renderContext(ctx) {
    const envs = ctx.environments || [];
    const envControl = this.options.lockEnvironment || envs.length < 2
      ? `<b>${escapeHtml(ctx.environment || 'Sin ambiente')}</b>`
      : `<select data-action="environment" aria-label="Filtrar por ambiente" ${this.state.busy ? 'disabled' : ''}><option value="" ${!ctx.environmentId ? 'selected' : ''}>Todos los ambientes</option>${envs
          .map((e) => `<option value="${escapeHtml(e.id)}" ${e.id === ctx.environmentId ? 'selected' : ''}>${escapeHtml(e.name)}</option>`)
          .join('')}</select>`;
    return `<div class="ctx" title="Organización / Aplicación / Ambiente">
        ${escapeHtml(ctx.organization)} / <b>${escapeHtml(ctx.application)}</b> / ${envControl}
        ${this.options.lockContext || this.state.applications.length < 2 ? '' : `<button class="link small" data-action="change-app" ${this.state.busy ? 'disabled' : ''}>Cambiar</button>`}
      </div>`;
  }

  renderTabs() {
    const tabs = [
      ['list', 'Mensajes'],
      ['create', 'Crear mensaje'],
      ['import', 'Importar'],
      ['detail', 'Consultar'],
      ['config', 'Configuración']
    ];
    return `<nav class="tabs" aria-label="Administración de mensajes">${tabs
      .map(([id, label]) => `<button class="${this.state.tab === id ? 'on' : ''}" ${this.state.tab === id ? 'aria-current="page"' : ''} data-action="tab" data-arg="${id}" ${this.state.busy ? 'disabled' : ''}>${label}</button>`)
      .join('')}</nav>`;
  }

  renderAlerts() {
    return `<div data-feedback>${this.renderAlertContents()}</div>`;
  }

  renderAlertContents() {
    const s = this.state;
    return `${s.error ? `<div class="alert err" role="alert">${escapeHtml(s.error)}</div>` : ''}${
      s.notice ? `<div class="alert ok" role="status">${escapeHtml(s.notice)}</div>` : ''
    }${s.catalogError ? `<div class="alert err" role="alert">${escapeHtml(s.catalogError)}</div>` : ''}${
      s.tab === 'list' && s.listError ? `<div class="alert err" role="alert">${escapeHtml(s.listError)}</div>` : ''}`;
  }

  renderBody() {
    const s = this.state;
    if (s.view === 'loading') return '<div class="loading">Conectando con MessageUcoLab…</div>';
    if (s.view === 'session') {
      return `<h3>Tu sesión se perdió</h3>
        <p class="hint">La sesión del componente de seguridad no es válida o venció. Vuelve a conectarte
        para seguir administrando tus mensajes.</p>
        <div class="row"><button data-action="login">Volver a conectar</button>
        <button class="ghost" data-action="retry">Reintentar</button></div>`;
    }
    if (s.view === 'fatal') {
      return `<div class="alert err">${escapeHtml(s.error)}</div>
        <p class="hint">Revisa que MessageUcoLab esté arriba y que la URL de la API sea correcta
        (${escapeHtml(trimSlash(this.options.apiBaseUrl))}).</p>
        <button data-action="retry">Reintentar</button>`;
    }
    if (s.view === 'applications') return this.renderApplications();
    switch (s.tab) {
      case 'create':
        return this.renderCreate();
      case 'import':
        return this.renderImport();
      case 'detail':
        return this.renderDetail();
      case 'edit':
        return this.renderEdit();
      case 'config':
        return this.renderConfig();
      default:
        return this.renderList();
    }
  }

  renderApplications() {
    const s = this.state;
    const appName = this.options.applicationName;
    const indexed = s.applications.map((a, i) => ({ ...a, _i: i }));
    const visible = appName ? indexed.filter((a) => sameText(a.name, appName)) : indexed;
    return `${this.renderAlerts()}
      <h3>Selecciona tu aplicación</h3>
      <p class="hint">Aplicaciones que administras en MessageUcoLab.</p>
      ${visible.length
        ? `<div class="cards">${visible
            .map((a) => `<div class="card">
                <strong>${escapeHtml(a.name)}</strong>
                <span>${escapeHtml(a.organization?.name || '')}</span>
                <button class="small" data-action="pick-app" data-arg="${a._i}">Usar esta</button>
              </div>`)
            .join('')}</div>`
        : '<div class="alert info">Aún no tienes aplicaciones. Créalas en la pantalla de MessageUcoLab.</div>'}`;
  }

  renderList() {
    const l = this.state.list;
    const c = this.state.catalogs;
    return `${this.renderAlerts()}
      <div class="page-heading">
        <div><h3>Mensajes</h3><p class="hint">Consulta y gestiona el catálogo de ${escapeHtml(this.state.context?.application)}.</p></div>
        <div class="page-actions">
          <button type="button" class="ghost" data-action="refresh" ${l.loading ? 'disabled' : ''}>${l.loading ? 'Actualizando…' : 'Actualizar'}</button>
          <button type="button" data-action="tab" data-arg="create">+ Crear mensaje</button>
        </div>
      </div>
      <form class="search-panel" data-form="search" role="search" aria-label="Buscar y filtrar mensajes">
        <div class="search-fields">
          <label>Código<input type="search" name="q" placeholder="Ej. MSG_BIENVENIDA" value="${escapeHtml(l.query)}" /></label>
          <label>Título<input type="search" name="title" placeholder="Buscar por título…" value="${escapeHtml(l.title)}" /></label>
        </div>
        <div class="filter-fields">
          <label>Estado<select name="statusId" data-catalog-version="${this.catalogRevision}"><option value="">Todos</option>${this.options_(c.states, { selected: l.statusId || '-' })}</select></label>
          <label>Funcionalidad<select name="functionalityId" data-catalog-version="${this.catalogRevision}"><option value="">Todas</option>${this.options_(c.functionalities, { selected: l.functionalityId || '-' })}</select></label>
          <div class="search-actions"><button type="submit" ${l.loading ? 'disabled' : ''}>Buscar</button>
          <button type="button" class="ghost" data-action="clear-filters" ${l.loading ? 'disabled' : ''}>Limpiar búsqueda</button></div>
        </div>
      </form>
      <div data-message-results>${this.renderListResults()}</div>`;
  }

  renderListResults() {
    const l = this.state.list;
    const disabled = l.loading || this.state.busy ? 'disabled' : '';
    const filtered = l.query || l.title || l.statusId || l.functionalityId;
    const sorted = l.columnSort === 'updatedAt';
    const sort = sorted ? (l.sort === 'ASC' ? 'ascending' : 'descending') : 'none';
    const sortLabel = sorted && l.sort === 'DESC' ? 'Ordenar del más antiguo al más reciente' : 'Ordenar del más reciente al más antiguo';
    const rows = l.items
      .map((m) => `<tr>
          <td><button class="link code message-code" data-action="view" data-arg="${escapeHtml(m.code)}" ${disabled}>${escapeHtml(m.code)}</button></td>
          <td class="message-title"><strong>${escapeHtml(m.title)}</strong><span class="message-preview">${escapeHtml(m.content)}</span></td>
          <td>${escapeHtml(nameOf(m.functionality))}</td>
          <td>${(m.environments || []).map(environmentBadge).join('')}</td>
          <td>${statusBadge(m.status)}</td>
          <td class="date-cell">${escapeHtml(formatDate(m.updatedAt))}</td>
          <td><div class="actions-cell">
            <button class="icon-btn" data-action="view" data-arg="${escapeHtml(m.code)}" title="Ver" aria-label="Ver ${escapeHtml(m.code)}" ${disabled}>${ICON_EYE}</button>
            <button class="icon-btn edit" data-action="edit-msg" data-arg="${escapeHtml(m.code)}" title="Editar" aria-label="Editar ${escapeHtml(m.code)}" ${disabled}>${ICON_PENCIL}</button>
            <button class="icon-btn danger" data-action="delete-msg" data-arg="${escapeHtml(m.code)}" title="Eliminar" aria-label="Eliminar ${escapeHtml(m.code)}" ${disabled}>${ICON_TRASH}</button>
          </div></td>
        </tr>`)
      .join('');
    return `${l.loading ? '<div class="loading" role="status">Cargando mensajes…</div>' : ''}
      ${l.items.length
        ? `<div class="table-wrap" role="region" aria-label="Listado de mensajes" tabindex="0" aria-busy="${l.loading}"><table>
            <thead><tr><th scope="col">Código</th><th scope="col">Título y contenido</th><th scope="col">Funcionalidad</th><th scope="col">Ambientes</th><th scope="col">Estado</th>
            <th scope="col" aria-sort="${sort}"><button class="table-sort" data-action="sort-updated" aria-label="Última modificación: ${sortLabel}" title="${sortLabel}" ${disabled}>Última modificación ${sorted ? (l.sort === 'ASC' ? '↑' : '↓') : '↕'}</button></th><th scope="col">Acciones</th></tr></thead>
            <tbody>${rows}</tbody></table></div>`
        : !l.loading && !this.state.listError ? `<div class="empty-state">
            <span class="empty-mark" aria-hidden="true">${ICON_EYE}</span>
            <h3>${filtered ? 'No encontramos mensajes' : 'Tu primer mensaje está por llegar'}</h3>
            <p class="hint">${filtered ? 'Ajusta la búsqueda o cambia el ambiente de la cabecera para ver otros resultados.' : 'Todavía no hay mensajes en este ambiente. Crea uno o importa tu catálogo desde Excel.'}</p>
            <button data-action="${filtered ? 'clear-filters' : 'tab'}" ${filtered ? '' : 'data-arg="create"'}>${filtered ? 'Limpiar búsqueda' : '+ Crear mensaje'}</button>
          </div>` : ''}
      <div class="pager">
        <span>${l.totalItems} ${l.totalItems === 1 ? 'resultado' : 'resultados'}</span>
        <div class="pager-controls">
          <label class="page-size">Por página<select data-action="page-size" ${disabled}>${[...new Set([5, 10, 20, 50, l.size])].sort((a, b) => a - b).map((size) => `<option value="${size}" ${size === l.size ? 'selected' : ''}>${size}</option>`).join('')}</select></label>
          <button class="ghost small" data-action="page" data-arg="${l.page - 1}" aria-label="Página anterior" ${l.page <= 1 ? 'disabled' : disabled}>←</button>
          <span>Página ${l.page} de ${Math.max(1, l.totalPages)}</span>
          <button class="ghost small" data-action="page" data-arg="${l.page + 1}" aria-label="Página siguiente" ${l.page >= l.totalPages ? 'disabled' : disabled}>→</button>
        </div>
      </div>`;
  }

  options_(list, { selected = '' } = {}) {
    return list
      .map((x, i) => `<option value="${escapeHtml(x.id)}" ${(selected ? x.id === selected : i === 0) ? 'selected' : ''}>${escapeHtml(x.name)}</option>`)
      .join('');
  }

  renderEnvironmentOptions(selectedIds = []) {
    return `<div class="environment-options" role="group" aria-label="Ambientes del mensaje">${(this.state.context?.environments || [])
      .map((environment) => `<label class="check ${environmentTone(environment.name)} ${selectedIds.includes(environment.id) ? 'on' : ''}">
        <input type="checkbox" name="environmentIds" value="${escapeHtml(environment.id)}" ${selectedIds.includes(environment.id) ? 'checked' : ''} />
        <span>${escapeHtml(environment.name)}</span></label>`).join('')}</div>`;
  }

  renderCreate() {
    const c = this.state.catalogs;
    const ctx = this.state.context;
    const active = c.functionalities.filter((f) => functionalityActivity(f) === true);
    const noFunc = !active.length;
    return `${this.renderAlerts()}
      <div class="page-heading"><div><h3>Nuevo mensaje</h3>
      <p class="hint">Se crea en <b>${escapeHtml(ctx?.application)}</b>, en los ambientes que marques.</p></div></div>
      <div data-functionality-availability>${this.renderFunctionalityAvailability(noFunc)}</div>
      <form data-form="create" data-editor-key="${escapeHtml(this.appId)}:create">
        <fieldset ${this.state.busy ? 'disabled' : ''}>
        <section class="form-section"><h4>1. Ambientes</h4>
          ${this.renderEnvironmentOptions(ctx?.environmentId ? [ctx.environmentId] : [])}
          <p class="hint" style="margin-top:8px">Selecciona al menos uno. Un mismo mensaje puede estar en varios ambientes.</p>
        </section>
        <section class="form-section"><h4>2. Identificación y clasificación</h4>
        <div class="grid">
          <label>Código *
            <input name="code" required maxlength="504" placeholder="STOCKLOW" data-count="1-500" autocomplete="off" />
            <small data-counter-for="code">0/500 · se guardará como MSG_…</small>
          </label>
          <label>Funcionalidad *
            <select name="functionalityId" required ${noFunc ? 'disabled' : ''}>
              <option value="">Seleccionar…</option>${this.options_(active, { selected: active.length === 1 ? active[0].id : '-' })}
            </select>
          </label>
          <label>Tipo *<select name="typeId" required>${this.options_(c.types)}</select></label>
          <label>Categoría *<select name="categoryId" required>${this.options_(c.categories)}</select></label>
          <label>Estado *<select name="statusId" required>${this.options_(c.states)}</select></label>
        </div></section>
        <section class="form-section"><h4>3. Contenido del mensaje</h4><div class="grid">
          <label class="full"><span>Título * <small>(5 a 1000)</small></span>
            <input name="title" required minlength="5" maxlength="1000" data-count="5-1000" placeholder="Stock por debajo del mínimo" />
            <small data-counter-for="title">0/1000 caracteres</small>
          </label>
          <label class="full"><span>Contenido * <small>(5 a 2000). Puedes usar variables como {nombre}; la app las reemplaza.</small></span>
            <textarea name="content" required minlength="5" maxlength="2000" data-count="5-2000" placeholder="El producto {nombre} tiene solo {cantidad} unidades."></textarea>
            <small data-counter-for="content">0/2000 caracteres</small>
          </label>
        </div>
        </section>
        <div class="form-actions">
          <button type="button" class="ghost" data-action="tab" data-arg="list">Cancelar</button>
          <button type="submit" ${this.state.busy || noFunc ? 'disabled' : ''}>${this.state.busy ? 'Guardando…' : 'Crear mensaje'}</button>
        </div></fieldset>
      </form>`;
  }

  renderImport() {
    const s = this.state;
    const imp = s.importing || this.newImport();
    const ctx = s.context;
    const envs = ctx?.environments || [];
    const chosen = envs.filter((e) => imp.environmentIds.includes(e.id));
    const names = escapeHtml(chosen.map((e) => e.name).join(', '));
    const hasProduction = chosen.some((e) => isProduction(e.name));
    const steps = ['Archivo y ambientes', 'Validación', 'Resultado']
      .map((label, i) => `<li class="${imp.step === i + 1 ? 'on' : imp.step > i + 1 ? 'done' : ''}">${i + 1}. ${label}</li>`)
      .join('');
    const head = `<h3>Importar mensajes desde Excel</h3><ol class="steps">${steps}</ol>
      ${imp.error ? `<div class="alert err">${escapeHtml(imp.error)}</div>` : ''}`;

    if (imp.step === 3 && imp.receipt) {
      return `${head}
        <div class="alert ok"><b>${escapeHtml(imp.receipt.count)} ${imp.receipt.count === 1 ? 'mensaje importado' : 'mensajes importados'}</b> en ${names}.</div>
        <p class="hint">Se creó un único mensaje por código, enlazado a los ambientes del lote.
          Lote <code>${escapeHtml(String(imp.receipt.importId || '').slice(0, 8))}</code>.</p>
        <div class="between">
          <button class="ghost" data-action="import-new">Nueva importación</button>
          <button data-action="tab" data-arg="list">Ver mensajes</button>
        </div>`;
    }

    if (imp.step === 2 && imp.preview) {
      const rows = imp.preview.rows || [];
      const errorCount = rows.filter((r) => r.issues?.length).length;
      const total = rows.length;
      const fields = { code: 'Código', functionality: 'Funcionalidad', type: 'Tipo', category: 'Categoría', status: 'Estado', title: 'Título', content: 'Contenido' };
      const visible = imp.filter === 'errors' ? rows.filter((r) => r.issues?.length) : rows;
      const body = visible
        .map((r) => `<tr>
            <td>${escapeHtml(r.row?.rowNumber)}</td>
            <td><span class="code">${escapeHtml(r.normalizedCode || r.row?.code)}</span></td>
            <td>${escapeHtml(r.row?.functionality)}</td>
            <td>${escapeHtml(r.row?.title)}</td>
            <td>${r.issues?.length
              ? r.issues.map((i) => `<span class="issue"><b>${escapeHtml(fields[i.field] || i.field || '')}</b>: ${escapeHtml(i.message)}</span>`).join('')
              : '<span class="valid">Válido</span>'}</td>
          </tr>`)
        .join('');
      const blocked = s.busy || errorCount > 0 || !total || (hasProduction && !imp.productionConfirmed);
      return `${head}
        <div class="summary">
          <div><strong>${total}</strong><span>mensajes detectados</span></div>
          <div class="good"><strong>${total - errorCount}</strong><span>válidos</span></div>
          <div class="${errorCount ? 'bad' : ''}"><strong>${errorCount}</strong><span>con errores</span></div>
        </div>
        <div class="row">
          <button class="small ${imp.filter === 'all' ? '' : 'ghost'}" data-action="import-filter" data-arg="all">Todos</button>
          <button class="small ${imp.filter === 'errors' ? '' : 'ghost'}" data-action="import-filter" data-arg="errors">Con errores (${errorCount})</button>
          <span class="hint">La validación dura 30 minutos.</span>
        </div>
        <div class="table-wrap scroll"><table>
          <thead><tr><th>Fila</th><th>Código final</th><th>Funcionalidad</th><th>Título</th><th>Resultado</th></tr></thead>
          <tbody>${body || '<tr><td colspan="5">No hay filas con errores.</td></tr>'}</tbody>
        </table></div>
        <p class="hint" style="margin-top:10px">${errorCount
          ? 'Corrige las filas con errores en el Excel y vuelve a validarlo. No se ha guardado ningún mensaje.'
          : `Se ${total === 1 ? 'creará 1 mensaje' : `crearán ${total} mensajes`} en ${names}. Las referencias y los códigos se comprueban otra vez al confirmar.`}</p>
        ${hasProduction && !errorCount
          ? `<label class="check ${imp.productionConfirmed ? 'on' : ''}"><input type="checkbox" data-action="import-prod" ${imp.productionConfirmed ? 'checked' : ''} ${s.busy ? 'disabled' : ''} />
              Confirmo que deseo crear estos ${total} mensajes también en Produccion.</label>`
          : ''}
        <div class="between">
          <div class="row" style="margin:0">
            <button class="ghost" data-action="import-back" ${s.busy || imp.unknownOutcome ? 'disabled' : ''}>Cambiar archivo o ambientes</button>
            ${errorCount ? `<button class="ghost" data-action="import-errors" ${imp.downloading ? 'disabled' : ''}>${imp.downloading ? 'Descargando…' : 'Descargar errores'}</button>` : ''}
          </div>
          <button data-action="import-confirm" ${blocked ? 'disabled' : ''}>${s.busy ? 'Importando…' : imp.unknownOutcome ? 'Reintentar confirmación' : `Importar ${total} ${total === 1 ? 'mensaje' : 'mensajes'}`}</button>
        </div>`;
    }

    const file = imp.file;
    return `${head}
      <p class="hint">Descarga la plantilla de <b>${escapeHtml(ctx?.application)}</b>, llena solo la hoja <b>Mensajes</b>
        (una fila por mensaje) y súbela. Se revisa todo el archivo antes de guardar: no se crea ningún mensaje hasta que confirmes.</p>
      <div class="hint" style="font-weight:600;color:var(--ink);margin-bottom:6px">¿En qué ambientes quedarán los mensajes? *</div>
      <div class="checks">${envs
        .map((e) => `<label class="check ${imp.environmentIds.includes(e.id) ? 'on' : ''}"><input type="checkbox" data-action="import-env" value="${escapeHtml(e.id)}" ${imp.environmentIds.includes(e.id) ? 'checked' : ''} ${s.busy ? 'disabled' : ''} />${escapeHtml(e.name)}</label>`)
        .join('')}</div>
      <p class="hint" style="margin-top:6px">Se aplican a todas las filas; no van en el Excel.</p>
      <div class="drop">
        <div><strong>${file ? escapeHtml(file.name) : 'Arrastra aquí tu archivo Excel'}</strong>
          <span class="hint">${file ? `${(file.size / 1024).toFixed(1)} KB · listo para validar` : '.xlsx · hasta 500 mensajes · máximo 5 MB'}</span></div>
        <button type="button" class="ghost" data-action="import-pick" ${s.busy ? 'disabled' : ''}>${file ? 'Cambiar archivo' : 'Elegir archivo'}</button>
        <input type="file" data-action="import-file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
      </div>
      ${hasProduction ? '<div class="alert info">El lote incluye Produccion: deberás confirmarlo antes de guardar.</div>' : ''}
      <div class="alert info">Solo se crean mensajes nuevos: no se sobrescriben códigos existentes ni se crean funcionalidades
        (créalas antes en <button class="link small" data-action="tab" data-arg="config">Configuración</button>).</div>
      <div class="between">
        <button class="ghost" data-action="import-template" ${imp.downloading ? 'disabled' : ''}>${imp.downloading ? 'Descargando…' : 'Descargar plantilla'}</button>
        <button data-action="import-validate" ${s.busy || !file || !imp.environmentIds.length ? 'disabled' : ''}>${s.busy ? 'Validando…' : 'Validar archivo'}</button>
      </div>`;
  }

  renderEdit() {
    const s = this.state;
    const m = s.editing;
    const c = s.catalogs;
    if (!m) return '<div class="alert info">Sin mensaje seleccionado para editar.</div>';
    return `${this.renderAlerts()}
      <div class="page-heading"><div><h3>Editar mensaje</h3><p class="hint"><code>${escapeHtml(m.code)}</code> · Actualiza el contenido, la clasificación y sus ambientes.</p></div></div>
      <form data-form="edit" data-editor-key="${escapeHtml(this.appId)}:edit:${escapeHtml(m.code)}">
        <fieldset ${s.busy ? 'disabled' : ''}>
        <section class="form-section"><h4>1. Clasificación</h4>
        <div class="grid">
          <label>Tipo *<select name="typeId" required><option value="">Seleccionar…</option>${this.options_(c.types, { selected: m.typeId || '-' })}</select></label>
          <label>Categoría *<select name="categoryId" required><option value="">Seleccionar…</option>${this.options_(c.categories, { selected: m.categoryId || '-' })}</select></label>
          <label>Estado *<select name="statusId" required><option value="">Seleccionar…</option>${this.options_(c.states, { selected: m.statusId || '-' })}</select></label>
          <label>Funcionalidad *
            <select name="functionalityId" required>
              <option value="">Seleccionar…</option>
              ${this.options_(c.functionalities, { selected: m.functionalityId || '-' })}
            </select>
          </label>
        </div></section>
        <section class="form-section"><h4>2. Contenido del mensaje</h4><div class="grid">
          <label class="full"><span>Título * <small>(5 a 1000)</small></span>
            <input name="title" required minlength="5" maxlength="1000" data-count="5-1000" value="${escapeHtml(m.title)}" />
            <small data-counter-for="title">${m.title.trim().length}/1000 caracteres</small>
          </label>
          <label class="full"><span>Contenido * <small>(5 a 2000)</small></span>
            <textarea name="content" required minlength="5" maxlength="2000" data-count="5-2000">${escapeHtml(m.content)}</textarea>
            <small data-counter-for="content">${m.content.trim().length}/2000 caracteres</small>
          </label>
        </div>
        </section>
        <section class="form-section"><h4>3. Ambientes</h4>
          ${this.renderEnvironmentOptions(m.environmentIds)}
          <p class="hint" style="margin-top:8px">Al guardar se reemplazan los ambientes actuales por los seleccionados. Elige al menos uno.</p>
        </section>
        <div class="form-actions">
          <button type="button" class="ghost" data-action="tab" data-arg="list">Cancelar</button>
          <button type="submit" ${s.busy ? 'disabled' : ''}>${s.busy ? 'Guardando…' : 'Guardar cambios'}</button>
        </div></fieldset>
      </form>`;
  }

  renderDetail() {
    const s = this.state;
    const m = s.detail;
    const cv = s.consumerView;
    const tr = s.translation;
    return `${this.renderAlerts()}
      <form class="row" data-form="search-detail">
        <input name="code" placeholder="Código del mensaje (ej. MSG_STOCKLOW)" value="${escapeHtml(m?.code || '')}" />
        <button type="submit" class="ghost">Consultar</button>
      </form>
      ${s.busy && !m ? '<div class="loading">Consultando…</div>' : ''}
      ${s.detailError ? `<div class="alert err">${escapeHtml(s.detailError)}</div>` : ''}
      ${m ? `<div class="detail">
          <dl>
            <dt>Código</dt><dd class="code">${escapeHtml(m.code)}</dd>
            <dt>Título</dt><dd>${escapeHtml(m.title)}</dd>
            <dt>Contenido</dt><dd>${escapeHtml(m.content)}</dd>
            <dt>Tipo</dt><dd>${escapeHtml(nameOf(m.type))}</dd>
            <dt>Categoría</dt><dd>${escapeHtml(nameOf(m.category))}</dd>
            <dt>Funcionalidad</dt><dd>${escapeHtml(nameOf(m.functionality))}</dd>
            <dt>Estado</dt><dd>${statusBadge(m.status)}</dd>
            <dt>Ambientes</dt><dd>${(m.environments || []).map(environmentBadge).join('')}</dd>
            <dt>Creación</dt><dd>${escapeHtml(formatDate(m.createdAt))}</dd>
            <dt>Última modificación</dt><dd>${escapeHtml(formatDate(m.updatedAt))}</dd>
          </dl>
          <h4>Uso desde tu aplicación</h4>
          <pre>const m = await mensajes.get('${escapeHtml(m.code)}');
// m.title, m.content</pre>
          <div class="row" style="margin:6px 0 0">
            <button class="ghost small" data-action="consumer-view" ${s.busy || !s.context?.environmentId ? 'disabled' : ''}>${s.context?.environmentId ? `Probar el consumo con sesión en ${escapeHtml(s.context.environment)}` : 'Selecciona un ambiente en la cabecera para consultar el mensaje'}</button>
          </div>
          ${cv ? (cv.ok
            ? `<pre>${escapeHtml(JSON.stringify(cv.data, null, 2))}</pre>`
            : `<div class="alert err">La ruta de consumo respondió ${escapeHtml(cv.status || '')}: ${escapeHtml(cv.error)}</div>`) : ''}
          <h4>Traducir</h4>
          <form class="row" data-form="translate">
            <select name="targetLanguage" style="max-width:200px">${this.options_(TRANSLATION_LANGUAGES)}</select>
            <button type="submit" class="ghost small" ${s.busy ? 'disabled' : ''}>Traducir</button>
          </form>
          ${tr ? (tr.ok
            ? `<div class="alert info"><b>${escapeHtml(tr.data?.translatedTitle || tr.data?.title)}</b><br>${escapeHtml(tr.data?.translatedContent || tr.data?.content)}
                <br><small>${escapeHtml(tr.data?.translationProvider || '')} ${escapeHtml(tr.data?.translationModel || '')}</small></div>`
            : `<div class="alert err">${escapeHtml(tr.error)}</div>`) : ''}
        </div>` : (!s.busy && !s.detailError ? '<div class="alert info">Escribe un código o elige "Ver" en la lista de mensajes.</div>' : '')}`;
  }

  renderConfig() {
    const s = this.state;
    return `${this.renderAlerts()}
      <h3>Funcionalidades de ${escapeHtml(s.context?.application)}</h3>
      <p class="hint">Cada mensaje pertenece a una funcionalidad (p. ej. "Inventario", "Ventas").</p>
      <p class="hint">Al inactivar una funcionalidad, todos sus mensajes pasan a inactivos en todos los ambientes. Al activarla, los mensajes no se reactivan automáticamente.</p>
      <div data-functionalities>${this.renderFunctionalityList()}</div>
      <form data-form="functionality" class="grid functionality-form">
        <label>Nueva funcionalidad<input name="name" maxlength="50" placeholder="Inventario" /></label>
        <label>Estado<select name="stateId">${this.options_(this.seeds.functionalityStates)}</select></label>
        <div><button type="submit" ${s.busy ? 'disabled' : ''}>Crear funcionalidad</button></div>
      </form>`;
  }

  renderFunctionalityAvailability(unavailable) {
    return unavailable ? `<div class="alert info">Esta aplicación no tiene funcionalidades activas. Crea o activa una en
      <button type="button" class="link small" data-action="tab" data-arg="config">Configuración</button> para poder registrar mensajes.</div>` : '';
  }

  renderFunctionalityList() {
    const functions = this.state.catalogs.functionalities;
    if (!functions.length) return '<div class="alert info">Aún no hay funcionalidades.</div>';
    return `<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${functions.map((item) => {
      const active = functionalityActivity(item);
      const action = active ? 'Inactivar' : 'Activar';
      return `<tr><td>${escapeHtml(item.name)}</td><td><span class="pill ${active === true ? 'accent' : ''}">${active === null ? 'Estado no disponible' : active ? 'Activo' : 'Inactivo'}</span></td>
        <td>${active === null ? '' : `<button type="button" class="ghost small" data-action="toggle-functionality" data-arg="${escapeHtml(item.id)}" aria-label="${escapeHtml(`${action} ${item.name}`)}" ${this.state.busy ? 'disabled' : ''}>${action}</button>`}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
}

/**
 * Monta el microfrontend de administración dentro de `element`.
 *
 *   const widget = mount(document.querySelector('#mensajes'), {
 *     apiBaseUrl: '/messageucolab',            // proxy de tu front hacia MessageUcoLab
 *     applicationName: 'Asistencia UCO',       // opcional: fija la aplicación
 *     environmentName: 'Develop',              // opcional: ambiente inicial
 *     loginUrl: 'http://localhost:5173/login', // a dónde ir si la sesión vence
 *     theme: 'auto'                            // o { accent: '#2563eb', radius: '12px', ... }
 *   });
 *   widget.unmount();
 */
export function mount(element, options = {}) {
  if (!element) throw new Error('mount(): el contenedor no existe en el DOM.');
  if (element.__messageucolab) element.__messageucolab.destroy();
  const widget = new AdminWidget(element, options);
  element.__messageucolab = widget;
  return {
    unmount: () => {
      widget.destroy();
      delete element.__messageucolab;
    },
    refresh: () => widget.loadMessages(1),
    reload: () => widget.start(),
    reconnectEvents: () => widget.startRealtime(),
    get eventsStatus() {
      return widget.state.eventsStatus;
    },
    /** Vuelve a leer el estilo del host (por ejemplo, después de cambiar de tema). */
    refreshTheme: () => widget.applyTheme(),
    get theme() {
      return widget.theme;
    },
    get context() {
      return widget.state.context;
    }
  };
}

export function unmount(element) {
  if (element && element.__messageucolab) {
    element.__messageucolab.destroy();
    delete element.__messageucolab;
  }
}

/* ---------- Custom element: <messageucolab-admin> ---------- */

if (typeof window !== 'undefined' && window.customElements && !window.customElements.get('messageucolab-admin')) {
  class MessageUcoLabAdminElement extends HTMLElement {
    static get observedAttributes() {
      return ['api-base-url', 'application-name', 'environment-name', 'login-url', 'theme', 'accent', 'radius', 'lock-context', 'lock-environment'];
    }

    connectedCallback() {
      this._mount();
    }

    disconnectedCallback() {
      unmount(this);
    }

    attributeChangedCallback() {
      if (this.isConnected && this._mounted) this._mount();
    }

    /** Permite pasar opciones avanzadas (onEvent, theme…) por propiedad. */
    set options(value) {
      this._options = value || {};
      if (this.isConnected) this._mount();
    }

    get options() {
      return this._options || {};
    }

    _mount() {
      const attr = (name) => this.getAttribute(name) || undefined;
      const overrides = {};
      if (attr('accent')) overrides.accent = attr('accent');
      if (attr('radius')) overrides.radius = attr('radius');
      const theme = attr('theme') === 'none' ? 'none' : Object.keys(overrides).length ? overrides : 'auto';
      mount(this, {
        apiBaseUrl: attr('api-base-url'),
        applicationName: attr('application-name'),
        environmentName: attr('environment-name'),
        loginUrl: attr('login-url'),
        lockContext: this.hasAttribute('lock-context'),
        lockEnvironment: this.hasAttribute('lock-environment'),
        theme,
        ...this.options
      });
      this._mounted = true;
    }
  }
  window.customElements.define('messageucolab-admin', MessageUcoLabAdminElement);
}

export { VERSION };
export default { mount, unmount, createMessageClient, createApi, resolveWorkspace, ensureContext, resolveTheme, toMessageCode, formatMessage, VERSION };
