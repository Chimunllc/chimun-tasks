// Жижиг статик сервер — python3 -m http.server нь sandbox-д os.getcwd() дээр унадаг.
// Хэрэглээ: node .claude/serve.js <port> <root>
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = Number(process.argv[2]) || 8766;
const ROOT = path.resolve(__dirname, '..', process.argv[3] || '.');
const T = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
            '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
            '.svg':'image/svg+xml', '.webp':'image/webp', '.ico':'image/x-icon' };
http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u.endsWith('/')) u += 'index.html';
  const f = path.resolve(ROOT, '.' + u);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': T[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    res.end(d);
  });
}).listen(PORT, () => console.log('serving ' + ROOT + ' on ' + PORT));
