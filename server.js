#!/usr/bin/env node
/**
 * RadioFM — Servidor de descarga de audio
 * Usa yt-dlp para extraer audio de YouTube, Facebook, etc.
 * Ejecutar: node server.js
 * Puerto: 7979
 */

const http  = require('http');
const https = require('https');
const { exec, spawn } = require('child_process');
const path  = require('path');
const fs    = require('fs');
const os    = require('os');

const PORT    = process.env.PORT || 7979;
const TMP_DIR = os.tmpdir();

// Encontrar yt-dlp en el sistema
function findYtDlp() {
  const candidates = [
    '/usr/local/bin/yt-dlp',
    '/opt/homebrew/bin/yt-dlp',
    '/usr/bin/yt-dlp',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return 'yt-dlp'; // fallback a PATH
}

function findFfmpeg() {
  const candidates = [
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    '/usr/bin/ffmpeg',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return 'ffmpeg';
}

const YTDLP  = findYtDlp();
const FFMPEG = findFfmpeg();

console.log(`[RadioFM] yt-dlp: ${YTDLP}`);
console.log(`[RadioFM] ffmpeg: ${FFMPEG}`);

// INICIAR ICECAST
try {
  const icecastProc = spawn('icecast', ['-c', path.join(__dirname, 'icecast.xml')]);
  icecastProc.stdout.on('data', d => console.log(`[Icecast] ${d.toString().trim()}`));
  icecastProc.stderr.on('data', d => console.log(`[Icecast] ${d.toString().trim()}`));
  console.log(`[RadioFM] Servidor Icecast local iniciado en el puerto 8000.`);
} catch (e) {
  console.error('[RadioFM] No se pudo iniciar Icecast:', e);
}

// ESTADOS DEL AUTODJ (FFMPEG)
const AutoDJProcesses = new Map();

function restartAutoDJ(stationId) {
  const destDir = path.join(TMP_DIR, `autodj_${stationId}`);
  if (AutoDJProcesses.has(stationId)) {
    AutoDJProcesses.get(stationId).kill();
    AutoDJProcesses.delete(stationId);
  }

  if (!fs.existsSync(destDir)) return;
  const files = fs.readdirSync(destDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
  if (files.length === 0) return;

  const playlistPath = path.join(destDir, 'playlist.txt');
  let playlistContent = '';
  for (const f of files) {
    // safe escape for ffmpeg concat
    playlistContent += `file '${path.join(destDir, f).replace(/'/g, "'\\''")}'\n`;
  }
  fs.writeFileSync(playlistPath, playlistContent);

  console.log(`[RadioFM] Iniciando streaming FFmpeg para la estación ${stationId} a Icecast...`);
  
  const args = [
    '-re', 
    '-f', 'concat', 
    '-safe', '0', 
    '-stream_loop', '-1', 
    '-i', playlistPath, 
    '-c:a', 'libmp3lame', 
    '-b:a', '128k', 
    '-content_type', 'audio/mpeg', 
    '-f', 'mp3', 
    `icecast://source:radiofm_hackme@127.0.0.1:8000/${stationId}`
  ];

  const proc = spawn(FFMPEG, args);
  AutoDJProcesses.set(stationId, proc);

  proc.on('close', () => {
    console.log(`[RadioFM] AutoDJ FFmpeg detenido para ${stationId}`);
  });
}

// Limpia archivos temporales viejos
function cleanTemp(prefix) {
  try {
    fs.readdirSync(TMP_DIR)
      .filter(f => f.startsWith(prefix))
      .forEach(f => {
        try { fs.unlinkSync(path.join(TMP_DIR, f)); } catch {}
      });
  } catch {}
}

// Descarga el audio y lo sirve como stream
function downloadAudio(videoUrl, res) {
  const id     = Date.now().toString(36);
  const outPath = path.join(TMP_DIR, `radiofm_${id}.mp3`);

  const cookiePath = path.join(__dirname, 'cookies.txt');
  const args = [
    '--no-playlist',
    '--extract-audio',
    '--audio-format', 'mp3',
    '--audio-quality', '192K',
    '--ffmpeg-location', path.dirname(FFMPEG),
    '--extractor-args', 'youtube:player_client=android',
    '--no-warnings',
    '--quiet',
    ...(fs.existsSync(cookiePath) ? ['--cookies', cookiePath] : []),
    '-o', outPath,
    videoUrl,
  ];

  console.log(`[RadioFM] Descargando: ${videoUrl}`);

  res.setHeader('Access-Control-Allow-Origin', '*');

  const proc = spawn(YTDLP, args);
  let stderr = '';

  proc.stderr.on('data', d => { stderr += d.toString(); });

  proc.on('close', code => {
    if (code !== 0 || !fs.existsSync(outPath)) {
      console.error('[RadioFM] yt-dlp error:', stderr);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: stderr.trim() || 'yt-dlp falló' }));
      }
      return;
    }

    const stat = fs.statSync(outPath);
    res.writeHead(200, {
      'Content-Type':        'audio/mpeg',
      'Content-Length':       stat.size,
      'Content-Disposition': `attachment; filename="audio_${id}.mp3"`,
      'Access-Control-Allow-Origin': '*',
    });

    const stream = fs.createReadStream(outPath);
    stream.pipe(res);
    stream.on('end', () => {
      try { fs.unlinkSync(outPath); } catch {}
    });
  });

  // Timeout de 3 minutos
  const timeout = setTimeout(() => {
    proc.kill();
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Timeout: el video tardó demasiado en descargarse' }));
    }
  }, 180_000);

  proc.on('close', () => clearTimeout(timeout));
}

