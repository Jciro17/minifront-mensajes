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
 * mensajes usa la ruta pública /public/messages y no necesita sesión. El widget no maneja tokens.
 *
 * Estilo adaptativo: por defecto (theme: 'auto') toma la tipografía, los colores de texto
 * y fondo, el color principal y el redondeo de la aplicación que lo monta. Ver resolveTheme().
 *
 * No tiene dependencias: funciona en React, Vue, Angular o HTML plano.
 * Los estilos viven en un Shadow DOM, así que no chocan con los del host.
 */

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

// El catálogo pasó a español; se aceptan ambos nombres mientras queden datos antiguos.
const isActiveState = (name) => sameText(name, 'Activo') || sameText(name, 'Active');
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
    listMessages: async (applicationId, { page = 1, size = 10, environmentIds = [], code = '' } = {}) => {
      const query = new URLSearchParams({ page, size, sort: 'ASC', columnSort: 'code' });
      if (environmentIds.length) query.set('filterEnvironments', environmentIds.join(','));
      if (code) query.set('filterCode', code);
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
    // Consumo público: sin sesión; sin idioma devuelve el texto original.
    consumerMessage: (applicationId, environmentId, code, language = '') =>
      request(`/public/messages/${encodeURIComponent(toMessageCode(code))}${language ? `?language=${encodeURIComponent(language)}` : ''}`,
        { applicationId, environmentId, timeout: language ? Math.max(timeoutMs, 60000) : timeoutMs }),
    publicMessages: (applicationId, environmentId) => request('/public/messages', { applicationId, environmentId }),
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
        applicationId
      });
      return Array.isArray(data) ? data[0] ?? null : data;
    },
    createApplication: (payload) => request('/application', { method: 'POST', body: payload }),
    createFunctionality: (payload) => request('/application/functionality', { method: 'POST', body: payload })
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
 *     applicationId: '...', environmentId: '...',        // con los IDs no hace falta sesión
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
}
.top { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--line); }
.brand { display: flex; align-items: center; gap: 10px; margin-right: auto; min-width: 0; }
.mark { width: 30px; height: 30px; border-radius: calc(var(--radius) - 2px); background: var(--accent); color: var(--on-accent); display: grid; place-items: center; font-weight: 700; }
.brand strong { display: block; font-size: 1.07em; }
.brand small { color: var(--muted); font-size: .86em; }
.ctx { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-width: 0; max-width: 100%; font-size: .86em; color: var(--muted); background: var(--panel); border: 1px solid var(--line); border-radius: 999px; padding: 4px 6px 4px 12px; }
.ctx b { color: var(--ink); font-weight: 600; }
.ctx select { width: auto; padding: 2px 6px; font-size: 1em; border-radius: 999px; }
.tabs { display: flex; gap: 2px; padding: 0 12px; border-bottom: 1px solid var(--line); overflow-x: auto; }
.tabs button { background: none; border: 0; border-bottom: 2px solid transparent; border-radius: 0; color: var(--muted); padding: 10px 12px; font-weight: 600; white-space: nowrap; }
.tabs button.on { color: var(--accent); border-bottom-color: var(--accent); }
.body { padding: 18px; }
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
input, select, textarea {
  font: inherit; color: var(--ink); width: 100%; padding: 8px 10px; background: var(--field);
  border: 1px solid var(--line); border-radius: calc(var(--radius) - 3px);
}
input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent-soft); border-color: var(--accent); }
textarea { resize: vertical; min-height: 70px; }
label { display: grid; gap: 4px; align-content: start; font-size: .93em; font-weight: 600; min-width: 0; }
label small { font-weight: 400; color: var(--muted); }
label small.bad { color: var(--danger); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
.full { grid-column: 1 / -1; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.row input { flex: 1 1 220px; width: auto; }
.checks { display: flex; flex-wrap: wrap; gap: 8px; }
.check { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; padding: 6px 10px; border: 1px solid var(--line); border-radius: calc(var(--radius) - 3px); background: var(--field); cursor: pointer; }
.check input { width: auto; accent-color: var(--accent); }
.check.on { border-color: var(--accent-line); background: var(--accent-soft); }
.table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: calc(var(--radius) - 3px); }
table { width: 100%; border-collapse: collapse; font-size: .93em; }
th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { background: var(--panel); font-size: .86em; color: var(--muted); font-weight: 600; }
tr:last-child td { border-bottom: 0; }
code, .code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .86em; }
.pill { display: inline-block; font-size: .79em; padding: 2px 8px; margin: 0 4px 4px 0; border-radius: 999px; background: var(--panel); border: 1px solid var(--line); color: var(--muted); }
.pill.accent { background: var(--accent-soft); border-color: var(--accent-line); color: var(--ink); }
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
.pager { display: flex; align-items: center; gap: 10px; justify-content: flex-end; margin-top: 12px; font-size: .93em; color: var(--muted); }
.loading { color: var(--muted); padding: 18px 0; }
.foot { padding: 8px 18px; border-top: 1px solid var(--line); font-size: .79em; color: var(--muted); display: flex; justify-content: space-between; gap: 8px; }
.actions-cell { display: flex; gap: 2px; align-items: center; }
.icon-btn { background: none; border: 0; cursor: pointer; padding: 4px 6px; border-radius: 4px; color: var(--muted); line-height: 1; }
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
@media (max-width: 560px) { .detail dl { grid-template-columns: 1fr; } .top { padding: 12px; } .body { padding: 12px; } }
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
        if (typeof this.options.onUnauthorized === 'function') this.options.onUnauthorized(error);
      }
    });
    this.root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    this.state = {
      view: 'loading',
      tab: 'list',
      error: '',
      notice: '',
      context: null,
      applications: [],
      catalogs: { types: [], categories: [], states: [], functionalities: [] },
      list: { items: [], page: 1, size: options.pageSize || 10, totalItems: 0, totalPages: 0, loading: false, query: '' },
      detail: null,
      detailError: '',
      consumerView: null,
      translation: null,
      editing: null,
      importing: null,
      busy: false
    };
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
    this.root.removeEventListener('click', this.onClick);
    this.root.removeEventListener('submit', this.onSubmit);
    this.root.removeEventListener('input', this.onInput);
    this.root.removeEventListener('change', this.onChange);
    for (const type of ['dragover', 'dragleave', 'drop']) this.root.removeEventListener(type, this.onDrag);
    this.themeObserver?.disconnect();
    this.schemeQuery?.removeEventListener?.('change', this.schemeRefresh);
    this.root.innerHTML = '';
    this.destroyed = true;
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
      this.set({ view: 'session' });
    }
    return message;
  }

  get appId() {
    return this.state.context?.applicationId || '';
  }

  async start() {
    this.sessionLost = false;
    this.set({ view: 'loading', error: '' });
    const { applicationName, environmentName } = this.options;
    try {
      const apps = await this.api.sessionApplications();
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
      const message = this.fail(error, 'start');
      if (error.status !== 401) this.set({ view: 'fatal', error: message });
    }
  }

  async useApplication(app, environmentName = this.options.environmentName) {
    this.set({ view: 'loading', error: '' });
    try {
      const ctx = await workspaceFor(this.api, app, environmentName);
      this.state.context = ctx;
      this.state.importing = null; // la plantilla es de una sola aplicación
      this.emit('context', ctx);
      await Promise.all([this.loadCatalogs(), this.loadMessages(1)]);
      if (this.state.view !== 'session') this.set({ view: 'ready' });
    } catch (error) {
      const message = this.fail(error, 'context');
      if (error.status !== 401) this.set({ view: 'fatal', error: message });
    }
  }

  async loadCatalogs() {
    const appId = this.appId;
    const settle = (p) => p.catch(() => []);
    const [types, categories, states, functionalities] = await Promise.all([
      settle(this.api.messageTypes()),
      settle(this.api.messageCategories()),
      settle(this.api.messageStates()),
      appId ? settle(this.api.functionalities(appId)) : Promise.resolve([])
    ]);
    this.state.catalogs = { types, categories, states, functionalities };
  }

  async loadMessages(page = this.state.list.page, code = '') {
    const list = this.state.list;
    const envId = this.state.context?.environmentId;
    this.set({ list: { ...list, loading: true, query: code }, notice: code ? this.state.notice : '' });
    try {
      const res = await this.api.listMessages(this.appId, {
        page,
        size: list.size,
        environmentIds: envId ? [envId] : [],
        code: code ? toMessageCode(code) : ''
      });
      this.set({ list: { ...this.state.list, ...res, loading: false, query: code }, error: '' });
    } catch (error) {
      this.set({ list: { ...this.state.list, items: [], loading: false }, error: this.fail(error, 'list') });
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
    const len = target.value.trim().length;
    out.textContent = target.name === 'code'
      ? `${len}/${max} · se guardará como ${toMessageCode(target.value) || 'MSG_…'}`
      : `${len}/${max} caracteres`;
    out.classList.toggle('bad', len > 0 && (len < min || len > max));
  }

  async onChange(event) {
    const target = event.target;
    if (target?.dataset?.action === 'environment') {
      const env = this.state.context.environments.find((e) => e.id === target.value);
      if (!env) return;
      this.state.context = { ...this.state.context, environmentId: env.id, environment: env.name };
      this.emit('context', this.state.context);
      this.state.consumerView = null;
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
    if (!el || el.tagName === 'SELECT') return;
    const { action, arg } = el.dataset;
    switch (action) {
      case 'tab':
        this.set({
          tab: arg, notice: '', error: '',
          ...(arg === 'import' && !this.state.importing ? { importing: this.newImport() } : {})
        });
        if (arg === 'list' && !this.state.list.items.length) this.loadMessages(1);
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
      case 'view':
        await this.openDetail(arg);
        break;
      case 'pick-app': {
        const app = this.state.applications[Number(arg)];
        if (app) await this.useApplication(app);
        break;
      }
      case 'change-app':
        this.set({ view: 'applications', error: '' });
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
          typeId: m.typeId || c.types.find((t) => sameText(t.name, nameOf(m.type)))?.id || c.types[0]?.id || '',
          categoryId: m.categoryId || c.categories.find((t) => sameText(t.name, nameOf(m.category)))?.id || c.categories[0]?.id || '',
          statusId: m.statusId || c.states.find((t) => sameText(t.name, nameOf(m.status)))?.id || c.states[0]?.id || '',
          functionalityId: m.functionalityId || c.functionalities.find((f) => sameText(f.name, nameOf(m.functionality)))?.id || ''
        };
        this.set({ tab: 'edit', editing, error: '', notice: '' });
        break;
      }
      case 'delete-msg': {
        if (!confirm(`¿Eliminar el mensaje "${arg}"? Esta acción no se puede deshacer.`)) return;
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
        if (!code || !ctx) return;
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
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const kind = form.dataset.form;

    if (kind === 'search') return this.loadMessages(1, String(data.q || '').trim());
    if (kind === 'search-detail') return data.code && data.code.trim() ? this.openDetail(data.code) : undefined;

    if (kind === 'create') {
      const suffix = String(data.code || '').trim().toUpperCase().replace(/^MSG_+/, '');
      const environmentIds = formData.getAll('environmentIds');
      const problems = [];
      if (!suffix || suffix.length > 10 || !/^[A-Z0-9 ]+$/.test(suffix))
        problems.push('El código acepta hasta 10 letras, números o espacios (sin MSG_). Ej.: STOCKLOW');
      if (!environmentIds.length) problems.push('Elige al menos un ambiente.');
      if (data.title.trim().length < 10 || data.title.trim().length > 50)
        problems.push('El título debe tener entre 10 y 50 caracteres.');
      if (data.content.trim().length < 10 || data.content.trim().length > 100)
        problems.push('El contenido debe tener entre 10 y 100 caracteres.');
      if (!data.functionalityId) problems.push('Selecciona una funcionalidad (créala en Configuración si no hay).');
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
      const problems = [];
      if (data.title.trim().length < 10 || data.title.trim().length > 50)
        problems.push('El título debe tener entre 10 y 50 caracteres.');
      if (data.content.trim().length < 10 || data.content.trim().length > 100)
        problems.push('El contenido debe tener entre 10 y 100 caracteres.');
      if (!data.functionalityId) problems.push('Selecciona una funcionalidad.');
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
          functionalityId: data.functionalityId
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

    if (kind === 'application') {
      if (!data.name.trim()) return this.set({ error: 'El nombre de la aplicación es obligatorio.' });
      this.set({ busy: true, error: '' });
      try {
        await this.api.createApplication({
          name: data.name.trim().slice(0, 50),
          organizationId: this.state.context.organizationId,
          languageId: data.languageId,
          stateId: data.stateId
        });
        this.emit('application-created', { name: data.name.trim() });
        this.state.applications = await this.api.sessionApplications();
        this.set({
          busy: false,
          notice: `Aplicación "${data.name.trim()}" creada con sus ambientes Develop, Testing y Produccion.`
        });
      } catch (error) {
        this.set({ busy: false, error: this.fail(error, 'application') });
      }
    }
  }

  /* ---------- render ---------- */

  render() {
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
        <div class="body">${this.renderBody()}</div>
        <div class="foot"><span>MessageUcoLab widget v${VERSION}</span><span>${escapeHtml(trimSlash(this.options.apiBaseUrl))}</span></div>
      </div>`;
  }

  renderContext(ctx) {
    const envs = ctx.environments || [];
    const envControl = this.options.lockEnvironment || envs.length < 2
      ? `<b>${escapeHtml(ctx.environment)}</b>`
      : `<select data-action="environment" aria-label="Ambiente">${envs
          .map((e) => `<option value="${escapeHtml(e.id)}" ${e.id === ctx.environmentId ? 'selected' : ''}>${escapeHtml(e.name)}</option>`)
          .join('')}</select>`;
    return `<div class="ctx" title="Organización / Aplicación / Ambiente">
        ${escapeHtml(ctx.organization)} / <b>${escapeHtml(ctx.application)}</b> / ${envControl}
        ${this.options.lockContext || this.state.applications.length < 2 ? '' : '<button class="link small" data-action="change-app">Cambiar</button>'}
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
    return `<nav class="tabs">${tabs
      .map(([id, label]) => `<button class="${this.state.tab === id ? 'on' : ''}" data-action="tab" data-arg="${id}">${label}</button>`)
      .join('')}</nav>`;
  }

  renderAlerts() {
    const s = this.state;
    return `${s.error ? `<div class="alert err">${escapeHtml(s.error)}</div>` : ''}${
      s.notice ? `<div class="alert ok">${escapeHtml(s.notice)}</div>` : ''
    }`;
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
    const rows = l.items
      .map((m) => `<tr>
          <td><span class="code">${escapeHtml(m.code)}</span></td>
          <td>${escapeHtml(m.title)}</td>
          <td>${escapeHtml(m.content)}</td>
          <td>${escapeHtml(nameOf(m.functionality))}</td>
          <td>${(m.environments || []).map((e) => `<span class="pill">${escapeHtml(nameOf(e))}</span>`).join('')}</td>
          <td><span class="pill ${isActiveState(nameOf(m.status)) ? 'accent' : ''}">${escapeHtml(nameOf(m.status))}</span></td>
          <td><div class="actions-cell">
            <button class="icon-btn" data-action="view" data-arg="${escapeHtml(m.code)}" title="Ver">${ICON_EYE}</button>
            <button class="icon-btn edit" data-action="edit-msg" data-arg="${escapeHtml(m.code)}" title="Editar">${ICON_PENCIL}</button>
            <button class="icon-btn danger" data-action="delete-msg" data-arg="${escapeHtml(m.code)}" title="Eliminar">${ICON_TRASH}</button>
          </div></td>
        </tr>`)
      .join('');
    return `${this.renderAlerts()}
      <form class="row" data-form="search">
        <input name="q" placeholder="Buscar por código (ej. STOCKLOW o MSG_STOCKLOW)" value="${escapeHtml(l.query)}" />
        <button type="submit" class="ghost">Buscar</button>
        <button type="button" class="ghost" data-action="refresh">${l.loading ? 'Cargando…' : 'Actualizar'}</button>
        <button type="button" data-action="tab" data-arg="create">+ Nuevo</button>
      </form>
      ${l.loading && !l.items.length ? '<div class="loading">Cargando mensajes…</div>' : ''}
      ${l.items.length
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Código</th><th>Título</th><th>Contenido</th><th>Funcionalidad</th><th>Ambientes</th><th>Estado</th><th></th></tr></thead>
            <tbody>${rows}</tbody></table></div>`
        : !l.loading ? '<div class="alert info">Esta aplicación aún no tiene mensajes en este ambiente.</div>' : ''}
      ${l.totalPages > 1
        ? `<div class="pager">
            <button class="ghost small" data-action="page" data-arg="${l.page - 1}" ${l.page <= 1 ? 'disabled' : ''}>← Anterior</button>
            <span>Página ${l.page} de ${l.totalPages} · ${l.totalItems} mensajes</span>
            <button class="ghost small" data-action="page" data-arg="${l.page + 1}" ${l.page >= l.totalPages ? 'disabled' : ''}>Siguiente →</button>
          </div>`
        : ''}`;
  }

  options_(list, { selected = '' } = {}) {
    return list
      .map((x, i) => `<option value="${escapeHtml(x.id)}" ${(selected ? x.id === selected : i === 0) ? 'selected' : ''}>${escapeHtml(x.name)}</option>`)
      .join('');
  }

  renderCreate() {
    const c = this.state.catalogs;
    const ctx = this.state.context;
    const active = c.functionalities.filter((f) => f.active !== false);
    const noFunc = !active.length;
    return `${this.renderAlerts()}
      <h3>Nuevo mensaje</h3>
      <p class="hint">Se crea en <b>${escapeHtml(ctx?.application)}</b>, en los ambientes que marques.</p>
      ${noFunc ? `<div class="alert info">Esta aplicación no tiene funcionalidades activas. Crea una en
        <button class="link small" data-action="tab" data-arg="config">Configuración</button> para poder registrar mensajes.</div>` : ''}
      <form data-form="create">
        <div class="grid">
          <div class="full"><label>Ambientes *</label>
            <div class="checks">${(ctx?.environments || [])
              .map((e) => `<label class="check ${e.id === ctx.environmentId ? 'on' : ''}"><input type="checkbox" name="environmentIds" value="${escapeHtml(e.id)}" ${e.id === ctx.environmentId ? 'checked' : ''} />${escapeHtml(e.name)}</label>`)
              .join('')}</div>
          </div>
          <label>Código *
            <input name="code" maxlength="14" placeholder="STOCKLOW" data-count="1-10" autocomplete="off" />
            <small data-counter-for="code">0/10 · se guardará como MSG_…</small>
          </label>
          <label>Funcionalidad *
            <select name="functionalityId" ${noFunc ? 'disabled' : ''}>
              <option value="">Seleccionar…</option>${this.options_(active, { selected: active.length === 1 ? active[0].id : '-' })}
            </select>
          </label>
          <label>Tipo *<select name="typeId">${this.options_(c.types)}</select></label>
          <label>Categoría *<select name="categoryId">${this.options_(c.categories)}</select></label>
          <label>Estado *<select name="statusId">${this.options_(c.states)}</select></label>
          <label class="full"><span>Título * <small>(10 a 50)</small></span>
            <input name="title" maxlength="50" data-count="10-50" placeholder="Stock por debajo del mínimo" />
            <small data-counter-for="title">0/50 caracteres</small>
          </label>
          <label class="full"><span>Contenido * <small>(10 a 100). Puedes usar variables como {nombre}; la app las reemplaza.</small></span>
            <textarea name="content" maxlength="100" data-count="10-100" placeholder="El producto {nombre} tiene solo {cantidad} unidades."></textarea>
            <small data-counter-for="content">0/100 caracteres</small>
          </label>
        </div>
        <div class="row" style="margin-top:14px">
          <button type="button" class="ghost" data-action="tab" data-arg="list">Cancelar</button>
          <button type="submit" ${this.state.busy ? 'disabled' : ''}>${this.state.busy ? 'Guardando…' : 'Crear mensaje'}</button>
        </div>
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
      <h3>Editar — <code>${escapeHtml(m.code)}</code></h3>
      <form data-form="edit">
        <div class="grid">
          <label>Tipo *<select name="typeId">${this.options_(c.types, { selected: m.typeId })}</select></label>
          <label>Categoría *<select name="categoryId">${this.options_(c.categories, { selected: m.categoryId })}</select></label>
          <label>Estado *<select name="statusId">${this.options_(c.states, { selected: m.statusId })}</select></label>
          <label>Funcionalidad *
            <select name="functionalityId">
              <option value="">Seleccionar…</option>
              ${this.options_(c.functionalities, { selected: m.functionalityId })}
            </select>
          </label>
          <label class="full"><span>Título * <small>(10 a 50)</small></span>
            <input name="title" maxlength="50" value="${escapeHtml(m.title)}" />
          </label>
          <label class="full"><span>Contenido * <small>(10 a 100)</small></span>
            <textarea name="content" maxlength="100">${escapeHtml(m.content)}</textarea>
          </label>
        </div>
        <div class="row" style="margin-top:14px">
          <button type="button" class="ghost" data-action="tab" data-arg="list">Cancelar</button>
          <button type="submit" ${s.busy ? 'disabled' : ''}>${s.busy ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
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
            <dt>Estado</dt><dd>${escapeHtml(nameOf(m.status))}</dd>
            <dt>Ambientes</dt><dd>${(m.environments || []).map((e) => `<span class="pill">${escapeHtml(nameOf(e))}</span>`).join('')}</dd>
          </dl>
          <h4>Uso desde tu aplicación</h4>
          <pre>const m = await mensajes.get('${escapeHtml(m.code)}');
// m.title, m.content</pre>
          <div class="row" style="margin:6px 0 0">
            <button class="ghost small" data-action="consumer-view" ${s.busy ? 'disabled' : ''}>Probar la ruta pública en ${escapeHtml(s.context?.environment || '')}</button>
          </div>
          ${cv ? (cv.ok
            ? `<pre>${escapeHtml(JSON.stringify(cv.data, null, 2))}</pre>`
            : `<div class="alert err">La ruta pública respondió ${escapeHtml(cv.status || '')}: ${escapeHtml(cv.error)}</div>`) : ''}
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
    const funcs = s.catalogs.functionalities;
    return `${this.renderAlerts()}
      <h3>Funcionalidades de ${escapeHtml(s.context?.application)}</h3>
      <p class="hint">Cada mensaje pertenece a una funcionalidad (p. ej. "Inventario", "Ventas").</p>
      ${funcs.length
        ? `<div class="row">${funcs.map((f) => `<span class="pill ${f.active === false ? '' : 'accent'}">${escapeHtml(f.name)}</span>`).join('')}</div>`
        : '<div class="alert info">Aún no hay funcionalidades.</div>'}
      <form data-form="functionality" class="grid">
        <label>Nueva funcionalidad<input name="name" maxlength="50" placeholder="Inventario" /></label>
        <label>Estado<select name="stateId">${this.options_(this.seeds.functionalityStates)}</select></label>
        <div style="align-self:end"><button type="submit" ${s.busy ? 'disabled' : ''}>Crear funcionalidad</button></div>
      </form>
      ${this.options.allowApplicationCreation === false ? '' : `
      <h4>Registrar otra aplicación</h4>
      <p class="hint">Crea la aplicación en la organización <b>${escapeHtml(s.context?.organization)}</b> con sus ambientes Develop, Testing y Produccion.</p>
      <form data-form="application" class="grid">
        <label>Nombre<input name="name" maxlength="50" placeholder="Mi aplicación" /></label>
        <label>Idioma base<select name="languageId">${this.options_(this.seeds.languages)}</select></label>
        <label>Estado<select name="stateId">${this.options_(this.seeds.applicationStates)}</select></label>
        <div style="align-self:end"><button type="submit" class="ghost" ${s.busy ? 'disabled' : ''}>Crear aplicación</button></div>
      </form>`}`;
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
      return ['api-base-url', 'application-name', 'environment-name', 'login-url', 'theme', 'accent', 'radius', 'lock-context'];
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
