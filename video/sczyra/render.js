// Render index.html frame-by-frame with Playwright (60 fps) and encode to MP4 via ffmpeg.
//   node render.js                    -> build/sczyra-trailer.mp4
//   node render.js --stills 1,4.5     -> build/still-<t>.jpg
//   node render.js --fps 30           -> faster preview render
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const FPS = Number(arg('--fps', 60));
(async () => {
  fs.mkdirSync(path.join(__dirname, 'build'), { recursive: true });
  // file:// images must be readable by WebGL; headless Chromium needs SwiftShader for WebGL.
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => window.ready);
  const DUR = await page.evaluate(() => window.DURATION);
  const stage = await page.$('#stage');

  const stills = arg('--stills');
  if (stills) {
    for (const t of stills.split(',').map(Number)) {
      await page.evaluate(t => window.render(t), t);
      await stage.screenshot({ path: path.join(__dirname, `build/still-${t}.jpg`), type: 'jpeg', quality: 85 });
    }
    await browser.close();
    return;
  }

  const out = path.join(__dirname, arg('--out', 'build/sczyra-trailer.mp4'));
  const music = path.join(__dirname, 'build/music.wav');
  const audio = fs.existsSync(music) ? ['-i', music] : [];
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    ...audio,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    ...(audio.length ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []), '-movflags', '+faststart', out],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(FPS * DUR);
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    await page.evaluate(t => window.render(t), i / FPS);
    const buf = await stage.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 120 === 0) console.log(`frame ${i}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('wrote', out);
})();