// Descarga el video completo y lo sirve como stream
function downloadVideo(videoUrl, res) {
  const id     = Date.now().toString(36);
  const outPath = path.join(TMP_DIR, `radiofm_vid_${id}.mp4`);

  const cookiePath = path.join(__dirname, 'cookies.txt');
  const args = [
    '--no-playlist',
    '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    '--merge-output-format', 'mp4',
    '--ffmpeg-location', path.dirname(FFMPEG),
    '--extractor-args', 'youtube:player_client=android',
    '--no-warnings',
    '--quiet',
    ...(fs.existsSync(cookiePath) ? ['--cookies', cookiePath] : []),
    '-o', outPath,
    videoUrl,
  ];

  console.log(`[RadioFM] Descargando Video: ${videoUrl}`);

  res.setHeader('Access-Control-Allow-Origin', '*');

  const proc = spawn(YTDLP, args);
  let stderr = '';

  proc.stderr.on('data', d => { stderr += d.toString(); });

  proc.on('close', code => {
    if (code !== 0 || !fs.existsSync(outPath)) {
      console.error('[RadioFM] yt-dlp video error:', stderr);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: stderr.trim() || 'yt-dlp falló' }));
      }
      return;
    }

    const stat = fs.statSync(outPath);
    res.writeHead(200, {
      'Content-Type':        'video/mp4',
      'Content-Length':       stat.size,
      'Content-Disposition': `attachment; filename="video_${id}.mp4"`,
      'Access-Control-Allow-Origin': '*',
    });

    const stream = fs.createReadStream(outPath);
    stream.pipe(res);
    stream.on('end', () => {
      try { fs.unlinkSync(outPath); } catch {}
    });
  });

  const timeout = setTimeout(() => {
    proc.kill();
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Timeout: el video tardó demasiado' }));
    }
  }, 300_000); // 5 min para video

  proc.on('close', () => clearTimeout(timeout));
}

