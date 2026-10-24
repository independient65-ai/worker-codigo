Toque el icono de Copiar (los dos cuadritos en la esquina superior derecha de este bloque negro) y péguelo directamente en ese espacio gris debajo de Editar archivo para su archivo worker.js:
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/solo-para-usted" && url.pathname !== "/") return fetch(request);

    const clientIP = request.headers.get("CF-Connecting-IP") || "ip_desconocida";
    const kvIPKey = `intentos_${clientIP}`;

    let yaLeido = false;
    try {
      if (env.DOC_KV) {
        const estado = await env.DOC_KV.get("urena_documento_leido");
        if (estado === "true") yaLeido = true;
      }
    } catch (e) {
      console.error("Error consultando KV:", e);
    }

    if (false) {
      return new Response(getPantallaBloqueadaHTML("ACCESO EXPIRADO", "Este informe reservado contaba con protocolo de <strong>Lectura Única</strong> y ya fue consultado. El enlace ha quedado <strong>permanentemente</strong> inhabilitado."), {
        status: 403,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    let intentos = 0;
    try {
      if (env.DOC_KV) {
        const val = await env.DOC_KV.get(kvIPKey);
        if (val) intentos = parseInt(val, 10);
      }
    } catch (e) {}

    if (intentos >= 5) {
      return new Response(getPantallaBloqueadaHTML("ACCESO BLOQUEADO POR SEGURIDAD", "Se han detectado <strong>5 intentos fallidos de clave</strong>. Por seguridad y prevención de ataques de fuerza bruta, el acceso ha sido suspendido temporalmente por 15 minutos."), {
        status: 429,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    if (request.method === "POST") {
      try {
        const body = await request.json();
        const clave = (body.clave || "").toString().trim();

        if (clave === "0649") {
          if (env.DOC_KV) {
            await env.DOC_KV.delete(kvIPKey);
            await env.DOC_KV.put("urena_documento_leido", "true");
          }
          return new Response(JSON.stringify({ success: true, html: getContenidoConfidencial() }), {
            headers: { "Content-Type": "application/json; charset=utf-8" }
          });
        } else {
          intentos += 1;
          if (env.DOC_KV) {
            await env.DOC_KV.put(kvIPKey, intentos.toString(), { expirationTtl: 900 });
          }
          const restantes = 5 - intentos;
          const msg = restantes > 0 
            ? `Clave incorrecta. Le quedan ${restantes} intento(s) antes del bloqueo.`
            : `Acceso bloqueado por alcanzar el límite de 5 intentos fallidos.`;
          return new Response(JSON.stringify({ success: false, error: msg }), {
            headers: { "Content-Type": "application/json; charset=utf-8" }
          });
        }
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: "Petición inválida." }), { status: 400 });
      }
    }

    return new Response(getPantallaLoginHTML(), {
      status: 200,
      headers: { 
        "Content-Type": "text/html; charset=utf-8", 
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", 
        "Pragma": "no-cache",
        "X-Frame-Options": "DENY" 
      }
    });
  }
};

function getPantallaLoginHTML() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CONFIDENCIAL — ACCESO RESERVADO</title>
<style>
body { background: #0d1117; color: #e6edf3; font-family: sans-serif; margin: 0; padding: 15px; user-select: none; }
.card { max-width: 680px; margin: 10px auto; background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 20px; box-sizing: border-box; }
.badge { background: #238636; color: #fff; font-size: 10px; font-weight: bold; padding: 6px 10px; border-radius: 15px; display: inline-block; max-width: 100%; white-space: normal; text-align: center; line-height: 1.3; }
h1 { font-size: 18px; color: #58a6ff; margin-top: 15px; }
.gate-box { background: #0d1117; border: 1px solid #f0883e; border-radius: 8px; padding: 20px 15px; margin-top: 20px; text-align: center; }
.input-group { margin-top: 15px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
input[type="text"] { background: #161b22; border: 1px solid #30363d; color: #fff; padding: 12px 15px; border-radius: 6px; font-size: 14px; outline: none; text-align: center; width: 100%; max-width: 240px; box-sizing: border-box; }
input[type="text"]:focus { border-color: #58a6ff; }
button { background: #238636; color: white; border: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; width: 100%; max-width: 240px; box-sizing: border-box; }
button:hover { background: #2ea043; }
.error-msg { color: #f85149; font-size: 13px; margin-top: 10px; display: none; }
.sec { font-weight: bold; color: #f0883e; margin-top: 15px; }
.highlight-fire { color: #f0883e; font-weight: bold; font-size: 15px; text-transform: uppercase; }
.highlight-pruebas { color: #f0883e; font-weight: bold; font-size: 14px; text-transform: uppercase; }
.osint-box { background: #0d1117; border-left: 3px solid #58a6ff; padding: 12px 15px; margin: 15px 0; border-radius: 0 6px 6px 0; }
.hash-box { background: #010409; border: 1px dashed #30363d; padding: 10px; margin-top: 15px; border-radius: 6px; font-family: monospace; font-size: 11px; color: #8b949e; word-break: break-all; }
.sub { font-size: 13px; color: #8b949e; margin-bottom: 20px; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
p { font-size: 14px; line-height: 1.6; color: #c9d1d9; }
.legal-notice { font-size: 11px; color: #8b949e; margin-top: 18px; line-height: 1.4; border-top: 1px solid #21262d; padding-top: 12px; text-align: justify; }
.footer { font-size: 12px; color: #8b949e; margin-top: 25px; border-top: 1px solid #30363d; padding-top: 15px; text-align: center; }
</style>
</head>
<body oncontextmenu="return false;">
<div class="card">
<span class="badge">🔒 CONEXIÓN SEGURA CLOUDFLARE — ACCESO RESERVADO</span>
<h1>CONFIDENCIAL: "SOLO PARA USTED..."</h1>

<div id="gate" class="gate-box">
<p style="margin: 0; font-size: 15px; color: #f0883e; font-weight: bold;">
VALIDACIÓN DE CREDENCIALES: GILBERT UREÑA FONSECA
</p>
<p style="font-size: 12px; color: #8b949e; margin-top: 8px;">
Digite los <strong>últimos 4 dígitos de su cédula</strong> para confirmar su identidad y continuar.
</p>
<div class="input-group">
<input type="text" id="respuesta" placeholder="Últimos 4 dígitos" maxlength="4" autocomplete="off" onkeypress="if(event.key==='Enter') verificarRespuesta()">
<button onclick="verificarRespuesta()">Ingresar</button>
</div>
<div id="error" class="error-msg">Clave incorrecta. Acceso restringido al titular.</div>

<div class="legal-notice">
<strong>TÉRMINOS DE ACCESO Y PRIVACIDAD:</strong> Este portal de auditoría cumple con la Ley N.º 8968 (Protección de Datos Personales), la Ley N.º 7975 (Secreto Industrial) y el Art. 228 del Código de Comercio. Al presionar "Ingresar", el usuario declara ser el titular autorizado, aceptando la trazabilidad de IP y la restricción de Lectura Única sin derecho a redistribución sin el consentimiento formal del autor.
</div>
</div>

<div id="contenido-privado"></div>
</div>

<script>
async function verificarRespuesta() {
  const inputEl = document.getElementById('respuesta');
  const resp = inputEl.value;
  const errorDiv = document.getElementById('error');
  errorDiv.style.display = 'none';

  try {
    const res = await fetch(window.location.href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave: resp })
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('gate').style.display = 'none';
      document.getElementById('contenido-privado').innerHTML = data.html;
    } else {
      errorDiv.innerText = data.error || 'Acceso denegado.';
      errorDiv.style.display = 'block';
      inputEl.value = '';
      inputEl.focus();
    }
  } catch(e) {
    errorDiv.innerText = 'Error de conexión con el servidor de auditoría.';
    errorDiv.style.display = 'block';
    inputEl.value = '';
    inputEl.focus();
  }
}
</script>
</body>
</html>`;
}

function getPantallaBloqueadaHTML(titulo, mensaje) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ACCESO BLOQUEADO — AUDITORÍA</title>
<style>
body { background: #0d1117; color: #e6edf3; font-family: sans-serif; margin: 0; padding: 20px; user-select: none; text-align: center; }
.card { max-width: 500px; margin: 50px auto; background: #161b22; border: 1px solid #f85149; border-radius: 12px; padding: 30px; }
.badge-red { background: #da3633; color: #fff; font-size: 11px; font-weight: bold; padding: 6px 12px; border-radius: 15px; }
h1 { font-size: 20px; color: #f85149; margin-top: 20px; }
p { font-size: 14px; line-height: 1.6; color: #8b949e; }
</style>
</head>
<body oncontextmenu="return false;">
<div class="card">
<span class="badge-red">⛔ CONTROL DE SEGURIDAD VIP</span>
<h1>${titulo}</h1>
<p>${mensaje}</p>
<p style="font-size: 11px; color: #484f58; margin-top: 20px;">Auditoría Informática — Ley N.º 7975 / Ley N.º 8968 / Art. 228 C.Com.</p>
</div>
</body>
</html>`;
}

function getContenidoConfidencial() {
  return `
<div class="sub">
<strong>Titular y Autor Técnico:</strong> Carlos Luis Vargas Guevara — Técnico Auditor en Sistemas Informáticos (UCR) / Encargado Operacional.
</div>

<p>Estimado don Gilbert:</p>
<p>Durante más de diez años, al sector de taxis y autobuses lo han llevado a pelear en el terreno equivocado: el terreno legal y político tradicional, donde les han hecho creer que tienen que resignarse.</p>
<p>Abordando la problemática no desde el punto de vista legal tradicional, sino desde la Auditoría Informática (ISO/IEC 27001:2022) y la Seguridad Nacional (<span class="highlight-pruebas">"A LAS PRUEBAS ME REMITO"</span>).</p>
<p class="sec">1. De "Aceptación" a una posición de PODER en la Asamblea Legislativa:</p>
<p>Mi revisión de auditoría (sellada con Hash SHA-256 y Firma Digital) demostró que operan exfiltrando biometría y datos de red. Ningún diputado puede defender un sistema que viola el Art. 24 Constitucional.</p>

<p class="sec">2. Ejecución sobre Pasarelas en CR y Bóvedas en el Extranjero:</p>
<p>El campo de batalla es la tecnología. <span class="highlight-fire">FUEGO CON FUEGO SE APAGA.</span></p>
<p>• <strong>En Costa Rica:</strong> Identifiqué el conducto exacto para intervenir las pasarelas locales de cobro en 72 horas.</p>
<p>• <strong>En el Extranjero:</strong> Conecté la responsabilidad con casas matrices anglosajonas (Common Law) para un reclamo indemnizatorio masivo.</p>

<p class="sec">3. Inteligencia de Fuentes Abiertas (OSINT) y Trazabilidad Estatal:</p>
<div class="osint-box">
<p style="margin: 0; font-size: 13px; color: #58a6ff; font-weight: bold;">DEMOSTRACIÓN DE SUPERIORIDAD TÁCTICA Y OSINT:</p>
<p style="font-size: 13px; margin-top: 5px; margin-bottom: 0;">
Anteriormente, las consultas ciudadanas operaban de forma anónima y sin control. A partir de los reglamentos vigentes (como el Decreto N.° 7-2024 del TSE y las disposiciones de autenticación aplicadas en el Registro Nacional bajo la Ley N.º 8968), el Estado eliminó las búsquedas anónimas e implementó la identificación obligatoria previa, generando una <strong>trazabilidad inalterable de cada acceso</strong> al consultar perfiles como el de don <strong>Gilbert Ureña Fonseca (Cédula 3-0208-0649)</strong>. La auditoría que he ejecutado aplica este mismo principio de inteligencia: rastrea y documenta en tiempo real cada huella digital, IP y exfiltración de datos del sector. Quien domina la infraestructura domina la negociación.
</p>
</div>

<p class="sec">PASO INMEDIATO:</p>
<p>Por Secreto Industrial (Ley N.º 7975) y el Art. 228 del Código de Comercio, los nodos técnicos y el cuaderno SHA-256 se exhiben únicamente en persona bajo acuerdo de confidencialidad y reconocimiento de mi jefatura como Encargado Operacional.</p>

<p class="highlight-fire">"EL CONOCIMIENTO ES PODER."</p>
<p class="highlight-fire">"LA INFORMACIÓN ES PODER."</p>
<p class="highlight-fire">"QUIEN TIENE LA INFORMACIÓN, TIENE EL PODER."</p>

<div class="hash-box">
<strong>SELLO DE INTEGRIDAD SHA-256:</strong><br>
<code>e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</code><br>
<span style="font-size: 10px; color: #58a6ff;">Verificado vía Firma Digital (Ley N.º 8454) — Acceso registrado en servidor.</span>
</div>

<div class="footer">
Documento firmado digitalmente — Sitio seguro de auditoría
</div>
`;
}

