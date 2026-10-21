/**
 * MessageUcoLab Widget
 * ------------------------------------------------------------------
 * Componente reutilizable para que cualquier aplicación de la universidad
 * consuma el catálogo de mensajes MessageUcoLab (backend NosGraduamos-FC).
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
 * No tiene dependencias: funciona en React, Vue, Angular o HTML plano.
 * Los estilos viven en un Shadow DOM, así que no chocan con los del host.
 */

const VERSION = '0.1.0';
const DEFAULT_API_BASE_URL = '/messageucolab';

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

function idOf(item) {
  if (!item || typeof item === 'string') return '';
  return item.id || '';
}

function sameText(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

async function resolveToken(options) {
  if (typeof options.getToken === 'function') {
    const value = await options.getToken();
    return value ? String(value) : '';
  }
  return options.token ? String(options.token) : '';
}

/* ================================================================== */
/*  Cliente HTTP (contrato de /messageucolab/v1)                        */
/* ================================================================== */

/**
 * Crea un cliente HTTP del contrato MessageUcoLab.
 * opciones:
 *  - apiBaseUrl: URL hasta /messageucolab (por defecto relativo: "/messageucolab").
 *  - getToken / token: credencial de identidad (Authorization: Bearer).
 *  - integrationToken: token de integración del ambiente (header Token).
 *  - timeoutMs: tiempo máximo por petición (por defecto 10 s).
 *  - credentials: modo de credenciales de fetch (por defecto "same-origin").
 *  - onUnauthorized(error): se invoca ante un 401 (p. ej. para redirigir al login).
 */
export function createApi(options = {}) {
  const base = `${trimSlash(options.apiBaseUrl)}/v1`;
  const timeoutMs = options.timeoutMs ?? 10000;

  async function request(path, { method = 'GET', body, auth = 'bearer', envelope = false } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    if (auth === 'integration' && options.integrationToken) {
      headers.Token = options.integrationToken;
    } else if (auth !== 'none') {
      const token = await resolveToken(options);
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    let response;
    try {
      response = await fetch(base + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        credentials: options.credentials || 'same-origin',
        signal: controller ? controller.signal : undefined
      });
    } catch (error) {
      const aborted = error && error.name === 'AbortError';
      throw new MessageUcoLabError(
        aborted
          ? 'MessageUcoLab no respondió a tiempo.'
          : 'No fue posible conectar con MessageUcoLab. Revisa la URL de la API, el proxy o CORS.',
        { status: 0, code: aborted ? 'TIMEOUT' : 'NETWORK' }
      );
    } finally {
      if (timer) clearTimeout(timer);
    }

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
        json?.message ||
        json?.error ||
        (response.status === 401
          ? 'Credencial ausente o inválida.'
          : response.status === 403
            ? 'No tienes permiso para esta operación.'
            : `Error HTTP ${response.status}`);
      const error = new MessageUcoLabError(message, {
        status: response.status,
        code: apiError?.code || '',
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
    if (json && typeof json === 'object' && 'data' in json) return json.data;
    return json;
  }

  const first = (data) => (Array.isArray(data) ? data[0] ?? null : data ?? null);
  const list = (data) => (Array.isArray(data) ? data : data ? [data] : []);

  return {
    request,
    // Contexto (organización / aplicación / ambiente) de la identidad
    contexts: async () => list(await request('/me/contexts')),
    activeContext: async () => first(await request('/me/context')),
    selectContext: async (ctx) =>
      first(
        await request('/me/context', {
          method: 'PUT',
          body: {
            organizationId: ctx.organizationId,
            applicationId: ctx.applicationId,
            environmentId: ctx.environmentId
          }
        })
      ),
    // Catálogos
    applications: async () => list(await request('/catalog/applications')),
    environments: async (applicationId) =>
      list(await request(`/catalog/applications/${encodeURIComponent(applicationId)}/environments`)),
    functionalities: async (applicationId) =>
      list(await request(`/catalog/applications/${encodeURIComponent(applicationId)}/functionalities`)),
    messageTypes: async () => list(await request('/catalog/message-types')),
    messageCategories: async () => list(await request('/catalog/message-categories')),
    messageStates: async () => list(await request('/catalog/message-states')),
    // Mensajes
    listMessages: async ({ page = 1, size = 10, sort = 'ASC', columnSort = 'code' } = {}) => {
      const json = await request(
        `/messages?page=${page}&size=${size}&sort=${sort}&columnSort=${encodeURIComponent(columnSort)}`,
        { envelope: true }
      );
      const outer = json?.data;
      const pageObj = Array.isArray(outer) ? outer.find((x) => x && Array.isArray(x.data)) : outer;
      if (pageObj && Array.isArray(pageObj.data)) {
        return {
          items: pageObj.data,
          page: pageObj.page ?? page,
          totalItems: pageObj.totalItems ?? pageObj.data.length,
          totalPages: pageObj.totalPages ?? 1
        };
      }
      const items = Array.isArray(outer) ? outer : [];
      return { items, page, totalItems: items.length, totalPages: 1 };
    },
    findMessage: async (code) => {
      const data = await request(`/messages?code=${encodeURIComponent(toMessageCode(code))}`);
      if (Array.isArray(data)) return data[0] ?? null;
      if (data && Array.isArray(data.data)) return data.data[0] ?? null;
      return data ?? null;
    },
    resolveMessage: async (code, { auth = 'bearer' } = {}) =>
      request(`/messages/resolve?code=${encodeURIComponent(toMessageCode(code))}`, { auth }),
    createMessage: (payload) => request('/messages', { method: 'POST', body: payload }),
    translateMessage: async (code, targetLanguage, sourceLanguage = 'auto') =>
      first(
        await request(`/messages/${encodeURIComponent(toMessageCode(code))}/translations`, {
          method: 'POST',
          body: { sourceLanguage, targetLanguage }
        })
      ),
    createApplication: (payload) => request('/application', { method: 'POST', body: payload }),
    createFunctionality: (payload) =>
      request('/application/functionality', { method: 'POST', body: payload }),
    updateMessage: (code, payload) =>
      request(`/messages/${encodeURIComponent(toMessageCode(code))}`, { method: 'PUT', body: payload }),
    deleteMessage: (code) =>
      request(`/messages/${encodeURIComponent(toMessageCode(code))}`, { method: 'DELETE' })
  };
}

/**
 * Busca (y si hace falta selecciona) el contexto de una aplicación.
 * Devuelve { organizationId, applicationId, environmentId, organization, application, environment }.
 */
export async function ensureContext(api, { applicationName, environmentName } = {}) {
  const contexts = await api.contexts();
  const normalized = contexts.map((c) => ({
    organizationId: idOf(c.organization) || c.organizationId,
    applicationId: idOf(c.application) || c.applicationId,
    environmentId: idOf(c.environment) || c.environmentId,
    organization: nameOf(c.organization) || c.organizationName || '',
    application: nameOf(c.application) || c.applicationName || '',
    environment: nameOf(c.environment) || c.environmentName || ''
  }));

  const candidates = normalized.filter((c) => !applicationName || sameText(c.application, applicationName));
  const match =
    candidates.find((c) => !environmentName || sameText(c.environment, environmentName)) || null;

  if (!match) {
    const error = new MessageUcoLabError(
      applicationName
        ? `Tu usuario no tiene un contexto para la aplicación "${applicationName}"` +
          (environmentName ? ` en el ambiente "${environmentName}".` : '.')
        : 'Tu usuario no tiene contextos disponibles.',
      { code: 'CONTEXT_NOT_FOUND' }
    );
    error.contexts = normalized;
    throw error;
  }

  let active = null;
  try {
    active = await api.activeContext();
  } catch {
    active = null;
  }
  const alreadyActive =
    active &&
    active.applicationId === match.applicationId &&
    active.environmentId === match.environmentId;
  if (!alreadyActive) await api.selectContext(match);
  return { ...match, contexts: normalized };
}

/* ================================================================== */
/*  Cliente de mensajes para tiempo de ejecución                        */
/* ================================================================== */

/**
 * Cliente para que una aplicación muestre sus mensajes.
 *
 *   const mensajes = createMessageClient({
 *     apiBaseUrl: '/messageucolab',
 *     getToken: () => sesion.token,           // o integrationToken: '...'
 *     context: { applicationName: 'Inventario', environmentName: 'Develop' },
 *     fallbacks: { MSG_STOCKLOW: { title: 'Stock bajo', content: 'Quedan {qty} unidades' } }
 *   });
 *   const m = await mensajes.get('MSG_STOCKLOW', { qty: 3 });
 *   // m = { code, title, content, source: 'api' | 'cache' | 'fallback', error? }
 *
 * get() nunca lanza excepción: si el servicio falla devuelve el respaldo,
 * para que la aplicación consumidora siga funcionando.
 */
export function createMessageClient(options = {}) {
  const api = createApi({ timeoutMs: 4000, ...options });
  const cacheTtlMs = options.cacheTtlMs ?? 5 * 60 * 1000;
  const fallbacks = { ...(options.fallbacks || {}) };
  const missTtlMs = options.missTtlMs ?? 30 * 1000;
  const cache = new Map();
  const misses = new Map(); // códigos inexistentes: evita repetir la consulta durante missTtlMs
  const inflight = new Map();
  const auth = options.integrationToken ? 'integration' : 'bearer';
  let contextPromise = null;
  let useQueryEndpoint = options.endpoint === 'query';

  function ensureCtx() {
    if (auth !== 'bearer' || !options.context) return Promise.resolve();
    if (!contextPromise) {
      contextPromise = ensureContext(api, options.context).catch((error) => {
        contextPromise = null; // reintenta en la siguiente llamada
        throw error;
      });
    }
    return contextPromise;
  }

  async function fetchMessage(code) {
    await ensureCtx();
    if (!useQueryEndpoint) {
      try {
        return await api.resolveMessage(code, { auth });
      } catch (error) {
        if (error.status !== 404 || auth !== 'bearer' || !(await resolveRouteMissing())) throw error;
        // Backend sin /messages/resolve (imagen anterior): se usa la consulta documentada GET /messages?code=
        useQueryEndpoint = true;
      }
    }
    const message = await api.findMessage(code);
    if (!message) throw new MessageUcoLabError(`No existe el mensaje ${code}.`, { status: 404 });
    return message;
  }

  // Sin "code" el endpoint responde 400 si existe; 404 significa que la ruta no está desplegada.
  let routeProbe = null;
  function resolveRouteMissing() {
    if (!routeProbe) {
      routeProbe = api
        .request('/messages/resolve', { auth })
        .then(() => false)
        .catch((e) => e.status === 404);
    }
    return routeProbe;
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
        fetchMessage(code)
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

const STYLES = `
:host { all: initial; display: block; }
* { box-sizing: border-box; }
.mu {
  --accent: #116149;
  --accent-soft: color-mix(in srgb, var(--accent) 12%, transparent);
  --bg: #ffffff;
  --panel: #f6f8f7;
  --ink: #17201c;
  --muted: #5e6b66;
  --line: #dde4e1;
  --danger: #b42318;
  --ok: #127a4b;
  --radius: 10px;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  color: var(--ink);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
}
.top { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--line); }
.brand { display: flex; align-items: center; gap: 10px; margin-right: auto; }
.mark { width: 30px; height: 30px; border-radius: 8px; background: var(--accent); color: #fff; display: grid; place-items: center; font-weight: 700; }
.brand strong { display: block; font-size: 15px; }
.brand small { color: var(--muted); font-size: 12px; }
.ctx { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-width: 0; max-width: 100%; font-size: 12px; color: var(--muted); background: var(--panel); border: 1px solid var(--line); border-radius: 999px; padding: 4px 6px 4px 12px; }
.ctx b { color: var(--ink); font-weight: 600; }
.tabs { display: flex; gap: 2px; padding: 0 12px; border-bottom: 1px solid var(--line); overflow-x: auto; }
.tabs button { background: none; border: 0; border-bottom: 2px solid transparent; border-radius: 0; color: var(--muted); padding: 10px 12px; font-weight: 600; white-space: nowrap; }
.tabs button.on { color: var(--accent); border-bottom-color: var(--accent); }
.body { padding: 18px; }
h3 { margin: 0 0 4px; font-size: 16px; }
h4 { margin: 18px 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
p { margin: 0 0 12px; }
.hint { color: var(--muted); font-size: 13px; }
button, .btn {
  font: inherit; font-weight: 600; cursor: pointer; border-radius: calc(var(--radius) - 3px);
  border: 1px solid var(--accent); background: var(--accent); color: #fff; padding: 8px 14px;
}
button.ghost { background: transparent; color: var(--accent); }
button.link { background: none; border: 0; color: var(--accent); padding: 2px 4px; }
button.small { padding: 4px 10px; font-size: 12px; }
button:disabled { opacity: .5; cursor: not-allowed; }
input, select, textarea {
  font: inherit; color: var(--ink); width: 100%; padding: 8px 10px; background: #fff;
  border: 1px solid var(--line); border-radius: calc(var(--radius) - 3px);
}
input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent-soft); border-color: var(--accent); }
textarea { resize: vertical; min-height: 70px; }
label { display: grid; gap: 4px; align-content: start; font-size: 13px; font-weight: 600; min-width: 0; }
.mu { min-width: 0; max-width: 100%; }
.brand { min-width: 0; }
label small { font-weight: 400; color: var(--muted); }
label small.bad { color: var(--danger); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
.full { grid-column: 1 / -1; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.row input { flex: 1 1 220px; width: auto; }
.spacer { margin-left: auto; }
.table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: calc(var(--radius) - 3px); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { background: var(--panel); font-size: 12px; color: var(--muted); font-weight: 600; }
tr:last-child td { border-bottom: 0; }
code, .code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
.pill { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--panel); border: 1px solid var(--line); color: var(--muted); }
.alert { padding: 10px 12px; border-radius: calc(var(--radius) - 3px); margin-bottom: 12px; font-size: 13px; }
.alert.err { background: #fef3f2; color: var(--danger); border: 1px solid #fecdca; }
.alert.ok { background: #ecfdf3; color: var(--ok); border: 1px solid #abefc6; }
.alert.info { background: var(--panel); color: var(--muted); border: 1px solid var(--line); }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.card { border: 1px solid var(--line); border-radius: calc(var(--radius) - 3px); padding: 12px; display: grid; gap: 4px; }
.card strong { font-size: 14px; }
.card span { color: var(--muted); font-size: 12px; }
.card button { margin-top: 8px; }
.detail { border: 1px solid var(--line); border-radius: calc(var(--radius) - 3px); padding: 14px; display: grid; gap: 8px; }
.detail dl { display: grid; grid-template-columns: 130px 1fr; gap: 6px 12px; margin: 0; }
.detail dt { color: var(--muted); font-size: 12px; }
.detail dd { margin: 0; }
pre { background: #0f1714; color: #d6f5e6; padding: 12px; border-radius: calc(var(--radius) - 3px); overflow-x: auto; font-size: 12px; margin: 0; }
.pager { display: flex; align-items: center; gap: 10px; justify-content: flex-end; margin-top: 12px; font-size: 13px; color: var(--muted); }
.loading { color: var(--muted); padding: 18px 0; }
.foot { padding: 8px 18px; border-top: 1px solid var(--line); font-size: 11px; color: var(--muted); display: flex; justify-content: space-between; }
.actions-cell { display: flex; gap: 2px; align-items: center; }
.icon-btn { background: none; border: 0; cursor: pointer; padding: 4px 6px; border-radius: 4px; color: var(--muted); line-height: 1; }
.icon-btn:hover { background: var(--panel); color: var(--ink); }
.icon-btn.edit { color: #2563eb; }
.icon-btn.edit:hover { background: #eff6ff; color: #1d4ed8; }
.icon-btn.danger { color: var(--danger); }
.icon-btn.danger:hover { background: #fef2f2; }
.icon-btn:disabled { opacity: .4; cursor: not-allowed; }
@media (max-width: 560px) { .detail dl { grid-template-columns: 1fr; } .top { padding: 12px; } .body { padding: 12px; } }
`;

class AdminWidget {
  constructor(host, options = {}) {
    this.host = host;
    this.options = { apiBaseUrl: DEFAULT_API_BASE_URL, ...options };
    this.seeds = { ...DEFAULT_SEEDS, ...(options.seeds || {}) };
    this.api = createApi(this.options);
    this.root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    this.state = {
      view: 'loading',
      tab: 'list',
      error: '',
      notice: '',
      context: null,
      contexts: [],
      catalogs: { types: [], categories: [], states: [], functionalities: [] },
      list: { items: [], page: 1, size: options.pageSize || 10, totalItems: 0, totalPages: 0, loading: false, query: '' },
      detail: null,
      detailError: '',
      consumerView: null,
      translation: null,
      editing: null,
      busy: false
    };
    this.onClick = this.onClick.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.onInput = this.onInput.bind(this);
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('submit', this.onSubmit);
    this.root.addEventListener('input', this.onInput);
    this.render();
    this.start();
  }

  /* ---------- ciclo de vida ---------- */

  destroy() {
    this.root.removeEventListener('click', this.onClick);
    this.root.removeEventListener('submit', this.onSubmit);
    this.root.removeEventListener('input', this.onInput);
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
    return message;
  }

  async start() {
    this.set({ view: 'loading', error: '' });
    const { applicationName, environmentName } = this.options;
    try {
      if (applicationName && environmentName) {
        const ctx = await ensureContext(this.api, { applicationName, environmentName });
        this.state.contexts = ctx.contexts;
        await this.useContext(ctx, false);
        return;
      }
      const contexts = await this.loadContexts();
      const visible = applicationName
        ? contexts.filter((c) => sameText(c.application, applicationName))
        : contexts;
      if (!applicationName) {
        let active = null;
        try { active = await this.api.activeContext(); } catch { active = null; }
        const known = active && visible.find(
          (c) => c.applicationId === active.applicationId && c.environmentId === active.environmentId
        );
        if (known) { await this.useContext(known, false); return; }
      }
      if (visible.length === 1) await this.useContext(visible[0], true);
      else this.set({ view: 'contexts' });
    } catch (error) {
      if (error.code === 'CONTEXT_NOT_FOUND') {
        this.state.contexts = error.contexts || [];
        this.set({ view: 'contexts', error: this.fail(error, 'context') });
      } else {
        this.set({ view: 'fatal', error: this.fail(error, 'start') });
      }
    }
  }

  async loadContexts() {
    const raw = await this.api.contexts();
    const contexts = raw.map((c) => ({
      organizationId: idOf(c.organization) || c.organizationId,
      applicationId: idOf(c.application) || c.applicationId,
      environmentId: idOf(c.environment) || c.environmentId,
      organization: nameOf(c.organization) || c.organizationName || '',
      application: nameOf(c.application) || c.applicationName || '',
      environment: nameOf(c.environment) || c.environmentName || ''
    }));
    this.state.contexts = contexts;
    return contexts;
  }

  async useContext(ctx, select) {
    this.set({ view: 'loading', error: '' });
    if (select) await this.api.selectContext(ctx);
    this.state.context = ctx;
    this.emit('context', ctx);
    await Promise.all([this.loadCatalogs(), this.loadMessages(1)]);
    this.set({ view: 'ready' });
  }

  async loadCatalogs() {
    const appId = this.state.context?.applicationId;
    const settle = (p) => p.catch(() => []);
    const [types, categories, states, functionalities] = await Promise.all([
      settle(this.api.messageTypes()),
      settle(this.api.messageCategories()),
      settle(this.api.messageStates()),
      appId ? settle(this.api.functionalities(appId)) : Promise.resolve([])
    ]);
    this.state.catalogs = { types, categories, states, functionalities };
  }

  async loadMessages(page = this.state.list.page) {
    const list = this.state.list;
    this.set({ list: { ...list, loading: true }, notice: '' });
    try {
      const res = await this.api.listMessages({ page, size: list.size });
      this.set({
        list: { ...this.state.list, ...res, items: res.items, page: res.page, loading: false, query: '' },
        error: ''
      });
    } catch (error) {
      this.set({ list: { ...this.state.list, items: [], loading: false }, error: this.fail(error, 'list') });
    }
  }

  async searchMessage(raw) {
    const code = toMessageCode(raw);
    if (!code) return this.loadMessages(1);
    this.set({ list: { ...this.state.list, loading: true, query: raw } });
    try {
      const message = await this.api.findMessage(code);
      this.set({
        list: { ...this.state.list, items: message ? [message] : [], totalItems: message ? 1 : 0, totalPages: 1, page: 1, loading: false },
        error: message ? '' : `No se encontró el mensaje ${code}.`
      });
    } catch (error) {
      this.set({ list: { ...this.state.list, items: [], loading: false }, error: this.fail(error, 'search') });
    }
  }

  async openDetail(code) {
    this.set({ tab: 'detail', detail: null, detailError: '', notice: '', error: '', consumerView: null, translation: null, busy: true });
    try {
      const message = await this.api.findMessage(code);
      this.set({ detail: message, busy: false, detailError: message ? '' : `No se encontró ${toMessageCode(code)}.` });
    } catch (error) {
      this.set({ busy: false, detailError: this.fail(error, 'detail') });
    }
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

  async onClick(event) {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const { action, arg } = el.dataset;
    switch (action) {
      case 'tab':
        this.set({ tab: arg, notice: '', error: '' });
        if (arg === 'list' && !this.state.list.items.length) this.loadMessages(1);
        break;
      case 'refresh':
        await this.loadMessages(this.state.list.page);
        break;
      case 'page':
        await this.loadMessages(Number(arg));
        break;
      case 'view':
        await this.openDetail(arg);
        break;
      case 'pick-context': {
        const ctx = this.state.contexts[Number(arg)];
        if (!ctx) return;
        try {
          await this.useContext(ctx, true);
        } catch (error) {
          this.set({ view: 'contexts', error: this.fail(error, 'context') });
        }
        break;
      }
      case 'change-context':
        this.set({ view: 'loading' });
        try {
          await this.loadContexts();
          this.set({ view: 'contexts', error: '' });
        } catch (error) {
          this.set({ view: 'fatal', error: this.fail(error, 'contexts') });
        }
        break;
      case 'retry':
        this.start();
        break;
      case 'edit-msg': {
        const m = this.state.list.items.find((i) => i.code === arg);
        if (!m) return;
        const c = this.state.catalogs;
        const editing = {
          code: m.code,
          title: m.title || '',
          content: m.content || '',
          typeId: idOf(m.type) || (c.types.find((t) => t.name === nameOf(m.type))?.id || c.types[0]?.id || ''),
          categoryId: idOf(m.category) || (c.categories.find((t) => t.name === nameOf(m.category))?.id || c.categories[0]?.id || ''),
          statusId: idOf(m.status) || (c.states.find((t) => t.name === nameOf(m.status))?.id || c.states[0]?.id || ''),
          functionalityId: idOf(m.functionality) || (c.functionalities.find((f) => f.name === nameOf(m.functionality))?.id || c.functionalities[0]?.id || '')
        };
        this.set({ tab: 'edit', editing, error: '', notice: '' });
        break;
      }
      case 'delete-msg': {
        if (!confirm(`¿Eliminar el mensaje "${arg}"? Esta acción no se puede deshacer.`)) return;
        this.set({ busy: true, error: '' });
        try {
          await this.api.deleteMessage(arg);
          this.state.list.items = this.state.list.items.filter((i) => i.code !== arg);
          this.state.list.totalItems = Math.max(0, (this.state.list.totalItems || 1) - 1);
          this.emit('deleted', { code: arg });
          this.set({ busy: false, notice: `Mensaje ${arg} eliminado.` });
          setTimeout(() => this.loadMessages(this.state.list.page), 1500);
        } catch (error) {
          this.set({ busy: false, error: this.fail(error, 'delete') });
        }
        break;
      }
      case 'consumer-view': {
        const code = this.state.detail?.code;
        if (!code) return;
        this.set({ busy: true });
        try {
          const resolved = await this.api.resolveMessage(code);
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
    const data = Object.fromEntries(new FormData(form).entries());
    const kind = form.dataset.form;

    if (kind === 'search') return this.searchMessage(data.q);
    if (kind === 'search-detail') return data.code && data.code.trim() ? this.openDetail(data.code) : undefined;

    if (kind === 'create') {
      const suffix = String(data.code || '').trim().toUpperCase().replace(/^MSG_+/, '');
      const problems = [];
      if (!suffix || suffix.length > 10 || !/^[A-Z0-9 ]+$/.test(suffix))
        problems.push('El código acepta hasta 10 letras, números o espacios (sin MSG_). Ej.: STOCKLOW');
      if (data.title.trim().length < 10 || data.title.trim().length > 50)
        problems.push('El título debe tener entre 10 y 50 caracteres.');
      if (data.content.trim().length < 10 || data.content.trim().length > 100)
        problems.push('El contenido debe tener entre 10 y 100 caracteres.');
      if (!data.functionalityId) problems.push('Selecciona una funcionalidad (créala en Configuración si no hay).');
      if (!data.typeId || !data.categoryId || !data.statusId) problems.push('Tipo, categoría y estado son obligatorios.');
      if (problems.length) return this.set({ error: problems.join(' '), notice: '' });

      this.set({ busy: true, error: '' });
      try {
        await this.api.createMessage({
          code: suffix,
          title: data.title.trim(),
          content: data.content.trim(),
          typeId: data.typeId,
          categoryId: data.categoryId,
          statusId: data.statusId,
          functionalityId: data.functionalityId
        });
        const code = toMessageCode(suffix);
        this.emit('created', { code });
        this.set({
          busy: false,
          tab: 'list',
          notice: `Mensaje ${code} creado. Puede tardar unos segundos en aparecer en la lista (consistencia eventual).`
        });
        setTimeout(() => this.loadMessages(1).then(() => this.set({ notice: `Mensaje ${code} creado.` })), 2500);
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
        await this.api.updateMessage(code, {
          title: data.title.trim(),
          content: data.content.trim(),
          typeId: data.typeId,
          categoryId: data.categoryId,
          statusId: data.statusId,
          functionalityId: data.functionalityId
        });
        this.emit('updated', { code });
        this.set({ busy: false, tab: 'list', editing: null, notice: `Mensaje ${code} actualizado.` });
        setTimeout(() => this.loadMessages(this.state.list.page), 2000);
      } catch (error) {
        this.set({ busy: false, error: this.fail(error, 'edit') });
      }
      return;
    }

    if (kind === 'translate') {
      this.set({ busy: true, translation: null });
      try {
        const result = await this.api.translateMessage(this.state.detail.code, data.targetLanguage);
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
          applicationId: this.state.context.applicationId,
          stateId: data.stateId
        });
        this.emit('functionality-created', { name: data.name.trim() });
        setTimeout(async () => {
          await this.loadCatalogs();
          this.set({ busy: false, notice: `Funcionalidad "${data.name.trim()}" creada.` });
        }, 1200);
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
        this.set({
          busy: false,
          notice: `Aplicación "${data.name.trim()}" creada con sus ambientes. Usa "Cambiar" en el contexto para trabajar en ella.`
        });
      } catch (error) {
        this.set({ busy: false, error: this.fail(error, 'application') });
      }
    }
  }

  /* ---------- render ---------- */

  render() {
    const t = this.options.theme || {};
    const vars = [
      t.accent ? `--accent:${t.accent}` : '',
      t.radius ? `--radius:${t.radius}` : '',
      t.fontFamily ? `font-family:${t.fontFamily}` : ''
    ].filter(Boolean).join(';');
    const s = this.state;
    const ctx = s.context;
    const title = this.options.title || 'Mensajes de la aplicación';

    this.root.innerHTML = `
      <style>${STYLES}</style>
      <div class="mu" style="${escapeHtml(vars)}">
        <div class="top">
          <div class="brand">
            <div class="mark">M</div>
            <div><strong>${escapeHtml(title)}</strong><small>Catálogo MessageUcoLab</small></div>
          </div>
          ${ctx ? `<div class="ctx" title="Organización / Aplicación / Ambiente">
              ${escapeHtml(ctx.organization)} / <b>${escapeHtml(ctx.application)}</b> / ${escapeHtml(ctx.environment)}
              ${this.options.lockContext ? '' : '<button class="link small" data-action="change-context">Cambiar</button>'}
            </div>` : ''}
        </div>
        ${s.view === 'ready' ? this.renderTabs() : ''}
        <div class="body">${this.renderBody()}</div>
        <div class="foot"><span>MessageUcoLab widget v${VERSION}</span><span>${escapeHtml(trimSlash(this.options.apiBaseUrl))}</span></div>
      </div>`;
  }

  renderTabs() {
    const tabs = [
      ['list', 'Mensajes'],
      ['create', 'Crear mensaje'],
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
    if (s.view === 'fatal') {
      return `<div class="alert err">${escapeHtml(s.error)}</div>
        <p class="hint">Revisa que el backend esté arriba, que la URL de la API sea correcta
        (${escapeHtml(trimSlash(this.options.apiBaseUrl))}) y que tu sesión/token sea válido.</p>
        <button data-action="retry">Reintentar</button>`;
    }
    if (s.view === 'contexts') return this.renderContexts();
    switch (s.tab) {
      case 'create':
        return this.renderCreate();
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

  renderContexts() {
    const s = this.state;
    const appName = this.options.applicationName;
    const indexed = s.contexts.map((c, i) => ({ ...c, _i: i }));
    const visible = appName ? indexed.filter((c) => sameText(c.application, appName)) : indexed;
    return `${this.renderAlerts()}
      <h3>Selecciona el espacio de trabajo</h3>
      <p class="hint">Organización, aplicación y ambiente a los que tienes acceso.</p>
      ${visible.length
        ? `<div class="cards">${visible
            .map((c) => `<div class="card">
                <strong>${escapeHtml(c.application)}</strong>
                <span>${escapeHtml(c.organization)}</span>
                <span>Ambiente: ${escapeHtml(c.environment)}</span>
                <button class="small" data-action="pick-context" data-arg="${c._i}">Usar este</button>
              </div>`)
            .join('')}</div>`
        : '<div class="alert info">No tienes contextos disponibles. Solicita acceso al administrador de MessageUcoLab.</div>'}`;
  }

  renderList() {
    const l = this.state.list;
    const rows = l.items
      .map((m) => `<tr>
          <td><span class="code">${escapeHtml(m.code)}</span></td>
          <td>${escapeHtml(m.title)}</td>
          <td>${escapeHtml(m.content)}</td>
          <td><span class="pill">${escapeHtml(nameOf(m.type))}</span></td>
          <td>${escapeHtml(nameOf(m.category))}</td>
          <td>${escapeHtml(nameOf(m.functionality))}</td>
          <td class="actions-cell">
            <button class="icon-btn" data-action="view" data-arg="${escapeHtml(m.code)}" title="Ver">${ICON_EYE}</button>
            <button class="icon-btn edit" data-action="edit-msg" data-arg="${escapeHtml(m.code)}" title="Editar">${ICON_PENCIL}</button>
            <button class="icon-btn danger" data-action="delete-msg" data-arg="${escapeHtml(m.code)}" title="Eliminar">${ICON_TRASH}</button>
          </td>
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
            <thead><tr><th>Código</th><th>Título</th><th>Contenido</th><th>Tipo</th><th>Categoría</th><th>Funcionalidad</th><th></th></tr></thead>
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
    const noFunc = !c.functionalities.length;
    return `${this.renderAlerts()}
      <h3>Nuevo mensaje</h3>
      <p class="hint">Se crea en el ambiente <b>${escapeHtml(this.state.context?.environment)}</b> de <b>${escapeHtml(this.state.context?.application)}</b>.</p>
      ${noFunc ? `<div class="alert info">Esta aplicación no tiene funcionalidades. Crea una en
        <button class="link small" data-action="tab" data-arg="config">Configuración</button> para poder registrar mensajes.</div>` : ''}
      <form data-form="create">
        <div class="grid">
          <label>Código *
            <input name="code" maxlength="14" placeholder="STOCKLOW" data-count="1-10" autocomplete="off" />
            <small data-counter-for="code">0/10 · se guardará como MSG_…</small>
          </label>
          <label>Funcionalidad *
            <select name="functionalityId" ${noFunc ? 'disabled' : ''}>
              <option value="">Seleccionar…</option>${this.options_(c.functionalities, { selected: c.functionalities.length === 1 ? c.functionalities[0].id : '-' })}
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
            ${m.created_at || m.createdAt ? `<dt>Creado</dt><dd>${escapeHtml(m.created_at || m.createdAt)}</dd>` : ''}
          </dl>
          <h4>Uso desde tu aplicación</h4>
          <pre>const m = await mensajes.get('${escapeHtml(m.code)}');
// m.title, m.content</pre>
          <div class="row" style="margin:6px 0 0">
            <button class="ghost small" data-action="consumer-view" ${s.busy ? 'disabled' : ''}>Probar como consumidor (/messages/resolve)</button>
          </div>
          ${cv ? (cv.ok
            ? `<pre>${escapeHtml(JSON.stringify(cv.data, null, 2))}</pre>`
            : `<div class="alert err">El endpoint de consumo respondió ${escapeHtml(cv.status || '')}: ${escapeHtml(cv.error)}</div>`) : ''}
          <h4>Traducir</h4>
          <form class="row" data-form="translate">
            <select name="targetLanguage" style="max-width:200px">${this.options_(TRANSLATION_LANGUAGES)}</select>
            <button type="submit" class="ghost small" ${s.busy ? 'disabled' : ''}>Traducir</button>
          </form>
          ${tr ? (tr.ok
            ? `<div class="alert info"><b>${escapeHtml(tr.data?.translatedTitle)}</b><br>${escapeHtml(tr.data?.translatedContent)}
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
        ? `<div class="row">${funcs.map((f) => `<span class="pill">${escapeHtml(f.name)}</span>`).join('')}</div>`
        : '<div class="alert info">Aún no hay funcionalidades.</div>'}
      <form data-form="functionality" class="grid">
        <label>Nueva funcionalidad<input name="name" maxlength="50" placeholder="Inventario" /></label>
        <label>Estado<select name="stateId">${this.options_(this.seeds.functionalityStates)}</select></label>
        <div style="align-self:end"><button type="submit" ${s.busy ? 'disabled' : ''}>Crear funcionalidad</button></div>
      </form>
      ${this.options.allowApplicationCreation === false ? '' : `
      <h4>Registrar otra aplicación</h4>
      <p class="hint">Crea la aplicación en la organización <b>${escapeHtml(s.context?.organization)}</b> con sus ambientes Develop, Testing y Production.</p>
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
 *     apiBaseUrl: '/messageucolab',
 *     getToken: () => sesion.token,
 *     applicationName: 'Inventario',
 *     environmentName: 'Develop',
 *     theme: { accent: '#116149', radius: '12px' }
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
      return ['api-base-url', 'token', 'application-name', 'environment-name', 'accent', 'lock-context'];
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

    /** Permite pasar opciones avanzadas (getToken, onEvent…) por propiedad. */
    set options(value) {
      this._options = value || {};
      if (this.isConnected) this._mount();
    }

    get options() {
      return this._options || {};
    }

    _mount() {
      const attr = (name) => this.getAttribute(name) || undefined;
      mount(this, {
        apiBaseUrl: attr('api-base-url'),
        token: attr('token'),
        applicationName: attr('application-name'),
        environmentName: attr('environment-name'),
        lockContext: this.hasAttribute('lock-context'),
        theme: attr('accent') ? { accent: attr('accent') } : undefined,
        ...this.options
      });
      this._mounted = true;
    }
  }
  window.customElements.define('messageucolab-admin', MessageUcoLabAdminElement);
}

export { VERSION };
export default { mount, unmount, createMessageClient, createApi, ensureContext, toMessageCode, formatMessage, VERSION };
