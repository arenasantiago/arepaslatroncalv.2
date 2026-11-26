#!/usr/bin/env node
// Prueba de punta a punta del PANEL DEL DUENO en un navegador real (Node 22+ y Google Chrome).
//
// Crea dos usuarios temporales (uno administrador y otro sin permisos), recorre el panel
// como lo haria el dueno y al final BORRA todo lo que creo (usuarios, pedido, mensaje,
// producto, fotos) y restaura los ajustes. La contrasena temporal nunca se imprime.
//
// Requiere, ademas de .env (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY), la clave SECRETA en una
// variable de entorno (NUNCA en archivos versionados ni en el build):
//   SUPABASE_SECRET_KEY=sb_secret_... node scripts/e2e-panel.mjs [carpeta-capturas]
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { abrirChrome, esperar, leerEnv, servirEstatico } from './lib/navegador.mjs';

const env = leerEnv();
const URL_SB = env.SUPABASE_URL.replace(/\/+$/, '');
const CLAVE_PUBLICA = env.SUPABASE_PUBLISHABLE_KEY;
const CLAVE_SECRETA = (process.env.SUPABASE_SECRET_KEY ?? '').trim();
if (!URL_SB || !CLAVE_PUBLICA || !CLAVE_SECRETA) {
  console.error('Faltan SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY (.env) o SUPABASE_SECRET_KEY (variable de entorno).');
  process.exit(2);
}

const MARCA = 'PRUEBA AUTOMATICA';
const NOMBRE_PRODUCTO = `${MARCA} E2E`;
const SLUG_PRODUCTO = 'prueba-automatica-e2e';
const sinSesion = { auth: { persistSession: false, autoRefreshToken: false } };
const servicio = createClient(URL_SB, CLAVE_SECRETA, sinSesion); // salta RLS: solo preparar y limpiar
const publico = createClient(URL_SB, CLAVE_PUBLICA, sinSesion); // lo mismo que un visitante

const sello = Date.now();
const usuarios = {
  admin: { email: `e2e-panel-admin-${sello}@example.com`, clave: randomBytes(18).toString('base64url'), id: null },
  comun: { email: `e2e-panel-comun-${sello}@example.com`, clave: randomBytes(18).toString('base64url'), id: null },
};
const creados = { pedidoId: null, mensajeId: null, productoId: null };
let ajustesOriginales = null;

const informe = { pasos: [] };
const paso = (nombre, ok, detalle = {}) => informe.pasos.push({ ok: Boolean(ok), nombre, ...detalle });
const sinError = (r, que) => { if (r.error) throw new Error(`${que}: ${r.error.message}`); return r.data; };

async function hasta(fn, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const v = await fn();
    if (v) return v;
    await esperar(400);
  }
  return null;
}
const fotosDelProducto = async () =>
  (sinError(await servicio.storage.from('productos').list('', { search: SLUG_PRODUCTO, limit: 100 }), 'listar fotos') ?? [])
    .map((f) => f.name);

const servidor = await servirEstatico('dist/arepas-la-troncal-ang/browser', 4311);
let nav;

