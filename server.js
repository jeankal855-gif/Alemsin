const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;

// Basit IP tabanlı koruma (Rate Limiting) haritası
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 dakika
const MAX_REQUESTS_PER_WINDOW = 120; // Dakikada maksimum 120 istek

const server = http.createServer((req, res) => {
  // IP adresini al (Render ve proxyler arkasında doğru IP'yi yakala)
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();

  if (!requestCounts.has(clientIp)) {
    requestCounts.set(clientIp, { count: 1, startTime: now });
  } else {
    let clientData = requestCounts.get(clientIp);
    if (now - clientData.startTime < RATE_LIMIT_WINDOW) {
      clientData.count++;
      if (clientData.count > MAX_REQUESTS_PER_WINDOW) {
        res.writeHead(429, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Cok fazla istek gonderdiniz. Lutfen biraz bekleyin.');
        return;
      }
    } else {
      clientData.count = 1;
      clientData.startTime = now;
    }
  }

  // Ziyaretçi ana sayfaya girdiğinde index.html dosyasını göster
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  let extname = String(path.extname(filePath)).toLowerCase();
  
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
  };

  let contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if(error.code == 'ENOENT') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end('Sunucu hatasi: '+error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda calisiyor.`);
});
