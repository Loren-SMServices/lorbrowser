const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');
const { spawn, exec } = require('child_process');

let PORT = parseInt(process.env.PORT || '3000', 10);
const WWW_DIR = path.join(__dirname, 'www');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function createServer(port) {
    const server = http.createServer((req, res) => {
        const parsedUrl = new url.URL(req.url, `http://${req.headers.host || 'localhost'}`);
        let reqUrl = parsedUrl.pathname;

        // REMOTE LOGGING ENDPOINT
        if (reqUrl === '/log') {
            const msg = parsedUrl.searchParams.get('msg') || '';
            const level = parsedUrl.searchParams.get('level') || 'INFO';
            const timestamp = new Date().toLocaleTimeString();
            console.log(`📱 [W10M Mobile Log ${timestamp}] [${level}]: ${msg}`);
            res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            return res.end('OK');
        }

        // PROXY ENDPOINT
        if (reqUrl === '/proxy') {
            const targetUrlStr = parsedUrl.searchParams.get('url');
            let targetUA = parsedUrl.searchParams.get('ua') || 'Mozilla/5.0 (Linux; Android 14; Mobile; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36';

            if (!targetUrlStr) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                return res.end('Falta parámetro URL');
            }

            let targetUrl;
            try {
                targetUrl = new url.URL(targetUrlStr);
            } catch (e) {
                console.error(`❌ [Proxy Error - URL Inválida]: ${targetUrlStr}`);
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                return res.end('URL inválida: ' + targetUrlStr);
            }

            // YOUTUBE OPTIMIZER & FRAMEBUST PREVENTER FOR W10M
            if (targetUrl.hostname.includes('youtube.com') || targetUrl.hostname.includes('youtu.be')) {
                console.log(`⚡ [YouTube W10M Optimizer] Aplicando interfaz liviana y bloqueo de Framebusting`);
                targetUA = 'Mozilla/5.0 (Mobile; Nokia 8110 4G; rv:61.0) Gecko/61.0 Firefox/61.0 KAIOS/2.5.1';
                
                const vMatch = targetUrl.search.match(/[?&]v=([^&]+)/);
                if (vMatch && vMatch[1]) {
                    targetUrl = new url.URL(`https://www.youtube-nocookie.com/embed/${vMatch[1]}?autoplay=1`);
                    console.log(`▶️ [YouTube Auto-Embed Video] -> ${vMatch[1]}`);
                }
            }

            console.log(`🌐 [Proxy Request W10M] -> ${targetUrl.href}`);

            const client = targetUrl.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: targetUrl.hostname,
                port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
                path: targetUrl.pathname + targetUrl.search,
                method: req.method,
                servername: targetUrl.hostname,
                rejectUnauthorized: false,
                headers: {
                    'user-agent': targetUA,
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
                    'host': targetUrl.hostname,
                    'referer': targetUrl.origin
                }
            };

            const proxyReq = client.request(options, (proxyRes) => {
                const responseHeaders = { ...proxyRes.headers };
                
                delete responseHeaders['x-frame-options'];
                delete responseHeaders['content-security-policy'];
                delete responseHeaders['content-security-policy-report-only'];

                if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && responseHeaders.location) {
                    let redirectUrl = responseHeaders.location;
                    if (!redirectUrl.startsWith('http')) {
                        redirectUrl = new url.URL(redirectUrl, targetUrl.origin).href;
                    }
                    console.log(`↪️ [Proxy Redirect ${proxyRes.statusCode}] -> ${redirectUrl}`);
                    responseHeaders.location = `/proxy?url=${encodeURIComponent(redirectUrl)}&ua=${encodeURIComponent(targetUA)}`;
                    res.writeHead(proxyRes.statusCode, responseHeaders);
                    return res.end();
                }

                const contentType = responseHeaders['content-type'] || '';

                if (contentType.includes('text/html')) {
                    let bodyChunks = [];
                    proxyRes.on('data', chunk => bodyChunks.push(chunk));
                    proxyRes.on('end', () => {
                        const bodyBuffer = Buffer.concat(bodyChunks);
                        let bodyText = bodyBuffer.toString('utf8');

                        const baseTag = `<base href="${targetUrl.origin}${targetUrl.pathname}"/>`;
                        
                        const scriptInject = `
                        <script>
                        (function() {
                            try {
                                Object.defineProperty(window, 'top', { get: function() { return window; } });
                                Object.defineProperty(window, 'parent', { get: function() { return window; } });
                            } catch(e) {}

                            document.addEventListener('click', function(e) {
                                var a = e.target.closest('a');
                                if (a && a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#')) {
                                    e.preventDefault();
                                    var realParentOrigin = window.origin || (window.location.protocol + '//' + window.location.host);
                                    try {
                                        if (window.self !== window.top) {
                                            realParentOrigin = document.referrer ? new URL(document.referrer).origin : realParentOrigin;
                                        }
                                    } catch(err) {}
                                    window.location.href = '/proxy?url=' + encodeURIComponent(a.href) + '&ua=' + encodeURIComponent(navigator.userAgent);
                                }
                            }, true);

                            window.addEventListener('error', function(err) {
                                try {
                                    fetch('/log?msg=' + encodeURIComponent('Proxied Page Error: ' + err.message + ' (' + err.filename + ')') + '&level=WARN');
                                } catch(ex) {}
                            });
                        })();
                        </script>`;

                        let modifiedHtml = bodyText;
                        if (modifiedHtml.includes('<head>')) {
                            modifiedHtml = modifiedHtml.replace('<head>', '<head>' + baseTag + scriptInject);
                        } else if (modifiedHtml.includes('<HEAD>')) {
                            modifiedHtml = modifiedHtml.replace('<HEAD>', '<HEAD>' + baseTag + scriptInject);
                        } else {
                            modifiedHtml = baseTag + scriptInject + modifiedHtml;
                        }

                        delete responseHeaders['content-length'];
                        responseHeaders['content-type'] = 'text/html; charset=utf-8';
                        res.writeHead(proxyRes.statusCode, responseHeaders);
                        res.end(modifiedHtml);
                    });
                } else {
                    res.writeHead(proxyRes.statusCode, responseHeaders);
                    proxyRes.pipe(res, { end: true });
                }
            });

            proxyReq.on('error', (err) => {
                console.error(`❌ [Proxy Error] (${targetUrlStr}):`, err.message);
                res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<h3>Error al cargar la página en el proxy</h3><p>${err.message}</p>`);
            });

            if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
                req.pipe(proxyReq, { end: true });
            } else {
                proxyReq.end();
            }
            return;
        }

        // STATIC FILE SERVING
        if (reqUrl === '/') reqUrl = '/index.html';
        const filePath = path.join(WWW_DIR, reqUrl);
        const ext = path.extname(filePath).toLowerCase();

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.error(`⚠️ [404 Not Found] ${reqUrl}`);
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Archivo no encontrado');
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('500 Error del servidor');
                }
            } else {
                res.writeHead(200, { 
                    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(content, 'utf-8');
            }
        });
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️ Puerto ${port} en uso, intentando en el puerto ${port + 1}...`);
            createServer(port + 1);
        } else {
            console.error('Error en el servidor:', err);
        }
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`\n🚀 LorBrowser Servidor Web Activo`);
        console.log(`---------------------------------------------------`);
        console.log(` 💻 Desde esta PC:          http://localhost:${port}`);
        const localIPs = getLocalIPs();
        localIPs.forEach(ip => {
            console.log(` 📱 Desde tu W10 Mobile:     http://${ip}:${port}`);
        });
        console.log(`---------------------------------------------------`);
        console.log(`📡 Generando túnel Cloudflare HTTPS transparente...`);

        startCloudflareTunnel(port);
    });
}

function startCloudflareTunnel(port) {
    try {
        const tunnelProcess = spawn('npx', ['-y', 'cloudflared', 'tunnel', '--url', `http://localhost:${port}`], { shell: true });
        let printed = false;

        const handleData = (data) => {
            const output = data.toString();
            const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
            if (match && !printed) {
                printed = true;
                const tunnelUrl = match[0];
                console.log(`\n🌟 ENLACE TRANSPARENTE PARA WINDOWS 10 MOBILE:`);
                console.log(`👉 ${tunnelUrl}`);
                console.log(`---------------------------------------------------`);
                console.log(`📷 ESCANEA ESTE CÓDIGO QR CON LA CÁMARA DE TU MÓVIL:`);

                // Print QR Code directly in console using qrcode-terminal
                exec(`npx -y qrcode-terminal "${tunnelUrl}"`, (err, stdout) => {
                    if (!err && stdout) {
                        console.log(stdout);
                    }
                    console.log(`---------------------------------------------------\n`);
                });
            }
        };

        tunnelProcess.stderr.on('data', handleData);
        tunnelProcess.stdout.on('data', handleData);
    } catch(e) {
        console.log('No se pudo generar túnel Cloudflare:', e.message);
    }
}

function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}

createServer(PORT);
