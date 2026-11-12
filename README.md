# minifront-mensajes — microfrontend de MessageUcoLab

Componente para que **cualquier aplicación del semillero** administre y muestre sus mensajes de
MessageUcoLab sin escribir código contra la API. Trae una capa para **Vue 3**, que es lo que usan
todos los equipos, y funciona también en cualquier otro front.

| Pieza | Para qué sirve | En Vue |
|---|---|---|
| **Administración de mensajes** | Listar, crear, editar, consultar, traducir e importar por Excel los mensajes de *tu* aplicación. Necesita la sesión de seguridad | `<MessageUcoLabAdmin>` |
| **Cliente de mensajes** | Mostrar los textos en tu pantalla con caché y texto de respaldo. Usa la ruta pública: el usuario no necesita iniciar sesión | `useMensajes()` y `useMensaje()` |

Los estilos van en Shadow DOM, así que no chocan con los de tu aplicación, **pero se adaptan a ella**
(sección 3). Ejemplo completo: [InventarioWebFlux-Frontend](https://github.com/Jciro17/InventarioWebFlux-Frontend).

---

## 1. Instalarlo en tu front Vue

Requisitos: MessageUcoLab y el componente de seguridad funcionando (guía de integración, pasos 0 a 4).

```bash
npm install github:Jciro17/minifront-mensajes
```

Al instalarse se compila solo (`prepare`). Para actualizarlo a la última versión, repite el comando.

---

## 2. Integrarlo

### Paso 1 — Reenviar `/messageucolab` (mismo origen)

El navegador envía la cookie de sesión de seguridad (`SECURITY_BASELINE_SESSION`) solo si la llamada
sale del mismo origen que tu pantalla. En `vite.config.js`:

```js
server: {
  proxy: {
    '/messageucolab': {
      target: 'http://localhost:8000',   // MessageUcoLab por Kong
      changeOrigin: true,
      timeout: 0,                     // El canal SSE es de larga duración
      proxyTimeout: 0,
      // Sin esto, MessageUcoLab rechaza con 403 los POST/PUT/DELETE de un origen que no conoce
      configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin'))
    }
  }
}
```

### Paso 2 — Registrar el plugin (`main.js`)

```js
import { MessageUcoLabPlugin } from 'minifront-mensajes/vue'

app.use(MessageUcoLabPlugin, {
  apiBaseUrl: '/messageucolab',
  applicationId: import.meta.env.VITE_MESSAGEUCOLAB_APPLICATION_ID,   // guía, paso 7
  environmentId: import.meta.env.VITE_MESSAGEUCOLAB_ENVIRONMENT_ID,
  // Textos de respaldo: los que hoy están escritos en tu pantalla, con los mismos marcadores {…}
  fallbacks: {
    MSG_INVALID: { title: 'Datos incompletos', content: 'Revisa el formulario.' }
  }
})
```

### Paso 3 — Mostrar los mensajes

**En un evento** (validaciones, confirmaciones):

```js
import { useMensajes } from 'minifront-mensajes/vue'

const mensajes = useMensajes()
const m = await mensajes.get('MSG_INVALID')            // { code, title, content, source }
const n = await mensajes.get('MSG_STOCKLOW', { nombre: 'Mouse', cantidad: '3' })
```

**En la plantilla**, reactivo (se vuelve a armar cuando cambian las variables):

```vue
<script setup>
import { useMensaje } from 'minifront-mensajes/vue'
const props = defineProps({ producto: Object })
const aviso = useMensaje('MSG_STOCKLOW', () => ({ nombre: props.producto.nombre, cantidad: String(props.producto.cantidad) }))
</script>

<template><li>{{ aviso.content }}</li></template>
```

`get()` **nunca lanza error**: si MessageUcoLab falla devuelve el respaldo con `source: 'fallback'`.
Usa las rutas de consumo `GET /messageucolab/v1/messages/consumer?code={código}` (y
`POST /messageucolab/v1/messages/consumer/translations` cuando pides un idioma) con la sesión del componente de
seguridad, `X-Application-Id` y `X-Environment-Id`. Para mostrar mensajes a usuarios sin sesión, pídelos a tu
backend: él consulta MessageUcoLab con su identidad de servicio (cliente Java).

> Si tu backend ya responde el texto resuelto (guía, paso 8), la pantalla solo lo muestra: no hace
> falta pedirlo otra vez.

### Paso 4 — Administrar los mensajes dentro de tu aplicación

```vue
<script setup>
import { MessageUcoLabAdmin } from 'minifront-mensajes/vue'
</script>

<template>
  <MessageUcoLabAdmin
    application-name="Inventario UCO"
    environment-name="Develop"
    login-url="http://localhost:5173/login"
    lock-context
  />
</template>
```

Necesita la sesión del componente de seguridad. Si no la hay, el minifront muestra un botón para
iniciarla y seguridad devuelve al usuario a tu pantalla. Para eso, la dirección de tu front debe estar
en `PDP_SECURITY_CORS_ALLOWED_ORIGINS` y `PDP_LOGIN_ALLOWED_RETURN_ORIGINS` del `.env` de seguridad.

### Otros fronts (React, Angular, HTML)

Con el mismo paquete, sin la capa de Vue:

```js
import { mount, createMessageClient } from 'minifront-mensajes'

const widget = mount(document.querySelector('#mensajes'), { apiBaseUrl: '/messageucolab', applicationName: 'Asistencia UCO' })
widget.unmount()   // al salir de la pantalla
```

O la etiqueta `<messageucolab-admin api-base-url="/messageucolab" application-name="Asistencia UCO" lock-context>`.

### Funcionalidades y actualizaciones automáticas de administración

La sección **Configuración** muestra nombre, estado y una acción **Activar/Inactivar** por funcionalidad. Antes de guardar se solicita confirmación explícita:

- Inactivar una funcionalidad inactiva todos sus mensajes, en todos los ambientes, sin eliminarlos.
- Activarla nuevamente no reactiva sus mensajes; conservan el estado anterior.
- Solo las funcionalidades activas pueden seleccionarse al crear mensajes. No se permite activar un mensaje si su funcionalidad está inactiva; el backend vuelve a validar estas reglas.

El formulario para crear funcionalidades se presenta separado del listado. Configuración no permite registrar otras aplicaciones; estas se crean desde el frontend administrativo de MessageUcoLab.

La administración usa estos contratos existentes del backend:

| Método | Ruta bajo `/messageucolab/v1` | Contexto |
|---|---|---|
| `PATCH` | `/application/functionality/{functionalityId}/state` | Cuerpo `{ applicationId, stateId }`, sesión y aplicación propia |
| `GET` | `/messages/events` | `Accept: text/event-stream`, `X-Application-Id` y cookie BFF |

Ambas rutas requieren su permiso en el PEP. Un permiso POST de creación no sustituye al PATCH o al GET de eventos. La configuración de seguridad y sus despliegues los gestiona su responsable; este paquete no los cambia ni maneja tokens.

El listado se actualiza con `MessageCreated`, `MessageUpdated`, `MessageDeleted`, `MessageChanged` y `MessagesChanged`. Esta última señal se reserva para cambios colectivos, como la inactivación por funcionalidad. `heartbeat` no dispara consultas. Al conectar o reconectar, se recupera el estado actual; las ráfagas se agrupan sin recargar la página.

Se conservan la búsqueda por código, el ambiente y la página válida. Los formularios y archivos de importación no se reemplazan por una actualización de fondo. Los catálogos se refrescan al abrir Configuración o Crear, al conectar y ante cambios colectivos. Una respuesta anterior de otra aplicación o ambiente no puede sobrescribir el contexto actual. Cambiar de contexto o desmontar el componente cierra la suscripción y cancela sus reintentos y refrescos pendientes.

Si el canal se interrumpe se reintenta automáticamente con espera progresiva. Un `403` muestra un aviso de autorización y no genera reintentos infinitos. El botón **Reconectar actualizaciones** permite reabrir el canal sin recargar después de corregir el permiso. Un `401` conserva el flujo normal de sesión vencida.

SSE avisa después de actualizar las proyecciones de lectura. Sigue siendo asíncrono y en memoria: puede haber varias señales por acción y no existe replay durable ni reparto automático entre réplicas.

**Esto no sincroniza la caché pública de `createMessageClient` ni de `useMensajes()`.** Esos clientes siguen usando TTL y no abren un canal administrativo con sesión. El GET inicial con cursor, historial persistente de cambios y SSE para cachés consumidoras es una mejora futura distinta.

Para incorporar una versión nueva en una aplicación que instala este paquete, primero hay que publicar el commit y actualizar la dependencia Git a esa revisión. Si se consume por URL, volver a generar y publicar ambos bundles de `dist`; compilar este repositorio no actualiza automáticamente los paquetes ya instalados en otras aplicaciones.

### Desarrollo del minifront

| Comando | Qué hace |
|---|---|
| `npm run dev` | Playground en http://localhost:5176 con tres aplicaciones simuladas para ver cómo se adapta. Reenvía `/messageucolab` al backend |
| `npm run build` | Genera `dist/messageucolab.js` y `dist/vue.js` |
| `npm run serve` | Compila y publica `http://localhost:5176/messageucolab.js` para importarlo por URL |

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
| `allowApplicationCreation` | — | Obsoleta, sin efecto. Configuración ya no permite registrar aplicaciones. |
| `onEvent(nombre, detalle)` | — | Eventos: `context`, `created`, `updated`, `deleted`, `functionality-created`, `functionality-state-changed`, `imported`, `server-event`, `events-status`, `error`. |
| `onUnauthorized(error)` | — | Se llama ante un 401 (sesión vencida). |
| `seeds` | UUIDs del seed | `functionalityStates` define los estados para crear funcionalidades. |

Los mismos eventos se emiten en el contenedor como `CustomEvent` `messageucolab:<nombre>`.

`functionality-state-changed` contiene `{ applicationId, functionalityId, stateId, active }` después de un PATCH exitoso. `server-event` expone las notificaciones SSE aceptadas para el contexto actual; no se confunde con los eventos de mutaciones locales `created`, `updated` y `deleted`. `events-status` contiene `{ applicationId, status }`, con estados como `connecting`, `connected`, `reconnecting`, `forbidden` o `disconnected`.

La instancia de `mount()` ofrece `reconnectEvents()` para reabrir el canal y la propiedad de lectura `eventsStatus` para conocer su estado.

En Vue, `<MessageUcoLabAdmin>` recibe estas opciones como props en kebab-case
(`application-name`, `lock-context`…), emite `@event` con `{ name, detail }` y `@unauthorized`, y
expone `refresh()`, `reload()`, `reconnectEvents()` y `refreshTheme()`. Si cambia una prop, se vuelve a montar y se cierra la suscripción anterior.

### `createMessageClient(opciones)`

Acepta `apiBaseUrl`, `applicationId` + `environmentId` (o `applicationName` + `environmentName`),
`fallbacks`, `cacheTtlMs`, `missTtlMs`, `timeoutMs` (4 s) y `onError(error, codigo)`.

Son las mismas opciones de `app.use(MessageUcoLabPlugin, opciones)`. `useMensajes()` devuelve este
cliente: `get`, `text`, `preload`, `clearCache` y `setFallbacks`.

---

## 5. Problemas frecuentes

| Síntoma | Revisar |
|---|---|
| "No fue posible conectar con MessageUcoLab" | Backend arriba, `apiBaseUrl` y proxy del paso 1. |
| "Tu sesión se perdió" | El acceso de Keycloak dura 5 minutos: pulsa **Volver a conectar**. El origen de tu app debe estar en `PDP_LOGIN_ALLOWED_RETURN_ORIGINS` del componente de seguridad. |
| "Tu usuario no administra una aplicación llamada X" | El nombre debe coincidir con el de MessageUcoLab y tu usuario debe ser su administrador. |
| No puedo crear mensajes | La app necesita al menos una funcionalidad activa (pestaña Configuración). |
| El listado no se actualiza automáticamente | Revisar GET `/messageucolab/v1/messages/events`, su permiso PEP y que el proxy entregue `text/event-stream` sin buffering ni timeout corto. No sustituirlo por una respuesta HTML `200`. |
| No puedo inactivar una funcionalidad | Revisar el permiso PATCH de `/messageucolab/v1/application/functionality/{functionalityId}/state`. |
| El color no es el de mi app | Define `--mu-accent` en el contenedor o pasa `theme: { accent }`. |
| El microfrontend no carga | Abre la URL del bundle en el navegador; ejecuta `npm run serve`. |
