const path = require('node:path');
const express = require('express');

const app = express();
const publicDirectory = path.join(__dirname, 'public');

app.disable('x-powered-by');

app.use((request, response, next) => {
  response.set({
    'Content-Security-Policy': [
      "default-src 'self'",
      "base-uri 'self'",
      "connect-src 'self'",
      "font-src 'self' https://fonts.gstatic.com",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data:",
      "object-src 'none'",
      "script-src 'self'",
      "style-src 'self' https://fonts.googleapis.com"
    ].join('; '),
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff'
  });

  next();
});

app.use(express.static(publicDirectory, {
  etag: true,
  maxAge: '1h'
}));

app.use((request, response) => {
  response.status(404).sendFile(path.join(publicDirectory, '404.html'));
});

function startServer() {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return app.listen(port, host, () => {
    console.log(`Portfolio listening on http://${host}:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
