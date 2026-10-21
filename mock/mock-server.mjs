// Backend simulado de MessageUcoLab (mismo contrato que /messageucolab/v1).
// Sirve para desarrollar y probar una app consumidora sin levantar Docker.
//
//   npm run mock            -> http://localhost:8099
//   PORT=9000 npm run mock
//
// Credenciales aceptadas:
//   Authorization: Bearer simulated-access-token   (identidad, para el widget)
//   Token: demo-integration-token                  (integración, ambiente Develop de "Inventario")
// Los datos viven en memoria: se pierden al reiniciar.

import http from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT || 8099);
const BEARER = process.env.MOCK_BEARER || 'simulated-access-token';
const INTEGRATION_TOKEN = process.env.MOCK_INTEGRATION_TOKEN || 'demo-integration-token';

const org = { id: randomUUID(), name: 'Universidad Católica de Oriente' };
const applications = [];
const environments = [];
const functionalities = [];
const messages = []; // { code, title, content, typeId, categoryId, statusId, functionalityId, environmentId, created_at }

const types = [
  { id: randomUUID(), name: 'Informativo' },
  { id: randomUUID(), name: 'Advertencia' },
  { id: randomUUID(), name: 'Error' },
  { id: randomUUID(), name: 'Éxito' }
];
const categories = [
  { id: randomUUID(), name: 'Negocio' },
  { id: randomUUID(), name: 'Técnico' }
];
const states = [
  { id: randomUUID(), name: 'Activo' },
  { id: randomUUID(), name: 'Inactivo' }
];

function addApplication(name) {
  const app = { id: randomUUID(), name, organizationId: org.id };
  applications.push(app);
  for (const env of ['Develop', 'Testing', 'Production']) {
    environments.push({ id: randomUUID(), name: env, applicationId: app.id });
  }
  return app;
}

const msgApp = addApplication('MessageUcoLab');
addApplication('Inventario');
const msgFunc = { id: randomUUID(), name: 'General', applicationId: msgApp.id };
functionalities.push(msgFunc);
messages.push({
  code: 'MSG_WELCOME',
  title: 'Bienvenido a MessageUcoLab',
  content: 'Este es el catálogo central de mensajes.',
  typeId: types[0].id,
  categoryId: categories[0].id,
  statusId: states[0].id,
  functionalityId: msgFunc.id,
  environmentId: environments.find((e) => e.applicationId === msgApp.id && e.name === 'Develop').id,
  created_at: new Date().toISOString()
});

let activeContext = null;

const byId = (list, id) => list.find((x) => x.id === id);

function view(m) {
  return {
    code: m.code,
    title: m.title,
    content: m.content,
    type: byId(types, m.typeId)?.name,
    category: byId(categories, m.categoryId)?.name,
    functionality: byId(functionalities, m.functionalityId)?.name,
    created_at: m.created_at
  };
}

