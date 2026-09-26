// 銆婇湏铏规繁绌恒€嬮潤鎬佹墭绠℃湇鍔″櫒
// 鐢ㄦ硶: node serve-game.js [绔彛]  榛樿 8080
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = 'D:/dev/mini-micro-mp/neon-starfighter/build/web-mobile';
const PORT = process.argv[2] || 8080;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.wasm': 'application/wasm',
    '.bin': 'application/octet-stream',
    '.map': 'application/json',
    '.ttf': 'font/ttf',
    '.plist': 'application/xml',
};

http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') { urlPath = '/index.html'; }
    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(path.join(ROOT, ''))) {
        res.writeHead(403); res.end('forbidden'); return;
    }
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found: ' + urlPath); return; }
        res.writeHead(200, {
            'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-cache',
        });
        res.end(data);
    });
}).listen(PORT, () => {
    console.log('Neon Starfighter (neon-starfighter) serving at http://localhost:' + PORT);
});


