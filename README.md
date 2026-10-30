# minifront-mensajes — microfrontend de MessageUcoLab

Componente para que **cualquier aplicación del semillero** administre y consuma sus mensajes de
MessageUcoLab (backend `NosGraduamos-FC`) sin escribir código contra la API.

Trae dos piezas en un solo archivo (`messageucolab.js`, ~16 KB gzip, sin dependencias):

| Pieza | Para qué sirve | Cómo se usa |
|---|---|---|
| **Microfrontend de administración** | Listar, crear, editar, consultar y traducir los mensajes de *tu* aplicación, y crear sus funcionalidades. | `mount(div, opciones)` o la etiqueta `<messageucolab-admin>` |
| **Cliente de mensajes** | Mostrar los mensajes en tu app con caché y texto de respaldo si el servicio falla. | `createMessageClient(opciones).get('MSG_CODIGO')` |

Funciona igual en React, Vue, Angular o HTML plano. Los estilos van en Shadow DOM, así que no
chocan con los de tu aplicación, **pero se adaptan a ella** (sección 3).

---

## 1. Levantar el componente (equipo MessageUcoLab)

```bash
npm install          # una sola vez
npm run serve        # compila y publica http://localhost:5176/messageucolab.js
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Playground en http://localhost:5176 con tres aplicaciones simuladas (azul, verde y oscura) para ver cómo se adapta. Reenvía `/messageucolab` al backend. |
| `npm run build` | Genera `dist/messageucolab.js`, el archivo que se publica. |

---

## 2. Integrarlo en otra aplicación

Requisitos: MessageUcoLab y el componente de seguridad funcionando, y tu usuario como
administrador de la aplicación en MessageUcoLab (ver la guía paso a paso del backend).

### Paso 1 — Reenviar `/messageucolab` (mismo origen)

El navegador envía la cookie de sesión de seguridad (`SECURITY_BASELINE_SESSION`); el servidor de
tu front debe reenviar `/messageucolab` a la API para que todo salga del mismo origen.

**Vite** (`vite.config.js`):

```js
server: {
  proxy: { '/messageucolab': { target: 'http://localhost:8085', changeOrigin: true } }
}
```

**Angular** (`proxy.conf.json` + `ng serve --proxy-config proxy.conf.json`):

```json
{ "/messageucolab": { "target": "http://localhost:8085", "secure": false, "changeOrigin": true } }
```

**Spring WebFlux:** ver `ProxyConfig.java` en `InventarioWebFlux`.

### Paso 2 — Montar la pantalla

```js
const remote = await import(/* @vite-ignore */ 'http://localhost:5176/messageucolab.js')

const widget = remote.mount(document.querySelector('#mensajes'), {
  apiBaseUrl: '/messageucolab',
  applicationName: 'Asistencia UCO',        // tu aplicación en MessageUcoLab
  environmentName: 'Develop',
  lockContext: true,                        // no deja cambiar a otra aplicación
  loginUrl: 'http://localhost:5173/login'   // a dónde ir si la sesión vence
})

// al salir de la pantalla
widget.unmount()
```

No hace falta pasar colores: el widget toma el estilo de tu aplicación (sección 3).

En **HTML plano / cualquier framework** basta la etiqueta:

```html
<messageucolab-admin api-base-url="/messageucolab" application-name="Asistencia UCO"
  environment-name="Develop" lock-context></messageucolab-admin>
<script type="module" src="http://localhost:5176/messageucolab.js"></script>
```

### Paso 3 — Mostrar los mensajes en tu aplicación (desde el navegador)

```js
const { createMessageClient } = await import(/* @vite-ignore */ 'http://localhost:5176/messageucolab.js')

const mensajes = createMessageClient({
  apiBaseUrl: '/messageucolab',
  applicationName: 'Asistencia UCO',
  environmentName: 'Develop',
  fallbacks: { MSG_ASISOK: { title: 'Asistencia', content: 'La asistencia de {nombre} quedó registrada.' } }
})