function send(res, status, body, extra = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...extra });
  res.end(body === undefined ? '' : JSON.stringify(body));
}
const ok = (res, data) => send(res, 200, { data, errors: [] });
const fail = (res, status, code, message, path) =>
  send(res, status, { data: [], errors: [{ code, message }], timestamp: new Date().toISOString(), path });

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve(null);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS abierto: el mock se usa solo en local.
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Token, Content-Type, Accept, X-Correlation-ID');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  if (req.method === 'OPTIONS') return send(res, 204);

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/+$/, '');
  const P = '/messageucolab/v1';
  console.log(req.method, url.pathname + url.search);

  if (path === '/actuator/health') return send(res, 200, { status: 'UP' });
  if (!path.startsWith(P)) return send(res, 404, { error: 'Not Found', status: 404, path });
  const route = path.slice(P.length);

  // Catálogos públicos
  if (req.method === 'GET' && route === '/catalog/message-types') return ok(res, types);
  if (req.method === 'GET' && route === '/catalog/message-categories') return ok(res, categories);
  if (req.method === 'GET' && route === '/catalog/message-states') return ok(res, states);

  // Autenticación
  const auth = req.headers.authorization || '';
  const bearer = /^Bearer (\S+)$/i.exec(auth)?.[1];
  const tokenHeader = req.headers.token;
  let environmentFromToken = null;
  if (auth && bearer !== BEARER) return fail(res, 401, 'UNAUTHORIZED', 'Credencial ausente o invalida.', path);
  if (!bearer) {
    if (tokenHeader === INTEGRATION_TOKEN) {
      const inv = applications.find((a) => a.name === 'Inventario');
      environmentFromToken = environments.find((e) => e.applicationId === inv.id && e.name === 'Develop');
    } else {
      return fail(res, 401, 'UNAUTHORIZED', 'Credencial ausente o invalida.', path);
    }
  }

  const contexts = () =>
    environments.map((e) => {
      const app = byId(applications, e.applicationId);
      return { organization: org, application: { id: app.id, name: app.name }, environment: { id: e.id, name: e.name } };
    });

  if (req.method === 'GET' && route === '/me/contexts') return ok(res, contexts());
  if (req.method === 'GET' && route === '/me/context') {
    if (!activeContext) return fail(res, 404, 'NOT_FOUND', 'No hay contexto activo.', path);
    return ok(res, [activeContext]);
  }
  if (req.method === 'PUT' && route === '/me/context') {
    const body = await readBody(req);
    const env = byId(environments, body?.environmentId);
    if (!env || env.applicationId !== body.applicationId) return fail(res, 403, 'FORBIDDEN', 'Contexto no permitido.', path);
    activeContext = { organizationId: org.id, applicationId: env.applicationId, environmentId: env.id, updatedAt: new Date().toISOString() };
    return ok(res, [activeContext]);
  }

  const envId = environmentFromToken?.id || activeContext?.environmentId;
  const needCtx = () => fail(res, 403, 'FORBIDDEN', 'Selecciona un contexto activo.', path);

  if (req.method === 'GET' && route === '/catalog/applications') return ok(res, applications.map(({ id, name }) => ({ id, name })));
  let m = /^\/catalog\/applications\/([^/]+)\/(environments|functionalities)$/.exec(route);
  if (req.method === 'GET' && m) {
    const list = m[2] === 'environments' ? environments : functionalities;
    return ok(res, list.filter((x) => x.applicationId === m[1]).map(({ id, name }) => ({ id, name })));
  }

  if (req.method === 'GET' && route === '/messages/resolve') {
    const code = url.searchParams.get('code');
    if (!code) return fail(res, 400, 'BAD_REQUEST', 'Falta el parametro code.', path);
    if (!envId) return needCtx();
    const found = messages.find((x) => x.code === code && x.environmentId === envId && byId(states, x.statusId)?.name === 'Activo');
    if (!found) return fail(res, 404, 'NOT_FOUND', `No existe el mensaje ${code} en el ambiente.`, path);
    return send(res, 200, { code: found.code, title: found.title, content: found.content }, { 'Cache-Control': 'no-store' });
  }

  if (req.method === 'GET' && route === '/messages') {
    if (!envId) return needCtx();
    const inEnv = messages.filter((x) => x.environmentId === envId);
    const code = url.searchParams.get('code');
    if (code) {
      const found = inEnv.find((x) => x.code === code);
      if (!found) return fail(res, 404, 'NOT_FOUND', `No se encontro el mensaje ${code}.`, path);
      return ok(res, [view(found)]);
    }
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const size = Math.min(100, Math.max(1, Number(url.searchParams.get('size') || 50)));
    const sorted = [...inEnv].sort((a, b) => a.code.localeCompare(b.code));
    const items = sorted.slice((page - 1) * size, page * size).map(view);
    return ok(res, [{ data: items, page, size, totalItems: inEnv.length, totalPages: Math.ceil(inEnv.length / size) }]);
  }

  if (req.method === 'POST' && route === '/messages') {
    if (!envId) return needCtx();
    const b = await readBody(req);
    if (!b) return fail(res, 400, 'BAD_REQUEST', 'Cuerpo invalido.', path);
    const suffix = String(b.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9 ]{1,10}$/.test(suffix)) return fail(res, 422, 'UNPROCESSABLE_ENTITY', 'Codigo invalido.', path);
    if ((b.title || '').length < 10 || b.title.length > 50) return fail(res, 422, 'UNPROCESSABLE_ENTITY', 'El titulo debe tener entre 10 y 50 caracteres.', path);
    if ((b.content || '').length < 10 || b.content.length > 100) return fail(res, 422, 'UNPROCESSABLE_ENTITY', 'El contenido debe tener entre 10 y 100 caracteres.', path);
    const func = byId(functionalities, b.functionalityId);
    const env = byId(environments, envId);
    if (!func || func.applicationId !== env.applicationId) return fail(res, 422, 'UNPROCESSABLE_ENTITY', 'La funcionalidad no pertenece a la aplicacion.', path);
    const code = `MSG_${suffix.replace(/ /g, '_')}`;
    if (messages.some((x) => x.code === code && x.environmentId === envId)) return fail(res, 409, 'CONFLICT', `El mensaje ${code} ya existe.`, path);
    messages.push({ ...b, code, environmentId: envId, created_at: new Date().toISOString() });
    return ok(res, ['Mensaje creado exitosamente']);
  }

  m = /^\/messages\/([^/]+)\/translations$/.exec(route);
  if (req.method === 'POST' && m) {
    const b = await readBody(req);
    const found = messages.find((x) => x.code === decodeURIComponent(m[1]) && x.environmentId === envId);
    if (!found) return fail(res, 404, 'NOT_FOUND', 'Mensaje no encontrado.', path);
    return ok(res, [{
      code: found.code, sourceLanguage: 'es', targetLanguage: b?.targetLanguage,
      originalTitle: found.title, originalContent: found.content,
      translatedTitle: `[${b?.targetLanguage}] ${found.title}`, translatedContent: `[${b?.targetLanguage}] ${found.content}`,
      translationProvider: 'mock', translationModel: 'none', translationElapsedMs: 1, dynamicTranslation: true
    }]);
  }

  if (req.method === 'POST' && route === '/application/functionality') {
    const b = await readBody(req);
    if (!b?.name || !byId(applications, b.applicationId)) return fail(res, 422, 'UNPROCESSABLE_ENTITY', 'Datos invalidos.', path);
    if (activeContext?.applicationId !== b.applicationId) return fail(res, 403, 'FORBIDDEN', 'La aplicacion no coincide con el contexto activo.', path);
    functionalities.push({ id: randomUUID(), name: b.name, applicationId: b.applicationId });
    return ok(res, ['Funcionalidad creada exitosamente']);
  }

  if (req.method === 'POST' && route === '/application') {
    const b = await readBody(req);
    if (!b?.name) return fail(res, 422, 'UNPROCESSABLE_ENTITY', 'Datos invalidos.', path);
    if (applications.some((a) => a.name.toLowerCase() === b.name.toLowerCase())) return fail(res, 409, 'CONFLICT', 'La aplicacion ya existe.', path);
    addApplication(b.name);
    return ok(res, ['Aplicacion creada exitosamente']);
  }

  return fail(res, 404, 'NOT_FOUND', 'Ruta no encontrada.', path);
});

server.listen(PORT, () => {
  console.log(`Mock MessageUcoLab en http://localhost:${PORT}/messageucolab/v1`);
  console.log(`  Bearer: ${BEARER}   Token de integración: ${INTEGRATION_TOKEN}`);
});
