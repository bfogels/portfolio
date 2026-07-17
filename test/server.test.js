const { once } = require('node:events');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../index');

async function withServer(runAssertions) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const { port } = server.address();
    await runAssertions(`http://127.0.0.1:${port}`);
  } finally {
    const closed = once(server, 'close');
    server.close();
    server.closeAllConnections?.();
    await closed;
  }
}

test('serves the main portfolio pages', async () => {
  await withServer(async (baseUrl) => {
    for (const path of ['/', '/about.html', '/projects.html']) {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get('content-type'), /^text\/html/);
      assert.match(await response.text(), /Brian Fogelson/i);
    }
  });
});

test('sets baseline browser security headers', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(baseUrl);

    assert.equal(response.headers.get('x-powered-by'), null);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
    assert.match(response.headers.get('permissions-policy'), /camera=\(\)/);
  });
});

test('returns a branded 404 page for unknown routes', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/not-a-real-page`);

    assert.equal(response.status, 404);
    assert.match(await response.text(), /Page not found/);
  });
});

test('does not expose ignored working directories', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/jobs/recruiters.txt`);
    assert.equal(response.status, 404);
  });
});
