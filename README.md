# MessageUcoLab Widget — Guía de integración

Componente para que **cualquier aplicación de la universidad** use el catálogo de mensajes
MessageUcoLab (backend `NosGraduamos-FC`) sin escribir código contra la API.

Trae dos piezas en un solo archivo (`messageucolab.js`, ~12 KB gzip, sin dependencias):

| Pieza | Para qué sirve | Cómo se usa |
|---|---|---|
| **Microfrontend de administración** | Pantalla para listar, crear, consultar y traducir los mensajes de *tu* aplicación, y crear sus funcionalidades. | `mount(div, opciones)` o la etiqueta `<messageucolab-admin>` |
| **Cliente de mensajes** | Mostrar los mensajes en tu app (avisos, errores, confirmaciones) con caché y texto de respaldo si el servicio falla. | `createMessageClient(opciones).get('MSG_CODIGO')` |

Funciona igual en React, Vue, Angular o HTML plano: los estilos van en Shadow DOM, así que
no se mezclan con los de tu aplicación.

---

## 1. Levantar el componente (equipo MessageUcoLab)

```bash
cd MessageUcoLab-Widget
npm install          # una sola vez
npm run serve        # compila y publica http://localhost:5176/messageucolab.js
```

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Playground en http://localhost:5176 para probar el widget mientras se desarrolla (reenvía `/messageucolab` al backend de `.env`). |
| `npm run mock` | Backend **simulado** en http://localhost:8099 con el mismo contrato. Útil para equipos que aún no tienen Docker arriba. Bearer: `simulated-access-token`. |
| `npm run build` | Genera `dist/messageucolab.js`, el archivo que se publica. |

---

## 2. Integrarlo en otra aplicación (equipos consumidores)

### Paso 1 — Variables de entorno

```env
# A dónde llegan las llamadas del navegador (relativo = pasa por el proxy del host)
VITE_MESSAGEUCOLAB_API_URL=/messageucolab
# Dónde está publicado el componente
VITE_MESSAGEUCOLAB_UI_URL=http://localhost:5176/messageucolab.js
# Nombre EXACTO de tu aplicación en MessageUcoLab y el ambiente
VITE_MESSAGEUCOLAB_APP_NAME=MiAplicacion
VITE_MESSAGEUCOLAB_ENV_NAME=Develop
```

### Paso 2 — Proxy de desarrollo (evita problemas de CORS)

El backend hoy no publica cabeceras CORS. La forma más simple es que el servidor de
desarrollo de tu frontend reenvíe `/messageucolab` al backend; para el navegador todo sale del
mismo origen.

**Vite** (`vite.config.js`):

```js
server: {
  proxy: { '^/messageucolab/.*': { target: 'http://localhost:8085', changeOrigin: true } }
}
```

**Create React App** (`package.json`): `"proxy": "http://localhost:8085"`

**Angular** (`proxy.conf.json` + `ng serve --proxy-config proxy.conf.json`):

```json
{ "/messageucolab": { "target": "http://localhost:8085", "secure": false, "changeOrigin": true } }
```

`8085` es la API directa; `8000` es el gateway Kong; `8099` es el mock.

### Paso 3 — Pantalla de administración

Crea una ruta (por ejemplo `/mensajes`) con un contenedor vacío y monta el componente:

```js
const remote = await import(/* @vite-ignore */ import.meta.env.VITE_MESSAGEUCOLAB_UI_URL)

const widget = remote.mount(document.querySelector('#mensajes'), {
  apiBaseUrl: import.meta.env.VITE_MESSAGEUCOLAB_API_URL,
  getToken: () => miSesion.token,                 // ver sección 4
  applicationName: import.meta.env.VITE_MESSAGEUCOLAB_APP_NAME,
  environmentName: import.meta.env.VITE_MESSAGEUCOLAB_ENV_NAME,
  lockContext: true,                              // no deja cambiar a otra aplicación
  theme: { accent: '#116149', radius: '12px' }
})

// al salir de la pantalla
widget.unmount()
```

En **React**:

```jsx
function MensajesPage() {
  const ref = useRef(null)
  useEffect(() => {
    let handle
    import(/* @vite-ignore */ UI_URL).then((m) => { handle = m.mount(ref.current, opciones) })
    return () => handle?.unmount()
  }, [])
  return <div ref={ref} />
}
```

En **HTML plano / cualquier framework** basta la etiqueta:

```html
<messageucolab-admin
  api-base-url="/messageucolab"
  token="simulated-access-token"
  application-name="MiAplicacion"
  environment-name="Develop"
  lock-context></messageucolab-admin>
<script type="module" src="http://localhost:5176/messageucolab.js"></script>
```

### Paso 4 — Mostrar los mensajes en tu aplicación

```js
const { createMessageClient } = await import(/* @vite-ignore */ UI_URL)

const mensajes = createMessageClient({
  apiBaseUrl: '/messageucolab',
  getToken: () => miSesion.token,
  context: { applicationName: 'MiAplicacion', environmentName: 'Develop' },
  fallbacks: {
    MSG_STOCKLOW: { title: 'Stock bajo', content: 'Quedan {cantidad} unidades de {nombre}.' }
  }
})

const m = await mensajes.get('MSG_STOCKLOW', { cantidad: 2, nombre: 'Teclado' })
// m = { code, title, content, source: 'api' | 'cache' | 'fallback' }
```

