#!/usr/bin/env node
// Prueba de punta a punta de la web publica en un navegador real (Node 22+ y Google Chrome).
// Recorre la web como un cliente: menu -> carrito -> pedido REGISTRADO en Supabase ->
// enlace de WhatsApp -> contacto -> panel protegido.
//
// OJO: crea un pedido y un mensaje reales marcados "PRUEBA AUTOMATICA" en la base de datos
// configurada. Se borran con supabase/limpiar-datos-prueba.sql.
//
// Uso:  npm run build && node scripts/e2e-navegador.mjs [carpeta-capturas]
import { resolve } from 'node:path';
import { abrirChrome, esperar, servirEstatico } from './lib/navegador.mjs';

const MARCA = 'PRUEBA AUTOMATICA';
const servidor = await servirEstatico('dist/arepas-la-troncal-ang/browser', 4310);
const informe = { pasos: [] };
const paso = (nombre, ok, detalle = {}) => informe.pasos.push({ ok: Boolean(ok), nombre, ...detalle });
let nav;

try {
  nav = await abrirChrome({ base: servidor.base, carpetaCapturas: resolve(process.argv[2] || 'e2e-capturas') });
  const { abrir, hidratada, estadoPagina, clic, escribir, texto, evaluar, esperarQue, captura, tomarProblemas } = nav;

  // 1) Raiz -> /inicio, pagina prerenderizada e hidratada
  await abrir('/');
  const redirige = await esperarQue(`location.pathname === '/inicio'`, 10000);
  await esperarQue(`document.readyState === 'complete'`);
  const inicioOk = await hidratada();
  const inicio = await estadoPagina();
  const tarjetasInicio = await evaluar(`document.querySelectorAll('app-producto-card').length`);
  paso('raiz redirige a /inicio y la pagina se hidrata', redirige && inicioOk && inicio.navbarReutilizado && inicio.footerReutilizado && tarjetasInicio >= 4,
    { ...inicio, tarjetasInicio, problemas: tomarProblemas() });
  await captura('01-inicio.png');

  // 2) Menu: agregar productos
  await abrir('/productos');
  const prodOk = await hidratada();
  const productos = await evaluar(`[...document.querySelectorAll('app-producto-card')].map((c) => ({ nombre: c.querySelector('h3')?.textContent.trim(), precio: c.querySelector('span')?.textContent.replace(/\\s+/g, ' ').trim() }))`);
  await clic('button[aria-label="Agregar Telas al pedido"]');
  await clic('button[aria-label="Agregar Telas al pedido"]');
  await clic('button[aria-label="Agregar Redonda al pedido"]');
  await esperar(400);
  const contador = await texto('[data-prueba="contador-carrito"]');
  const barra = await texto('[data-prueba="ver-pedido"]');
  paso('menu: agregar 2 Telas + 1 Redonda', prodOk && contador === '3' && /2\.400/.test(barra ?? ''),
    { productos, contador, barra, ...(await estadoPagina()), problemas: tomarProblemas() });
  await captura('02-menu.png');

  // 3) Carrito (navegacion interna) y persistencia al recargar
  await clic('a[href="/carrito"]');
  await esperarQue(`location.pathname === '/carrito' && document.querySelectorAll('[data-prueba="linea-carrito"]').length === 2`, 8000);
  const totalCarrito = await texto('[data-prueba="total-carrito"]');
  await abrir('/carrito');
  const persiste = await esperarQue(`document.querySelectorAll('[data-prueba="linea-carrito"]').length === 2`, 8000);
  paso('carrito: total y persistencia tras recargar', /2\.400/.test(totalCarrito ?? '') && persiste,
    { totalCarrito, persisteTrasRecargar: persiste, problemas: tomarProblemas() });

  // 4) Validacion del formulario; el aviso desaparece al corregir los datos
  await clic('[data-prueba="confirmar-pedido"]');
  await esperar(300);
  const errorForm = await texto('[data-prueba="error-pedido"]');
  const camposInvalidos = await evaluar(`document.querySelectorAll('form [aria-invalid="true"]').length`);
  paso('formulario vacio: no envia y marca errores', /Revisa/.test(errorForm ?? '') && camposInvalidos >= 2, { errorForm, camposInvalidos });

  // 5) Pedido real: se registra en Supabase y arma el enlace de WhatsApp
  const telefono = '30' + String(Date.now()).slice(-8);
  await escribir('#nombre', MARCA);
  await escribir('#telefono', telefono);
  await clic('input[value="domicilio"]');
  await esperarQue(`!!document.querySelector('#direccion')`, 3000);
  await escribir('#direccion', 'Calle de prueba 123, barrio E2E');
  await escribir('#notas', 'Prueba E2E: no preparar');
  await clic('input[formcontrolname="aceptaDatos"]');
  await esperar(200);
  const avisoTrasCorregir = await texto('[data-prueba="error-pedido"]');
  paso('el aviso de validacion se quita al corregir', avisoTrasCorregir === null, { avisoTrasCorregir });
  await captura('03-carrito.png');
  await clic('[data-prueba="confirmar-pedido"]');
  const confirmado = await esperarQue(`!!document.querySelector('[data-prueba="codigo-pedido"]')`, 15000);
  const codigo = await texto('[data-prueba="codigo-pedido"]');
  const totalConfirmado = await texto('[data-prueba="total-confirmado"]');
  const enlace = await evaluar(`document.querySelector('[data-prueba="enviar-whatsapp"]')?.href ?? null`);
  const url = enlace ? new URL(enlace) : null;
  const mensaje = url?.searchParams.get('text') ?? '';
  const carritoVacio = await evaluar(`localStorage.getItem('arepas.carrito.v1') === null`);
  paso('pedido registrado con codigo y enlace de WhatsApp', confirmado && /^AT-[A-HJ-NP-Z2-9]{6}$/.test(codigo ?? '') &&
    /2\.400/.test(totalConfirmado ?? '') && url?.host === 'wa.me' && mensaje.includes(codigo) && mensaje.includes('Calle de prueba 123') && carritoVacio,
    { codigo, totalConfirmado, whatsappDestino: url?.pathname, mensaje, carritoVacio, problemas: tomarProblemas() });
  await captura('04-pedido-registrado.png');

  // 6) Contacto: mensaje guardado en Supabase
  await abrir('/contacto');
  await hidratada();
  await escribir('#nombre', MARCA);
  await escribir('#email', `prueba+e2e${Date.now()}@example.com`);
  await escribir('#mensaje', 'Mensaje de prueba automatica E2E.');
  await clic('input[formcontrolname="aceptaDatos"]');
  await clic('form button[type="submit"]');
  const contactoOk = await esperarQue(`!!document.querySelector('[data-prueba="contacto-ok"]')`, 12000);
  paso('contacto: mensaje guardado', contactoOk, { ...(await estadoPagina()), problemas: tomarProblemas() });

  // 7) Panel: sin sesion redirige al ingreso; credenciales falsas muestran error
  await abrir('/admin');
  const alIngreso = await esperarQue(`location.pathname === '/admin/ingresar' && !!document.querySelector('#email')`, 10000);
  await escribir('#email', 'no-existe-e2e@example.com');
  await escribir('#clave', 'clave-falsa-de-prueba');
  await clic('form button[type="submit"]');
  const errorLogin = await esperarQue(`/incorrectos/.test(document.querySelector('[role="alert"]')?.textContent ?? '')`, 12000);
  const problemasPanel = tomarProblemas();
  // El 400 del intento de ingreso con credenciales falsas es el resultado esperado.
  const inesperados = problemasPanel.filter((p) => !/http 400\] .*\/auth\/v1\/token/.test(p));
  paso('panel: protegido y rechaza credenciales falsas', alIngreso && errorLogin && inesperados.length === 0,
    { ruta: await evaluar('location.pathname'), problemas: problemasPanel });
  await captura('05-panel-ingreso.png');

  // 8) Nosotros, privacidad y ruta desconocida
  for (const ruta of ['/nosotros', '/privacidad']) {
    await abrir(ruta);
    const ok = await hidratada();
    const e = await estadoPagina();
    paso(`${ruta} prerenderizada e hidratada`, ok && e.navbarReutilizado && e.imagenesRotas.length === 0, { ...e, problemas: tomarProblemas() });
  }
  await abrir('/ruta-que-no-existe');
  paso('ruta desconocida vuelve a /inicio', await esperarQue(`location.pathname === '/inicio'`, 8000), { problemas: tomarProblemas() });

  // 9) Celular: botones flotantes sin superponerse y menu desplegable
  await nav.movil();
  await abrir('/inicio');
  await hidratada();
  await captura('06-movil-inicio.png');
  await abrir('/productos');
  await hidratada();
  await clic('button[aria-label="Agregar Arepa con todo al pedido"]');
  await esperar(400);
  const cajas = await evaluar(`(() => {
    const a = document.querySelector('[data-prueba="ver-pedido"]')?.getBoundingClientRect();
    const b = document.querySelector('app-whatsapp-fab a')?.getBoundingClientRect();
    return a && b ? { verPedidoDerecha: Math.round(a.right), whatsappIzquierda: Math.round(b.left) } : null; })()`);
  paso('celular: "Ver pedido" y WhatsApp no se superponen', cajas && cajas.verPedidoDerecha + 4 <= cajas.whatsappIzquierda, { cajas });
  await captura('07-movil-menu.png');
  await clic('button[aria-label="Abrir menú"]');
  await esperar(500);
  const menuMovil = await evaluar(`!document.querySelector('#menu-movil').classList.contains('translate-x-full')`);
  paso('celular: menu desplegable', menuMovil, { problemas: tomarProblemas() });
  await captura('08-movil-menu-abierto.png');
  await evaluar(`localStorage.clear()`);
} catch (e) {
  informe.fatal = String((e && e.stack) || e);
} finally {
  informe.archivos404 = servidor.servidos.filter((s) => s.startsWith('404'));
  informe.resumen = `${informe.pasos.filter((p) => p.ok).length}/${informe.pasos.length} pasos OK`;
  console.log(JSON.stringify(informe, null, 1));
  await nav?.cerrar();
  servidor.cerrar();
  process.exit(informe.fatal || informe.pasos.some((p) => !p.ok) ? 1 : 0);
}
