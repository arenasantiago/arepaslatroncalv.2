// Utilidades compartidas por las pruebas de navegador (sin dependencias; Node 22+).
//
// - servirEstatico(): sirve dist/<app>/browser igual que un hosting estatico (Vercel):
//   /ruta -> ruta/index.html, archivos inexistentes -> 404, resto -> index.csr.html.
// - abrirChrome(): lanza Google Chrome sin interfaz y lo maneja por el protocolo DevTools
//   (WebSocket global de Node), con ayudas para clics, formularios, capturas y errores.
// - leerEnv(): variables de .env (process.env tiene prioridad), igual que generar-env.mjs.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export function leerEnv(archivo = '.env') {
  const valores = {};
  try {
    for (const linea of readFileSync(archivo, 'utf8').split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) valores[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch {
    // Sin .env: solo variables del entorno (CI).
  }
  return new Proxy(valores, { get: (obj, clave) => (process.env[clave] ?? obj[clave] ?? '').trim() });
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml',
};

export async function servirEstatico(raiz, puerto) {
  const RAIZ = resolve(raiz);
  const servidos = [];
  const esArchivo = async (p) => { try { return (await stat(p)).isFile(); } catch { return false; } };
  const servidor = createServer(async (req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const segura = normalize(ruta).replace(/^([/\\])+/, '');
    let archivo = null;
    for (const c of [join(RAIZ, segura), join(RAIZ, segura, 'index.html')]) {
      if (c.startsWith(RAIZ) && (await esArchivo(c))) { archivo = c; break; }
    }
    if (!archivo && extname(ruta)) { res.writeHead(404); res.end(); servidos.push(`404 ${ruta}`); return; }
    const origen = archivo ? 'estatico' : 'csr';
    archivo ??= join(RAIZ, 'index.csr.html');
    res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream' });
    res.end(await readFile(archivo));
    servidos.push(`200 ${ruta} (${origen})`);
  });
  await new Promise((r) => servidor.listen(puerto, r));
  return { base: `http://localhost:${puerto}`, servidos, cerrar: () => servidor.close() };
}

// Marca los nodos creados por el parser (HTML prerenderizado) para comprobar que la
// hidratacion los reutiliza en vez de volver a dibujarlos.
const SCRIPT_INICIAL = `(() => {
  window.__e2e = { nghAlCargar: null };
  const marcar = (n) => { if (n.nodeType === 1 && /^(APP-NAVBAR|APP-FOOTER|APP-PRODUCTO-CARD)$/.test(n.tagName)) n.__prerender = true; };
  const manejar = (rs) => { for (const r of rs) for (const n of r.addedNodes) { marcar(n); n.querySelectorAll?.('app-navbar, app-footer, app-producto-card').forEach(marcar); } };
  const obs = new MutationObserver(manejar);
  obs.observe(document, { childList: true, subtree: true });
  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'interactive') { manejar(obs.takeRecords()); obs.disconnect(); window.__e2e.nghAlCargar = document.querySelectorAll('[ngh]').length; }
  });
})();`;

export async function abrirChrome({ base, carpetaCapturas, puertoCdp = 9333 }) {
  const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const perfil = join(tmpdir(), `arepas-e2e-${process.pid}-${Date.now()}`);
  if (carpetaCapturas) await mkdir(carpetaCapturas, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${puertoCdp}`, `--user-data-dir=${perfil}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--window-size=1366,900', 'about:blank',
  ], { stdio: 'ignore' });

  let objetivo;
  for (let i = 0; i < 80 && !objetivo; i++) {
    await esperar(250);
    try { objetivo = (await (await fetch(`http://127.0.0.1:${puertoCdp}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* arrancando */ }
  }
  if (!objetivo) { chrome.kill(); throw new Error('Chrome no expuso el protocolo DevTools'); }
  const ws = new WebSocket(objetivo.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

  let seq = 0;
  const pendientes = new Map();
  const oyentes = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pendientes.has(m.id)) {
      const { res, rej } = pendientes.get(m.id);
      pendientes.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    } else if (m.method) for (const o of [...oyentes]) o(m);
  };
  const enviar = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq; pendientes.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluar = async (expresion) => {
    const r = await enviar('Runtime.evaluate', { expression: expresion, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const esperarQue = async (expresion, ms = 10000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await evaluar(expresion).catch(() => false)) return true;
      await esperar(150);
    }
    return false;
  };

  // Errores de consola, excepciones y fallos de red (se vacian con tomarProblemas()).
  const problemas = [];
  const urls = new Map();
  const dialogos = [];
  oyentes.push((m) => {
    const p = m.params;
    if (m.method === 'Network.requestWillBeSent') urls.set(p.requestId, p.request.url);
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(p.type))
      problemas.push(`[console.${p.type}] ${p.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200)}`);
    if (m.method === 'Runtime.exceptionThrown')
      problemas.push(`[excepcion] ${(p.exceptionDetails.exception?.description || p.exceptionDetails.text || '').slice(0, 200)}`);
    if (m.method === 'Network.responseReceived' && p.response.status >= 400)
      problemas.push(`[http ${p.response.status}] ${p.response.url.slice(0, 140)}`);
    if (m.method === 'Network.loadingFailed' && !p.canceled)
      problemas.push(`[red] ${p.errorText} ${(urls.get(p.requestId) || '').slice(0, 140)}`);
    // confirm()/alert(): se aceptan solos y se registran.
    if (m.method === 'Page.javascriptDialogOpening') {
      dialogos.push(p.message);
      void enviar('Page.handleJavaScriptDialog', { accept: true });
    }
  });

  for (const d of ['Page', 'Runtime', 'Network', 'DOM']) await enviar(`${d}.enable`);
  await enviar('Page.addScriptToEvaluateOnNewDocument', { source: SCRIPT_INICIAL });

  const js = (s) => JSON.stringify(s);
  const nav = {
    base,
    enviar,
    evaluar,
    esperarQue,
    dialogos,
    /** Suscribe una funcion a todos los eventos del protocolo DevTools (ej. tramas de WebSocket). */
    alEvento: (fn) => oyentes.push(fn),
    tomarProblemas: () => problemas.splice(0),
    escritorio: () => enviar('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false }),
    movil: () => enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }),
    async abrir(ruta) {
      await enviar('Page.navigate', { url: base + ruta });
      await esperarQue(`document.readyState === 'complete'`, 20000);
    },
    async hidratada() {
      const ok = await esperarQue(`window.__e2e?.nghAlCargar !== null && document.querySelectorAll('[ngh]').length === 0`, 8000);
      await esperar(400);
      return ok;
    },
    estadoPagina: () => evaluar(`(() => ({
      ruta: location.pathname,
      titulo: document.title,
      nghAlCargar: window.__e2e?.nghAlCargar,
      navbarReutilizado: document.querySelector('app-navbar')?.__prerender === true,
      footerReutilizado: document.querySelector('app-footer')?.__prerender === true,
      imagenesRotas: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')),
    }))()`),
    clic: (sel) => evaluar(`(() => { const e = document.querySelector(${js(sel)}); if (!e) return false; e.click(); return true; })()`),
    /** Clic en el primer boton/enlace cuyo texto contiene `texto` (dentro de `dentroDe`, si se indica). */
    clicTexto: (texto, dentroDe = 'body') => evaluar(`(() => {
      const raiz = document.querySelector(${js(dentroDe)}); if (!raiz) return false;
      const e = [...raiz.querySelectorAll('button, a')].find((x) => x.textContent.includes(${js(texto)}));
      if (!e) return false; e.click(); return true; })()`),
    escribir: (sel, valor) => evaluar(`(() => {
      const e = document.querySelector(${js(sel)}); if (!e) return false;
      e.focus(); e.value = ${js(String(valor))};
      e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('blur', { bubbles: true }));
      return true; })()`),
    texto: (sel) => evaluar(`document.querySelector(${js(sel)})?.textContent.replace(/\\s+/g, ' ').trim() ?? null`),
    async subirArchivo(sel, rutaArchivo) {
      const { root } = await enviar('DOM.getDocument', { depth: 0 });
      const { nodeId } = await enviar('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
      if (!nodeId) return false;
      await enviar('DOM.setFileInputFiles', { nodeId, files: [resolve(rutaArchivo)] });
      return true;
    },
    async captura(nombre) {
      if (!carpetaCapturas) return;
      const { data } = await enviar('Page.captureScreenshot', { format: 'png' });
      await writeFile(join(carpetaCapturas, nombre), Buffer.from(data, 'base64'));
    },
    async cerrar() {
      try { ws.close(); } catch { /* ya cerrado */ }
      chrome.kill();
      await esperar(500);
      await rm(perfil, { recursive: true, force: true }).catch(() => {});
    },
  };
  await nav.escritorio();
  return nav;
}