- `get()` **nunca lanza error**: si el servicio no responde, el mensaje no existe o el token
  falla, devuelve el texto de `fallbacks` (con `source: 'fallback'` y `error`). Tu app sigue
  funcionando aunque MessageUcoLab esté caído.
- Las variables `{nombre}` del contenido se reemplazan con el segundo parámetro.
- Caché de 5 minutos por defecto (`cacheTtlMs`); `mensajes.clearCache()` la limpia.
- Usa `GET /messageucolab/v1/messages/resolve?code=` (el endpoint pensado para consumidores).
  Si el backend desplegado aún no lo tiene, cambia solo a `GET /messages?code=`.

Ejemplo completo y funcionando: la carpeta **`Inventario-Demo`**
(`src/messages/messageucolab.js` es el único archivo de integración que hay que copiar).

---

## 3. Opciones

### `mount(elemento, opciones)`

| Opción | Por defecto | Descripción |
|---|---|---|
| `apiBaseUrl` | `/messageucolab` | URL base de la API (sin `/v1`). |
| `getToken` / `token` | — | Credencial de identidad; se envía como `Authorization: Bearer`. `getToken` puede ser asíncrona. |
| `applicationName` | — | Selecciona automáticamente el contexto de esa aplicación. Sin ella, el usuario elige. |
| `environmentName` | primer ambiente | `Develop`, `Testing` o `Production`. |
| `lockContext` | `false` | Oculta el botón "Cambiar" contexto. |
| `title` | `Mensajes de la aplicación` | Título de la cabecera. |
| `theme` | — | `{ accent, radius, fontFamily }`. |
| `pageSize` | `10` | Mensajes por página. |
| `allowApplicationCreation` | `true` | Muestra el formulario para registrar otra aplicación en Configuración. |
| `onEvent(nombre, detalle)` | — | Eventos: `context`, `created`, `functionality-created`, `application-created`, `error`. |
| `onUnauthorized(error)` | — | Se llama ante un 401 (p. ej. para redirigir al login). |
| `seeds` | UUIDs del seed | Idiomas y estados para crear aplicaciones/funcionalidades, si cambian en la base. |

Los mismos eventos se emiten en el contenedor como `CustomEvent` `messageucolab:<nombre>`.

### `createMessageClient(opciones)`

Acepta `apiBaseUrl`, `getToken`/`token`, `context`, `fallbacks`, `cacheTtlMs`, `missTtlMs`,
`timeoutMs` (4 s), `onError(error, codigo)` y, en lugar del Bearer,
`integrationToken` (header `Token` del ambiente, el mecanismo de integración del backend).

---

## 4. Autenticación hoy y con el componente de seguridad

- **Hoy (laboratorio):** el backend corre en modo simulado (`SIMULATED_SECURITY_ENABLED=true`)
  y acepta `Authorization: Bearer <SIMULATED_SECURITY_TOKEN>` — el frontend administrativo
  usa `simulated-access-token`. Ese valor se pasa en `token`/`getToken`.
- **Con Security Baseline:** el widget no cambia. El host obtiene la credencial de su sesión y
  la entrega en `getToken`, y usa `onUnauthorized` para mandar al login
  (`requireSession()` del manual). Ningún token se guarda dentro del componente.
- La identidad tiene **un contexto activo** en el servidor. El widget y el cliente seleccionan
  el de `applicationName`/`environmentName`; si la misma identidad simulada se usa en varias
  apps a la vez, la última que selecciona gana.

---

## 5. Producción: CORS o mismo origen

El proxy del paso 2 solo existe en desarrollo. En un despliegue real hay dos opciones:

1. **Mismo origen (recomendado):** el servidor web de la app (Nginx, etc.) reenvía
   `/messageucolab` al gateway. No hay que tocar el backend.
2. **CORS en Kong:** si las apps llaman directamente al gateway, agregar el plugin en
   `deployment/docker/kong.yaml` del backend (orígenes exactos, nunca `*` con credenciales):

```yaml
plugins:
  - name: cors
    service: message-service
    config:
      origins: ["http://localhost:5174", "https://mi-app.uco.edu.co"]
      methods: [GET, POST, PUT, OPTIONS]
      headers: [Authorization, Token, Content-Type, Accept, X-Correlation-ID]
      credentials: true
```

El bundle `messageucolab.js` se puede publicar en cualquier servidor estático o CDN
(con `Access-Control-Allow-Origin` para que otros orígenes lo importen), o copiarse dentro del
proyecto consumidor.

---

## 6. Problemas frecuentes

| Síntoma | Revisar |
|---|---|
| "No fue posible conectar con MessageUcoLab" | Backend arriba, `apiBaseUrl` y proxy del host. |
| 401 | Token: en modo simulado debe ser igual a `SIMULATED_SECURITY_TOKEN` del backend. |
| "Tu usuario no tiene un contexto para la aplicación X" | El nombre debe coincidir exactamente con el registrado. El widget muestra los contextos disponibles; desde uno de ellos se puede registrar la app en Configuración. |
| No puedo crear mensajes | La app necesita al menos una funcionalidad (pestaña Configuración). |
| El mensaje nuevo no aparece | El backend tiene consistencia eventual: espera unos segundos y pulsa Actualizar. |
| El microfrontend no carga | Abre la URL del bundle en el navegador; ejecuta `npm run serve`. |