const m = await mensajes.get('MSG_ASISOK', { nombre: 'Ana' })
// m = { code, title, content, source: 'api' | 'cache' | 'fallback' }
```

`get()` **nunca lanza error**: si el servicio falla devuelve el respaldo. Usa
`GET /messageucolab/v1/messages/consumer` con `X-Application-Id` y `X-Environment-Id`.

---

## 3. Estilo adaptativo

Por defecto (`theme: 'auto'`) el widget se viste con el estilo de la aplicación que lo monta:

| Qué toma | De dónde |
|---|---|
| Tipografía y color de texto | Se heredan del contenedor (Shadow DOM sin reinicio de estilos). |
| Fondo y modo oscuro | Primer fondo opaco del contenedor hacia arriba. Si es oscuro, ajusta bordes, paneles y alertas. |
| Color principal | 1) variable `--mu-accent`; 2) variables habituales: `--primary`, `--color-primary`, `--primary-color`, `--brand`, `--accent`, `--bs-primary` (Bootstrap), `--md-sys-color-primary` (Material), `--el-color-primary` (Element Plus), `--p-primary-color` (PrimeVue), `--mantine-primary-color-filled`, `--ion-color-primary`…; 3) el botón principal visible de la página (`.btn-primary`, `button[type=submit]`, …); 4) azul neutro. |
| Redondeo | `--mu-radius`, `--radius`, `--border-radius`, `--bs-border-radius` o el del botón principal. |
| Texto sobre los botones | Blanco o negro, el de mejor contraste con el color principal. |

Bordes, paneles, textos secundarios y tonos suaves se derivan de esos valores con `color-mix()`.
Si la aplicación cambia de tema en caliente (clase, `data-theme`, `data-bs-theme`, modo oscuro del
sistema), el widget lo detecta solo; también se puede forzar con `widget.refreshTheme()`.

Para ajustar a mano, cualquiera de estas formas gana sobre la detección:

```js
mount(el, { theme: { accent: '#7c3aed', radius: '6px', fontFamily: 'Inter, sans-serif' } })
```

```css
/* en la hoja de estilos de tu app */
#mensajes { --mu-accent: #7c3aed; --mu-radius: 6px; --mu-font: Inter, sans-serif; }
```

Tokens disponibles: `accent`, `accentText`, `background`, `text`, `surface`, `border`, `muted`,
`danger`, `success`, `radius`, `fontFamily`, `fontSize` (como opción) o `--mu-accent`, `--mu-on-accent`,
`--mu-bg`, `--mu-ink`, `--mu-panel`, `--mu-line`, `--mu-muted`, `--mu-danger`, `--mu-ok`, `--mu-radius`,
`--mu-font`, `--mu-font-size` (como variables CSS). `theme: 'none'` desactiva la detección.

---

## 4. Opciones

### `mount(elemento, opciones)`

| Opción | Por defecto | Descripción |
|---|---|---|
| `apiBaseUrl` | `/messageucolab` | URL base de la API (sin `/v1`). |
| `applicationName` | — | Selecciona esa aplicación. Sin ella, el usuario elige entre las suyas. |
| `environmentName` | `Develop` | Ambiente inicial (se puede cambiar en la cabecera). |
| `lockContext` | `false` | Oculta el botón "Cambiar" aplicación. |
| `loginUrl` | `http://localhost:5173/login` | Login del componente de seguridad para "Volver a conectar". |
| `title` | `Mensajes de la aplicación` | Título de la cabecera. |
| `theme` | `'auto'` | `'auto'`, `'none'` o un objeto de tokens (sección 3). |
| `pageSize` | `10` | Mensajes por página. |
| `allowApplicationCreation` | `true` | Muestra el formulario para registrar otra aplicación en Configuración. |
| `onEvent(nombre, detalle)` | — | Eventos: `context`, `created`, `updated`, `deleted`, `functionality-created`, `application-created`, `error`. |
| `onUnauthorized(error)` | — | Se llama ante un 401 (sesión vencida). |
| `seeds` | UUIDs del seed | Idiomas y estados para crear aplicaciones y funcionalidades. |

Los mismos eventos se emiten en el contenedor como `CustomEvent` `messageucolab:<nombre>`.

### `createMessageClient(opciones)`

Acepta `apiBaseUrl`, `applicationId` + `environmentId` (o `applicationName` + `environmentName`),
`fallbacks`, `cacheTtlMs`, `missTtlMs`, `timeoutMs` (4 s) y `onError(error, codigo)`.

---

## 5. Problemas frecuentes

| Síntoma | Revisar |
|---|---|
| "No fue posible conectar con MessageUcoLab" | Backend arriba, `apiBaseUrl` y proxy del paso 1. |
| "Tu sesión se perdió" | El acceso de Keycloak dura 5 minutos: pulsa **Volver a conectar**. El origen de tu app debe estar en `PDP_LOGIN_ALLOWED_RETURN_ORIGINS` del componente de seguridad. |
| "Tu usuario no administra una aplicación llamada X" | El nombre debe coincidir con el de MessageUcoLab y tu usuario debe ser su administrador. |
| No puedo crear mensajes | La app necesita al menos una funcionalidad activa (pestaña Configuración). |
| El color no es el de mi app | Define `--mu-accent` en el contenedor o pasa `theme: { accent }`. |
| El microfrontend no carga | Abre la URL del bundle en el navegador; ejecuta `npm run serve`. |