try {
  // ---------------- Preparacion (clave secreta) ----------------
  ajustesOriginales = sinError(await servicio.from('ajustes').select('acepta_pedidos,aviso').eq('id', true).single(), 'leer ajustes');
  for (const u of Object.values(usuarios)) {
    const r = await servicio.auth.admin.createUser({ email: u.email, password: u.clave, email_confirm: true });
    u.id = sinError(r, 'crear usuario').user.id;
  }
  sinError(await servicio.from('administradores').insert({ user_id: usuarios.admin.id, nombre: MARCA }), 'dar permisos de admin');

  // ---------------- 1) Seguridad por API: usuario con sesion pero SIN permisos ----------------
  const comun = createClient(URL_SB, CLAVE_PUBLICA, sinSesion);
  sinError(await comun.auth.signInWithPassword({ email: usuarios.comun.email, password: usuarios.comun.clave }), 'ingreso usuario comun');
  const leePedidos = await comun.from('pedidos').select('id').limit(5);
  const cambiaPrecio = await comun.from('productos').update({ precio: 1 }).eq('id', 1).select('id');
  const cambiaAjustes = await comun.from('ajustes').update({ aviso: 'hackeado' }).eq('id', true).select('aviso');
  const seHaceAdmin = await comun.from('administradores').insert({ user_id: usuarios.comun.id });
  const subeFoto = await comun.storage.from('productos').upload(`${SLUG_PRODUCTO}-intruso.webp`, new Blob(['x'], { type: 'image/webp' }), { contentType: 'image/webp' });
  const precioReal = sinError(await servicio.from('productos').select('precio').eq('id', 1).single(), 'precio real').precio;
  paso('API: usuario sin permisos no ve pedidos ni cambia nada', (leePedidos.data ?? []).length === 0 &&
    (cambiaPrecio.data ?? []).length === 0 && (cambiaAjustes.data ?? []).length === 0 && Boolean(seHaceAdmin.error) &&
    Boolean(subeFoto.error) && precioReal !== 1, {
    pedidosVistos: (leePedidos.data ?? []).length, preciosCambiados: (cambiaPrecio.data ?? []).length,
    ajustesCambiados: (cambiaAjustes.data ?? []).length, autoAscenso: seHaceAdmin.error?.code ?? 'SIN ERROR',
    subidaFoto: subeFoto.error ? 'rechazada' : 'ACEPTADA',
  });
  await comun.auth.signOut();

  // ---------------- 2) Ingreso ----------------
  nav = await abrirChrome({ base: servidor.base, carpetaCapturas: resolve(process.argv[2] || 'e2e-capturas-panel'), puertoCdp: 9334 });
  const { abrir, clic, clicTexto, escribir, texto, evaluar, esperarQue, captura, tomarProblemas, subirArchivo } = nav;
  const ingresar = async (u) => {
    await escribir('#email', u.email);
    await escribir('#clave', u.clave);
    await clic('form button[type="submit"]');
  };

  await abrir('/admin/pedidos');
  const pideIngreso = await esperarQue(`location.pathname === '/admin/ingresar' && !!document.querySelector('#email')`, 10000);
  await ingresar(usuarios.comun);
  const rechazaComun = await esperarQue(`/no tiene acceso/.test(document.querySelector('[role="alert"]')?.textContent ?? '')`, 12000);
  paso('panel: cuenta sin permisos es rechazada', pideIngreso && rechazaComun, { problemas: tomarProblemas() });

  await ingresar(usuarios.admin);
  const dentro = await esperarQue(`location.pathname === '/admin/pedidos'`, 12000);
  const enVivo = await esperarQue(`document.body.innerText.includes('En vivo')`, 15000);
  paso('panel: el administrador entra y los pedidos quedan "En vivo"', dentro && enVivo, { problemas: tomarProblemas() });

  // ---------------- 3) Pedido nuevo en vivo + cambio de estado ----------------
  const r = await publico.rpc('crear_pedido', {
    p_cliente_nombre: MARCA, p_cliente_telefono: `30${String(sello).slice(-8)}`, p_tipo_entrega: 'recoger',
    p_direccion: null, p_notas: 'Prueba E2E del panel', p_items: [{ producto_id: 1, cantidad: 3 }], p_acepta_tratamiento_datos: true,
  });
  const codigo = sinError(r, 'crear pedido de prueba').codigo;
  creados.pedidoId = sinError(await servicio.from('pedidos').select('id').eq('codigo', codigo).single(), 'id del pedido').id;
  const avisoNuevo = await esperarQue(`document.body.innerText.includes('Nuevo pedido')`, 15000);
  const tarjeta = await esperarQue(`[...document.querySelectorAll('article')].some((a) => a.textContent.includes(${JSON.stringify(codigo)}))`, 10000);
  paso('panel: el pedido nuevo aparece solo (tiempo real) con aviso', avisoNuevo && tarjeta, { codigo, problemas: tomarProblemas() });
  await captura('p1-pedidos.png');

  await evaluar(`(() => {
    const art = [...document.querySelectorAll('article')].find((a) => a.textContent.includes(${JSON.stringify(codigo)}));
    const sel = art?.querySelector('select'); if (!sel) return false;
    sel.value = 'confirmado'; sel.dispatchEvent(new Event('change', { bubbles: true })); return true;
  })()`);
  const estadoBd = await hasta(async () => {
    const f = sinError(await servicio.from('pedidos').select('estado').eq('id', creados.pedidoId).single(), 'estado');
    return f.estado === 'confirmado' ? f.estado : null;
  });
  paso('panel: cambiar estado del pedido se guarda en la BD', estadoBd === 'confirmado', { estadoBd, problemas: tomarProblemas() });

  // ---------------- 4) Productos: crear con foto, agotar, cambiar foto, eliminar ----------------
  await clic('a[href="/admin/productos"]');
  await esperarQue(`location.pathname === '/admin/productos' && document.querySelectorAll('tbody tr').length > 0`, 10000);
  await clicTexto('+ Nuevo producto');
  await esperarQue(`!!document.querySelector('#p-nombre')`, 5000);
  await escribir('#p-nombre', NOMBRE_PRODUCTO);
  await escribir('#p-desc', 'Producto creado por la prueba automatica del panel.');
  await escribir('#p-precio', '1234');
  await subirArchivo('input[type="file"]', 'src/assets/img/contodo.webp');
  await esperarQue(`document.querySelector('img[alt="Vista previa"]')?.src.startsWith('blob:')`, 5000);
  await captura('p2-producto-nuevo.png');
  await clic('form button[type="submit"]');
  const guardado = await esperarQue(`/guardado/.test(document.querySelector('[role="status"]')?.textContent ?? '')`, 20000);
  const fila = await hasta(async () =>
    (await servicio.from('productos').select('id,precio,imagen_url,disponible').eq('nombre', NOMBRE_PRODUCTO).maybeSingle()).data);
  creados.productoId = fila?.id ?? null;
  const prefijoFotos = `${URL_SB}/storage/v1/object/public/productos/`;
  const foto = fila?.imagen_url ? await fetch(fila.imagen_url) : null;
  const tipoFoto = foto?.headers.get('content-type');
  const pesoFoto = foto ? (await foto.arrayBuffer()).byteLength : 0;
  const loVeElPublico = fila ? (await publico.from('productos').select('id').eq('id', fila.id)).data?.length === 1 : false;
  paso('productos: crear con foto (WebP comprimido) y se ve en la web', guardado && fila?.precio === 1234 &&
    fila?.imagen_url?.startsWith(prefijoFotos) && foto?.status === 200 && tipoFoto === 'image/webp' && loVeElPublico,
    { precio: fila?.precio, fotoHttp: foto?.status, tipoFoto, pesoFotoKB: Math.round(pesoFoto / 1024), loVeElPublico, problemas: tomarProblemas() });

  const enFila = (accion) => evaluar(`(() => {
    const tr = [...document.querySelectorAll('tbody tr')].find((t) => t.textContent.includes(${JSON.stringify(NOMBRE_PRODUCTO)}));
    const b = tr && [...tr.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(accion)});
    if (!b) return false; b.click(); return true; })()`);
  await esperarQue(`[...document.querySelectorAll('tbody tr')].some((t) => t.textContent.includes(${JSON.stringify(NOMBRE_PRODUCTO)}))`, 8000);
  await enFila('Disponible');
  const agotado = await hasta(async () => (await servicio.from('productos').select('disponible').eq('id', creados.productoId).single()).data?.disponible === false);
  const ocultoAlPublico = (await publico.from('productos').select('id').eq('id', creados.productoId)).data?.length === 0;
  paso('productos: marcar agotado lo oculta de la web', agotado && ocultoAlPublico, { problemas: tomarProblemas() });

  const fotoAnterior = fila?.imagen_url;
  await enFila('Editar');
  await esperarQue(`document.querySelector('#p-nombre')?.value === ${JSON.stringify(NOMBRE_PRODUCTO)}`, 5000);
  await subirArchivo('input[type="file"]', 'src/assets/img/arepitaredondav2.webp');
  await esperarQue(`document.querySelector('img[alt="Vista previa"]')?.src.startsWith('blob:')`, 5000);
  await clic('form button[type="submit"]');
  await esperarQue(`/guardado/.test(document.querySelector('[role="status"]')?.textContent ?? '')`, 20000);
  const fotoNueva = (await servicio.from('productos').select('imagen_url').eq('id', creados.productoId).single()).data?.imagen_url;
  const soloUnaFoto = await hasta(async () => {
    const f = await fotosDelProducto();
    return f.length === 1 && fotoNueva?.endsWith(f[0]) ? f : null;
  });
  paso('productos: cambiar la foto borra la anterior del almacenamiento', fotoNueva && fotoNueva !== fotoAnterior && soloUnaFoto,
    { fotosEnBucket: soloUnaFoto ?? (await fotosDelProducto()), problemas: tomarProblemas() });

  await enFila('Eliminar');
  const borrado = await hasta(async () => (await servicio.from('productos').select('id').eq('id', creados.productoId)).data?.length === 0);
  const sinFotos = await hasta(async () => (await fotosDelProducto()).length === 0);
  if (borrado) creados.productoId = null;
  paso('productos: eliminar borra el producto y su foto', borrado && sinFotos, { dialogos: nav.dialogos.length, problemas: tomarProblemas() });
  await captura('p3-productos.png');

  // ---------------- 5) Mensajes: marcar leido y eliminar ----------------
  const textoMensaje = `Mensaje de prueba del panel ${sello}.`;
  sinError(await publico.rpc('enviar_mensaje_contacto', {
    p_nombre: MARCA, p_email: `e2e-panel-${sello}@example.com`, p_whatsapp: null, p_mensaje: textoMensaje, p_acepta_tratamiento_datos: true,
  }), 'crear mensaje de prueba');
  creados.mensajeId = sinError(await servicio.from('mensajes_contacto').select('id').eq('mensaje', textoMensaje).single(), 'id del mensaje').id;
  await clic('a[href="/admin/mensajes"]');
  const visible = await esperarQue(`document.body.innerText.includes(${JSON.stringify(textoMensaje)})`, 10000);
  await captura('p4-mensajes.png');
  const enMensaje = (accion) => evaluar(`(() => {
    const art = [...document.querySelectorAll('article')].find((a) => a.textContent.includes(${JSON.stringify(textoMensaje)}));
    const b = art && [...art.querySelectorAll('button')].find((x) => x.textContent.includes(${JSON.stringify(accion)}));
    if (!b) return false; b.click(); return true; })()`);
  await enMensaje('Marcar como leído');
  const leido = await hasta(async () => (await servicio.from('mensajes_contacto').select('leido').eq('id', creados.mensajeId).single()).data?.leido === true);
  const saleDeSinLeer = await esperarQue(`!document.body.innerText.includes(${JSON.stringify(textoMensaje)})`, 5000);
  await clic('input[type="checkbox"]'); // ver todos
  await esperarQue(`document.body.innerText.includes(${JSON.stringify(textoMensaje)})`, 8000);
  await enMensaje('Eliminar');
  const mensajeBorrado = await hasta(async () => (await servicio.from('mensajes_contacto').select('id').eq('id', creados.mensajeId)).data?.length === 0);
  if (mensajeBorrado) creados.mensajeId = null;
  paso('mensajes: ver, marcar leido y eliminar', visible && leido && saleDeSinLeer && mensajeBorrado, { problemas: tomarProblemas() });

  // ---------------- 6) Ajustes: aviso + pausar pedidos, y se refleja en la web ----------------
  const aviso = `${MARCA}: hoy cerramos temprano`;
  await clic('a[href="/admin/ajustes"]');
  await esperarQue(`location.pathname === '/admin/ajustes' && !!document.querySelector('#aviso')`, 8000);
  await esperar(1500); // carga de los valores actuales
  await escribir('#aviso', aviso);
  await evaluar(`(() => { const c = document.querySelector('input[formcontrolname="aceptaPedidos"]'); if (c.checked) c.click(); })()`);
  await clic('form button[type="submit"]');
  const ajustesOk = await esperarQue(`/guardados/.test(document.querySelector('[role="status"]')?.textContent ?? '')`, 10000);
  const bd = (await servicio.from('ajustes').select('acepta_pedidos,aviso').eq('id', true).single()).data;
  await captura('p5-ajustes.png');
  await abrir('/inicio');
  const avisoEnWeb = await esperarQue(`document.body.innerText.includes(${JSON.stringify(aviso)})`, 12000);
  await captura('p6-aviso-en-la-web.png');
  await abrir('/productos');
  await esperarQue(`!!document.querySelector('button[aria-label="Agregar Telas al pedido"]')`, 10000);
  await esperar(1500);
  await clic('button[aria-label="Agregar Telas al pedido"]');
  await abrir('/carrito');
  const pausado = await esperarQue(`document.body.innerText.includes('no estamos recibiendo pedidos')`, 12000);
  const sinFormulario = await evaluar(`!document.querySelector('[data-prueba="confirmar-pedido"]')`);
  await captura('p7-pedidos-pausados.png');
  paso('ajustes: aviso y pausa de pedidos se ven en la web', ajustesOk && bd?.aviso === aviso && bd?.acepta_pedidos === false &&
    avisoEnWeb && pausado && sinFormulario, { problemas: tomarProblemas() });

  // Restaurar desde el panel (la otra direccion del mismo flujo)
  await abrir('/admin/ajustes');
  await esperarQue(`document.querySelector('#aviso')?.value === ${JSON.stringify(aviso)}`, 10000);
  await escribir('#aviso', ajustesOriginales.aviso ?? '');
  await evaluar(`(() => { const c = document.querySelector('input[formcontrolname="aceptaPedidos"]'); if (c.checked !== ${ajustesOriginales.acepta_pedidos}) c.click(); })()`);
  await clic('form button[type="submit"]');
  await esperarQue(`/guardados/.test(document.querySelector('[role="status"]')?.textContent ?? '')`, 10000);
  const restaurado = (await servicio.from('ajustes').select('acepta_pedidos,aviso').eq('id', true).single()).data;
  paso('ajustes: se restauran desde el panel', restaurado?.acepta_pedidos === ajustesOriginales.acepta_pedidos &&
    (restaurado?.aviso ?? null) === (ajustesOriginales.aviso ?? null), { problemas: tomarProblemas() });

  // ---------------- 7) Celular y salida ----------------
  await nav.movil();
  await abrir('/admin/pedidos');
  await esperarQue(`document.body.innerText.includes('En vivo')`, 15000);
  const sinDesbordeMovil = await evaluar(`document.documentElement.scrollWidth <= window.innerWidth + 1`);
  await captura('p8-movil-pedidos.png');
  paso('celular: el panel no se desborda a lo ancho', sinDesbordeMovil, {
    anchoPagina: await evaluar('document.documentElement.scrollWidth'), problemas: tomarProblemas(),
  });
  await nav.escritorio();
  await clicTexto('Salir', 'header');
  const afuera = await esperarQue(`location.pathname === '/admin/ingresar'`, 8000);
  await abrir('/admin/pedidos');
  const protegido = await esperarQue(`location.pathname === '/admin/ingresar'`, 10000);
  paso('salir cierra la sesion y el panel vuelve a pedir ingreso', afuera && protegido, { problemas: tomarProblemas() });
} catch (e) {
  informe.fatal = String((e && e.stack) || e);
} finally {
  // ---------------- Limpieza (siempre) ----------------
  const limpieza = [];
  const intentar = async (que, fn) => { try { await fn(); limpieza.push(`ok ${que}`); } catch (e) { limpieza.push(`FALLO ${que}: ${e.message}`); } };
  if (ajustesOriginales) await intentar('ajustes', async () => sinError(await servicio.from('ajustes').update(ajustesOriginales).eq('id', true), 'restaurar'));
  if (creados.pedidoId) await intentar('pedido', async () => sinError(await servicio.from('pedidos').delete().eq('id', creados.pedidoId), 'borrar pedido'));
  if (creados.mensajeId) await intentar('mensaje', async () => sinError(await servicio.from('mensajes_contacto').delete().eq('id', creados.mensajeId), 'borrar mensaje'));
  if (creados.productoId) await intentar('producto', async () => sinError(await servicio.from('productos').delete().eq('id', creados.productoId), 'borrar producto'));
  await intentar('fotos', async () => {
    const f = await fotosDelProducto();
    if (f.length) sinError(await servicio.storage.from('productos').remove(f), 'borrar fotos');
  });
  for (const u of Object.values(usuarios)) {
    if (u.id) await intentar(`usuario ${u.email.split('@')[0]}`, async () => sinError(await servicio.auth.admin.deleteUser(u.id), 'borrar usuario'));
  }
  informe.limpieza = limpieza;
  informe.archivos404 = servidor.servidos.filter((s) => s.startsWith('404'));
  informe.resumen = `${informe.pasos.filter((p) => p.ok).length}/${informe.pasos.length} pasos OK`;
  console.log(JSON.stringify(informe, null, 1));
  await nav?.cerrar();
  servidor.cerrar();
  process.exit(informe.fatal || informe.pasos.some((p) => !p.ok) || limpieza.some((l) => l.startsWith('FALLO')) ? 1 : 0);
}
