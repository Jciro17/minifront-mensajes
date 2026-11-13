/**
 * minifront-mensajes para Vue 3.
 *
 * El microfrontend es JavaScript sin framework; este archivo lo envuelve para usarlo como cualquier
 * componente o composable de Vue:
 *
 *   // main.js
 *   import { MessageUcoLabPlugin } from 'minifront-mensajes/vue'
 *   app.use(MessageUcoLabPlugin, {
 *     apiBaseUrl: '/messageucolab',                    // proxy de Vite hacia MessageUcoLab
 *     applicationId: '...', environmentId: '...',      // consumo con la sesión del propietario
 *     fallbacks: { MSG_INVALID: { title: 'Datos inválidos', content: 'Revisa el formulario.' } }
 *   })
 *
 *   // Administración de mensajes dentro de tu aplicación (necesita la sesión de seguridad)
 *   <MessageUcoLabAdmin application-name="Inventario UCO" environment-name="Develop" lock-context />
 *
 *   // Un texto que se muestra en la plantilla y se actualiza solo
 *   const bienvenida = useMensaje('MSG_BIENVENIDA', () => ({ nombre: usuario.value }))
 *   // {{ bienvenida.title }} — {{ bienvenida.content }}
 *
 *   // Un texto que se pide en un evento
 *   const mensajes = useMensajes()
 *   const m = await mensajes.get('MSG_INVALID')
 */
import { defineComponent, h, inject, onBeforeUnmount, onMounted, reactive, ref, toValue, watch } from 'vue';
import { createMessageClient, mount } from './messageucolab.js';

const CLIENT_KEY = Symbol('messageucolab-client');

/** Quita las opciones vacías para que no tapen los valores por defecto del microfrontend. */
function defined(options) {
  return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined && value !== null));
}

/** Microfrontend de administración de mensajes como componente de Vue. */
export const MessageUcoLabAdmin = defineComponent({
  name: 'MessageUcoLabAdmin',
  props: {
    apiBaseUrl: { type: String, default: '/messageucolab' },
    applicationName: String,
    environmentName: String,
    loginUrl: String,
    title: String,
    lockContext: Boolean,
    lockEnvironment: Boolean,
    allowApplicationCreation: { type: Boolean, default: undefined },
    pageSize: Number,
    theme: { type: [String, Object], default: undefined }
  },
  emits: ['event', 'unauthorized'],
  setup(props, { emit, expose }) {
    const host = ref(null);
    let widget = null;

    function render() {
      widget?.unmount();
      widget = mount(host.value, defined({
        ...props,
        onEvent: (name, detail) => emit('event', { name, detail }),
        onUnauthorized: (error) => emit('unauthorized', error)
      }));
    }

    onMounted(render);
    // Si cambia la aplicación, el ambiente u otra opción, se vuelve a montar con los datos nuevos.
    watch(() => ({ ...props }), render, { deep: true });
    onBeforeUnmount(() => widget?.unmount());

    expose({
      refresh: () => widget?.refresh(),
      reload: () => widget?.reload(),
      reconnectEvents: () => widget?.reconnectEvents(),
      refreshTheme: () => widget?.refreshTheme()
    });
    return () => h('div', { ref: host });
  }
});

/** Registra el cliente de mensajes y el componente <MessageUcoLabAdmin> en toda la aplicación. */
export const MessageUcoLabPlugin = {
  install(app, options = {}) {
    app.provide(CLIENT_KEY, createMessageClient(options));
    app.component('MessageUcoLabAdmin', MessageUcoLabAdmin);
  }
};

/**
 * Cliente de mensajes registrado con MessageUcoLabPlugin. Sus métodos nunca lanzan excepción:
 * get(code, vars) devuelve { code, title, content, source: 'api' | 'cache' | 'fallback', error? }.
 */
export function useMensajes() {
  const client = inject(CLIENT_KEY, null);
  if (!client) throw new Error('useMensajes(): registra antes MessageUcoLabPlugin con app.use().');
  return client;
}

/**
 * Un mensaje reactivo para la plantilla. `vars` puede ser un objeto, un ref o una función: cuando
 * cambia, el texto se vuelve a armar. Mientras llega muestra el texto de respaldo.
 */
export function useMensaje(code, vars) {
  const client = useMensajes();
  const message = reactive({ code, title: '', content: '', source: 'loading', error: undefined });
  watch(
    () => [toValue(code), toValue(vars)],
    async ([currentCode, currentVars]) => {
      Object.assign(message, { error: undefined }, await client.get(currentCode, currentVars || undefined));
    },
    { immediate: true, deep: true }
  );
  return message;
}
