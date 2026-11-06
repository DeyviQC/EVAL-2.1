<#
.SYNOPSIS
    Genera el portal visual con Código QR e instrucciones para Tablets en EVAL v2.1.
#>

param(
    [string]$LanIp = "192.168.0.101",
    [int]$Port = 8443
)

$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$devRoot = Join-Path $repo ".local\eval-dev"
if (!(Test-Path -LiteralPath $devRoot)) {
    [void](New-Item -ItemType Directory -Path $devRoot -Force)
}

$targetUrl = "https://${LanIp}:${Port}"
$portalPath = Join-Path $devRoot "portal-tablets.html"

$html = @"
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EVAL v2.1 — Conectar Tablets (I.E. Nuestra Señora de las Mercedes)</title>
  <style>
    :root {
      --primary: #10244A;
      --secondary: #1E3A8A;
      --accent: #D97706;
      --accent-light: #FDE68A;
      --bg: #F8FAFC;
      --card-bg: #FFFFFF;
      --text: #0F172A;
      --text-muted: #64748B;
      --border: #E2E8F0;
      --success: #16A34A;
      --radius: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px 16px;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
    }
    header {
      background: var(--primary);
      color: white;
      padding: 26px 24px;
      border-radius: var(--radius);
      box-shadow: 0 10px 25px rgba(16, 36, 74, 0.15);
      margin-bottom: 24px;
      text-align: center;
    }
    header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    header p {
      color: var(--accent-light);
      font-size: 1rem;
      font-weight: 500;
    }
    .badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.15);
      color: white;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 0.825rem;
      font-weight: 600;
      margin-top: 10px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }
    @media (min-width: 768px) {
      .grid { grid-template-columns: 340px 1fr; }
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .card h2 {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    #qrcode {
      background: white;
      padding: 16px;
      border-radius: 8px;
      border: 2px dashed var(--accent);
      margin-bottom: 16px;
      display: inline-block;
    }
    .url-box {
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      padding: 12px 14px;
      border-radius: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--primary);
      width: 100%;
      word-break: break-all;
      margin-bottom: 12px;
      user-select: all;
    }
    .btn-copy {
      background: var(--primary);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.875rem;
      transition: background 0.2s;
    }
    .btn-copy:hover { background: var(--secondary); }
    .steps {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .step-item {
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }
    .step-number {
      background: var(--secondary);
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      flex-shrink: 0;
    }
    .step-content strong {
      display: block;
      color: var(--primary);
      margin-bottom: 2px;
      font-size: 0.95rem;
    }
    .step-content p {
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .alert-box {
      background: #FEF3C7;
      border-left: 4px solid var(--accent);
      padding: 12px 14px;
      border-radius: 4px;
      margin: 14px 0;
      font-size: 0.85rem;
      color: #92400E;
    }
    .accounts-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 0.875rem;
    }
    .accounts-table th, .accounts-table td {
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    .accounts-table th {
      background: #F8FAFC;
      font-weight: 600;
      color: var(--primary);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .accounts-table code {
      font-family: ui-monospace, monospace;
      background: #E2E8F0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 700;
      color: #1E3A8A;
    }
    .tag-student {
      display: inline-block;
      background: #DBEAFE;
      color: #1E40AF;
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 600;
    }
    .tag-teacher {
      display: inline-block;
      background: #FEF3C7;
      color: #92400E;
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>EVAL v2.1 — Servidor de Aula para Tablets</h1>
      <p>I.E. Nuestra Señora de las Mercedes — Ayacucho</p>
      <div class="badge">Red Local Wi-Fi &bull; 100% Offline (Sin Internet)</div>
    </header>

    <div class="grid">
      <!-- Tarjeta Código QR -->
      <div class="card qr-container">
        <h2>📷 Escanear con la Tablet</h2>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
          Apunta la cámara de la tablet al código QR para abrir el sistema inmediatamente:
        </p>
        <div id="qrcode"></div>
        <div class="url-box" id="targetUrl">$targetUrl</div>
        <button class="btn-copy" onclick="navigator.clipboard.writeText('$targetUrl'); this.innerText='¡Copiado!'; setTimeout(()=>this.innerText='Copiar URL', 2000);">Copiar URL</button>
      </div>

      <!-- Tarjeta Instrucciones y Cuentas -->
      <div class="card">
        <h2>🚀 Cuentas Rápidas de Prueba (Usuario = Contraseña)</h2>
        
        <div class="alert-box">
          <strong>✅ Acceso Directo Simplificado:</strong> Todas las cuentas ingresan con <strong>su mismo usuario como contraseña</strong> para máxima facilidad en las pruebas físicas.
        </div>

        <h3 style="font-size: 0.95rem; color: var(--primary); margin-top: 14px; margin-bottom: 6px;">📱 4 Estudiantes para Tablets (Matemática · 2.º B):</h3>
        <table class="accounts-table">
          <thead>
            <tr>
              <th>Estudiante (Ficticio)</th>
              <th>Usuario</th>
              <th>Contraseña</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Carlos Huamán Quispe</td>
              <td><code>estu01</code></td>
              <td><code>estu01</code></td>
              <td><span class="tag-student">Estudiante 1</span></td>
            </tr>
            <tr>
              <td>Luciana Paredes Vega</td>
              <td><code>estu02</code></td>
              <td><code>estu02</code></td>
              <td><span class="tag-student">Estudiante 2</span></td>
            </tr>
            <tr>
              <td>Mateo Cárdenas Soto</td>
              <td><code>estu03</code></td>
              <td><code>estu03</code></td>
              <td><span class="tag-student">Estudiante 3</span></td>
            </tr>
            <tr>
              <td>Valeria Flores Ruiz</td>
              <td><code>estu04</code></td>
              <td><code>estu04</code></td>
              <td><span class="tag-student">Estudiante 4</span></td>
            </tr>
          </tbody>
        </table>

        <h3 style="font-size: 0.95rem; color: var(--primary); margin-top: 18px; margin-bottom: 6px;">🎓 Cuentas Principales de Demostración:</h3>
        <table class="accounts-table">
          <thead>
            <tr>
              <th>Perfil</th>
              <th>Usuario</th>
              <th>Contraseña</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Docente de Área</td>
              <td><code>docente</code></td>
              <td><code>docente</code></td>
              <td><span class="tag-teacher">Profesor</span></td>
            </tr>
            <tr>
              <td>Estudiante General</td>
              <td><code>estudiante</code></td>
              <td><code>estudiante</code></td>
              <td><span class="tag-student">Alumno</span></td>
            </tr>
            <tr>
              <td>Director</td>
              <td><code>director</code></td>
              <td><code>director</code></td>
              <td>Director</td>
            </tr>
            <tr>
              <td>Subdirector</td>
              <td><code>subdirector</code></td>
              <td><code>subdirector</code></td>
              <td>Subdirector</td>
            </tr>
          </tbody>
        </table>

        <div class="steps" style="margin-top: 20px;">
          <div class="step-item">
            <div class="step-number">1</div>
            <div class="step-content">
              <strong>Misma Red Wi-Fi</strong>
              <p>Conecta la tablet a la misma red Wi-Fi que la laptop.</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-number">2</div>
            <div class="step-content">
              <strong>Superar aviso de seguridad SSL</strong>
              <p>Toca en <strong>Configuración avanzada</strong> y luego en <strong>Continuar a $LanIp (no seguro)</strong>.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <script>
    function generateQR(text) {
      const container = document.getElementById('qrcode');
      const encoded = encodeURIComponent(text);
      const img = document.createElement('img');
      img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encoded;
      img.alt = 'Código QR: ' + text;
      img.width = 220;
      img.height = 220;
      img.onerror = function() {
        container.innerHTML = '<div style="width:220px;height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0F172A;color:white;border-radius:8px;padding:12px;text-align:center;">' +
          '<div style="font-size:2.5rem;margin-bottom:8px;">📱</div>' +
          '<div style="font-weight:700;font-size:0.9rem;">EVAL OFFLINE</div>' +
          '<div style="font-size:0.75rem;color:#94A3B8;margin-top:4px;">Escribe en Chrome:</div>' +
          '<div style="font-size:0.8rem;color:#FDE68A;font-weight:700;margin-top:4px;word-break:break-all;">' + text + '</div>' +
          '</div>';
      };
      container.appendChild(img);
    }
    generateQR('$targetUrl');
  </script>
</body>
</html>
"@

[IO.File]::WriteAllText($portalPath, $html, [Text.UTF8Encoding]::new($false))
Write-Output "Portal de conexión para tablets generado en: $portalPath"