// Obtiene info del video sin descargarlo
function getVideoInfo(videoUrl, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const cookiePath = path.join(__dirname, 'cookies.txt');
  const args = [
    '--no-playlist', '--dump-json', '--quiet', '--no-warnings',
    ...(fs.existsSync(cookiePath) ? ['--cookies', cookiePath] : []),
    videoUrl
  ];
  const proc = spawn(YTDLP, args);

  let stdout = '';
  let stderr = '';
  proc.stdout.on('data', d => { stdout += d.toString(); });
  proc.stderr.on('data', d => { stderr += d.toString(); });

  proc.on('close', code => {
    if (code !== 0 || !stdout.trim()) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: stderr.trim() || 'No se pudo obtener info del video' }));
      return;
    }
    try {
      const info = JSON.parse(stdout.trim().split('\n')[0]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        title:     info.title       || 'Sin título',
        duration:  info.duration    || 0,
        uploader:  info.uploader    || '',
        thumbnail: info.thumbnail   || '',
        extractor: info.extractor   || '',
      }));
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error parseando info del video' }));
    }
  });
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // POST /download  — descarga audio
  if (req.method === 'POST' && url.pathname === '/download') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { url: videoUrl } = JSON.parse(body);
        if (!videoUrl) throw new Error('Falta el campo "url"');
        downloadAudio(videoUrl, res);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /download-video  — descarga video MP4
  if (req.method === 'POST' && url.pathname === '/download-video') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { url: videoUrl } = JSON.parse(body);
        if (!videoUrl) throw new Error('Falta el campo "url"');
        downloadVideo(videoUrl, res);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /info  — metadata del video
  if (req.method === 'POST' && url.pathname === '/info') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { url: videoUrl } = JSON.parse(body);
        if (!videoUrl) throw new Error('Falta el campo "url"');
        getVideoInfo(videoUrl, res);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET /health
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ status: 'ok', ytdlp: YTDLP, ffmpeg: FFMPEG }));
    return;
  }

  // POST /autodj/upload - Sube un archivo MP3 raw
  if (req.method === 'POST' && url.pathname === '/autodj/upload') {
    const stationId = url.searchParams.get('stationId');
    const filename  = url.searchParams.get('filename');
    if (!stationId || !filename) {
      res.writeHead(400); res.end('Faltan parametros'); return;
    }
    const dest = path.join(TMP_DIR, `autodj_${stationId}`);
    fs.mkdirSync(dest, { recursive: true });
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    const ws = fs.createWriteStream(path.join(dest, filename));
    req.pipe(ws);
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      restartAutoDJ(stationId);
    });
    return;
  }

  // POST /autodj/delete - Elimina un archivo
  if (req.method === 'POST' && url.pathname === '/autodj/delete') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      try {
        const { stationId, filename } = JSON.parse(body);
        const file = path.join(TMP_DIR, `autodj_${stationId}`, filename);
        if (fs.existsSync(file)) fs.unlinkSync(file);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        restartAutoDJ(stationId);
      } catch (e) {
        res.writeHead(500); res.end('error');
      }
    });
    return;
  }

  // POST /autodj/clear - Elimina toda la playlist
  if (req.method === 'POST' && url.pathname === '/autodj/clear') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      try {
        const { stationId } = JSON.parse(body);
        const dir = path.join(TMP_DIR, `autodj_${stationId}`);
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
        if (AutoDJProcesses.has(stationId)) {
          AutoDJProcesses.get(stationId).kill();
          AutoDJProcesses.delete(stationId);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (e) {
        res.writeHead(500); res.end('error');
      }
    });
    return;
  }

  // GET /stream/:id (Proxy hacia Icecast)
  if (req.method === 'GET' && url.pathname.startsWith('/stream/')) {
    const stationId = url.pathname.replace('/stream/', '').replace('station-', '');
    
    // Proxy crudo hacia Icecast (http://127.0.0.1:8000/stationId)
    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: 8000,
      path: `/${stationId}`,
      method: 'GET',
      headers: req.headers
    }, (proxyRes) => {
      // Si Icecast devuelve 404, significa que no hay transmisión activa.
      if (proxyRes.statusCode === 404) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>RadioFM Stream - Offline</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { background: #0f0f1a; color: white; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 20px; }
              .disc { width: 120px; height: 120px; border-radius: 50%; background: #1a1a2e; margin-bottom: 24px; border: 8px solid #2a2a3e; }
              h1 { margin: 0 0 10px 0; font-size: 28px; }
              p { color: #8b9cc4; max-width: 500px; line-height: 1.6; }
              .badge { background: rgba(239,68,68,0.2); color: #ef4444; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-bottom: 20px; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="disc"></div>
            <div class="badge">OFFLINE</div>
            <h1>Transmisión Apagada</h1>
            <p>La estación <strong>${stationId}</strong> no está transmitiendo audio en este momento.</p>
            <p>El administrador debe activar el Auto DJ o configurar el servidor.</p>
          </body>
          </html>
        `);
        return;
      }
      
      // Si Icecast tiene el stream, copiamos los headers y el contenido
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (e) => {
      res.writeHead(500); res.end('Icecast no esta corriendo.');
    });

    req.pipe(proxyReq, { end: true });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ RadioFM Audio Server corriendo en http://0.0.0.0:${PORT}`);
  console.log(`   POST /download         { "url": "..." }  → MP3`);
  console.log(`   POST /download-video   { "url": "..." }  → MP4`);
  console.log(`   POST /info             { "url": "..." }  → metadata`);
  console.log(`   GET  /health           → estado\n`);
});

process.on('SIGINT',  () => { console.log('\nServidor detenido.'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\nServidor detenido.'); process.exit(0); });
