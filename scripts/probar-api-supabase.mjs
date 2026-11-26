#!/usr/bin/env node
// Pruebas de la API publica de Supabase con la clave PUBLICABLE (rol anon):
// es exactamente lo que puede hacer cualquier visitante del sitio.
// Crea pedidos/mensajes de prueba marcados con "PRUEBA AUTOMATICA"; bórralos con
// supabase/limpiar-datos-prueba.sql (el rol anon no puede borrarlos, a proposito).
// Uso: node scripts/probar-api-supabase.mjs   (lee .env)
import { existsSync, readFileSync } from 'node:fs';

const env = {};
if (existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
}
const URL_BASE = process.env.SUPABASE_URL || env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
if (!URL_BASE || !KEY) {
  console.error('Faltan SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}
const H = { apikey: KEY, 'Content-Type': 'application/json' };
const MARCA = 'PRUEBA AUTOMATICA';
const TEL_BASE = '5730000' + String(Date.now()).slice(-5); // 12 digitos, unico por corrida

const resultados = [];
async function prueba(nombre, fn) {
  try {
    const detalle = await fn();
    resultados.push({ ok: true, nombre, detalle });
  } catch (e) {
    resultados.push({ ok: false, nombre, detalle: e.message });
  }
}
function afirmar(cond, msg) {
  if (!cond) throw new Error(msg);
}
async function rest(method, path, body, extraHeaders = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: { ...H, ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const texto = await r.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { json = texto; }
  return { status: r.status, json };
}
const rpc = (fn, args) => rest('POST', `rpc/${fn}`, args);
const pedido = (extra = {}) => ({
  p_cliente_nombre: MARCA,
  p_cliente_telefono: TEL_BASE,
  p_tipo_entrega: 'recoger',
  p_direccion: null,
  p_notas: null,
  p_items: [{ producto_id: 1, cantidad: 2 }, { producto_id: 2, cantidad: 1 }],
  p_acepta_tratamiento_datos: true,
  ...extra,
});
const rechazado = (r) => r.status >= 400;

// ---------- Catalogo publico ----------
await prueba('anon lee productos disponibles', async () => {
  const r = await rest('GET', 'productos?select=id,nombre,precio,disponible&order=orden');
  afirmar(r.status === 200, `status ${r.status}`);
  afirmar(Array.isArray(r.json) && r.json.length >= 4, `filas: ${JSON.stringify(r.json).slice(0, 120)}`);
  afirmar(r.json.every((p) => p.disponible), 'devolvio productos no disponibles');
  return `${r.json.length} productos`;
});
await prueba('anon lee categorias y ajustes', async () => {
  const c = await rest('GET', 'categorias?select=slug');
  const a = await rest('GET', 'ajustes?select=acepta_pedidos');
  afirmar(c.status === 200 && c.json.length >= 2, `categorias ${c.status}`);
  afirmar(a.status === 200 && a.json.length === 1, `ajustes ${a.status}`);
  return `categorias=${c.json.length} acepta_pedidos=${a.json[0].acepta_pedidos}`;
});

// ---------- Datos privados: anon NO debe verlos ni modificarlos ----------
for (const tabla of ['pedidos', 'pedido_items', 'mensajes_contacto', 'administradores']) {
  await prueba(`anon NO lee ${tabla}`, async () => {
    const r = await rest('GET', `${tabla}?select=*&limit=1`);
    afirmar(rechazado(r) || (Array.isArray(r.json) && r.json.length === 0), `status ${r.status} datos=${JSON.stringify(r.json).slice(0, 80)}`);
    return `status ${r.status}`;
  });
}
await prueba('anon NO inserta pedidos directamente', async () => {
  const r = await rest('POST', 'pedidos', { codigo: 'X', cliente_nombre: MARCA, cliente_telefono: '573000000000', tipo_entrega: 'recoger', acepta_tratamiento_datos: true });
  afirmar(rechazado(r), `status ${r.status}`);
  return `status ${r.status}`;
});
await prueba('anon NO cambia precios', async () => {
  const r = await rest('PATCH', 'productos?id=eq.1', { precio: 1 }, { Prefer: 'return=representation' });
  afirmar(rechazado(r) || (Array.isArray(r.json) && r.json.length === 0), `status ${r.status} ${JSON.stringify(r.json).slice(0, 80)}`);
  const v = await rest('GET', 'productos?id=eq.1&select=precio');
  afirmar(v.json[0].precio === 1000, `precio actual ${v.json[0].precio}`);
  return `status ${r.status}, precio sigue en 1000`;
});
await prueba('anon NO borra productos', async () => {
  const r = await rest('DELETE', 'productos?id=eq.1', undefined, { Prefer: 'return=representation' });
  afirmar(rechazado(r) || (Array.isArray(r.json) && r.json.length === 0), `status ${r.status}`);
  return `status ${r.status}`;
});
await prueba('anon NO ejecuta funciones privadas', async () => {
  const r = await rpc('es_admin', {});
  afirmar(rechazado(r), `status ${r.status}`);
  return `status ${r.status}`;
});

// ---------- crear_pedido ----------
let codigo = null;
await prueba('crear_pedido: pedido valido, total calculado en el servidor', async () => {
  const r = await rpc('crear_pedido', pedido({ p_items: [{ producto_id: 1, cantidad: 2, precio: 1 }, { producto_id: 2, cantidad: 1 }] }));
  afirmar(r.status === 200, `status ${r.status} ${JSON.stringify(r.json)}`);
  afirmar(r.json.total === 2400, `total ${r.json.total} (esperado 2400; el precio enviado por el cliente debe ignorarse)`);
  afirmar(/^AT-[A-HJ-NP-Z2-9]{6}$/.test(r.json.codigo), `codigo ${r.json.codigo}`);
  codigo = r.json.codigo;
  return `codigo=${r.json.codigo} numero=${r.json.numero} total=${r.json.total}`;
});
await prueba('crear_pedido: une lineas repetidas del mismo producto', async () => {
  const r = await rpc('crear_pedido', pedido({ p_items: [{ producto_id: 2, cantidad: 1 }, { producto_id: 2, cantidad: 3 }] }));
  afirmar(r.status === 200, `status ${r.status} ${JSON.stringify(r.json)}`);
  afirmar(r.json.items.length === 1 && r.json.items[0].cantidad === 4 && r.json.total === 1600, JSON.stringify(r.json.items));
  return `1 linea x4, total ${r.json.total}`;
});
await prueba('crear_pedido: celular de 10 digitos recibe indicativo 57', async () => {
  const r = await rpc('crear_pedido', pedido({ p_cliente_telefono: '300 000 0000', p_items: [{ producto_id: 2, cantidad: 1 }] }));
  afirmar(r.status === 200, `status ${r.status} ${JSON.stringify(r.json)}`);
  return `ok (${r.json.codigo})`;
});

const invalidos = [
  ['sin consentimiento', { p_acepta_tratamiento_datos: false }],
  ['carrito vacio', { p_items: [] }],
  ['items no es arreglo', { p_items: { producto_id: 1 } }],
  ['cantidad 0', { p_items: [{ producto_id: 1, cantidad: 0 }] }],
  ['cantidad 100', { p_items: [{ producto_id: 1, cantidad: 100 }] }],
  ['cantidad decimal', { p_items: [{ producto_id: 1, cantidad: 1.5 }] }],
  ['cantidad como texto', { p_items: [{ producto_id: 1, cantidad: '2' }] }],
  ['producto como texto', { p_items: [{ producto_id: 'abc', cantidad: 1 }] }],
  ['producto enorme', { p_items: [{ producto_id: 1e30, cantidad: 1 }] }],
  ['producto inexistente', { p_items: [{ producto_id: 999999, cantidad: 1 }] }],
  ['mas de 99 unidades sumadas', { p_items: [{ producto_id: 1, cantidad: 60 }, { producto_id: 1, cantidad: 60 }] }],
  ['domicilio sin direccion', { p_tipo_entrega: 'domicilio', p_direccion: '' }],
  ['tipo de entrega invalido', { p_tipo_entrega: 'dron' }],
  ['telefono invalido', { p_cliente_telefono: 'abc' }],
  ['nombre vacio', { p_cliente_nombre: ' ' }],
];
for (const [nombre, extra] of invalidos) {
  await prueba(`crear_pedido rechaza: ${nombre}`, async () => {
    const r = await rpc('crear_pedido', pedido(extra));
    afirmar(rechazado(r), `ACEPTADO (status ${r.status}) ${JSON.stringify(r.json).slice(0, 100)}`);
    afirmar(r.json && r.json.message && !/syntax|out of range|cannot cast/i.test(r.json.message), `error tecnico: ${r.json && r.json.message}`);
    return r.json.message;
  });
}
await prueba('crear_pedido: limite de 5 pedidos por telefono por hora', async () => {
  const tel = TEL_BASE.slice(0, -1) + '9';
  const estados = [];
  for (let i = 0; i < 6; i++) {
    const r = await rpc('crear_pedido', pedido({ p_cliente_telefono: tel, p_items: [{ producto_id: 2, cantidad: 1 }] }));
    estados.push(r.status);
  }
  afirmar(estados.slice(0, 5).every((s) => s === 200) && estados[5] >= 400, `estados ${estados}`);
  return `estados ${estados.join(',')}`;
});

// ---------- enviar_mensaje_contacto ----------
await prueba('enviar_mensaje_contacto: mensaje valido', async () => {
  const r = await rpc('enviar_mensaje_contacto', { p_nombre: MARCA, p_email: `prueba+${Date.now()}@example.com`, p_whatsapp: '3000000000', p_mensaje: 'Mensaje de prueba automatica.', p_acepta_tratamiento_datos: true });
  afirmar(r.status === 200 || r.status === 204, `status ${r.status} ${JSON.stringify(r.json)}`);
  return `status ${r.status}`;
});
for (const [nombre, extra] of [
  ['correo invalido', { p_email: 'no-es-correo' }],
  ['mensaje corto', { p_mensaje: 'hola' }],
  ['sin consentimiento', { p_acepta_tratamiento_datos: false }],
]) {
  await prueba(`enviar_mensaje_contacto rechaza: ${nombre}`, async () => {
    const base = { p_nombre: MARCA, p_email: 'prueba@example.com', p_whatsapp: null, p_mensaje: 'Mensaje de prueba automatica.', p_acepta_tratamiento_datos: true };
    const r = await rpc('enviar_mensaje_contacto', { ...base, ...extra });
    afirmar(rechazado(r), `ACEPTADO status ${r.status}`);
    return r.json.message;
  });
}

// ---------- Storage ----------
await prueba('anon NO sube imagenes al bucket productos', async () => {
  const r = await fetch(`${URL_BASE}/storage/v1/object/productos/prueba-${Date.now()}.webp`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'image/webp' },
    body: new Uint8Array([82, 73, 70, 70]),
  });
  afirmar(r.status >= 400, `status ${r.status}`);
  return `status ${r.status}`;
});

const fallos = resultados.filter((r) => !r.ok);
for (const r of resultados) console.log(`${r.ok ? 'OK   ' : 'FALLO'} ${r.nombre} -> ${r.detalle}`);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} pruebas OK`);
process.exit(fallos.length ? 1 : 0);
