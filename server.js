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

  const args = [
    '--no-playlist',
    '--extract-audio',
    '--audio-format', 'mp3',
    '--audio-quality', '192K',
    '--ffmpeg-location', path.dirname(FFMPEG),
    '--extractor-args', 'youtube:player_client=android',
    '--no-warnings',
    '--quiet',
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

  const args = [
    '--no-playlist',
    '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    '--merge-output-format', 'mp4',
    '--ffmpeg-location', path.dirname(FFMPEG),
    '--extractor-args', 'youtube:player_client=android',
    '--no-warnings',
    '--quiet',
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
  const proc = spawn(YTDLP, [
    '--no-playlist', '--dump-json', '--quiet', '--no-warnings', videoUrl,
  ]);

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
