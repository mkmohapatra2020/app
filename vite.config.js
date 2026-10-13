import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The Azure API key is read from .env on the dev/preview server and added to the
// proxied request here, so it is never bundled into the browser JavaScript.
//
// Image generation lives on the resource's OpenAI route:
//   https://<resource>.services.ai.azure.com/openai/v1/images/generations
// A Foundry project endpoint (…/api/projects/<project>) is accepted too; the
// project path is stripped because that route returns 404 for images.
function resourceBase(endpoint) {
  try {
    const url = new URL(endpoint);
    return url.origin;
  } catch {
    return 'https://weekend-live-new-resource.services.ai.azure.com';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = resourceBase(env.AZURE_OPENAI_ENDPOINT || '');
  const apiKey = (env.AZURE_OPENAI_API_KEY || '').trim();
  const deployment = env.AZURE_IMAGE_DEPLOYMENT || 'gpt-image-2.5-sunburst';

  const imageProxy = {
    '/api/generate-image': {
      target,
      changeOrigin: true,
      secure: true,
      timeout: 180000,
      proxyTimeout: 180000,
      rewrite: () => '/openai/v1/images/generations',
      headers: { 'api-key': apiKey },
      configure: (proxy) => {
        proxy.on('error', (err, _req, res) => {
          if (res.headersSent) return;
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: `Could not reach Azure: ${err.message}` } }));
        });
      },
      bypass: (req, res) => {
        if (apiKey) return undefined;
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'AZURE_OPENAI_API_KEY is missing. Add it to .env and restart npm run dev.' } }));
        return false;
      },
    },
  };

  // Photo edits (Outdoor Space Visualizer) — multipart body is forwarded as-is.
  imageProxy['/api/edit-image'] = { ...imageProxy['/api/generate-image'], rewrite: () => '/openai/v1/images/edits' };

  // Weekend-Live backend (Azure Functions). The swagger paths already start with
  // /api and the function app adds its own /api prefix, hence /api/api.
  const backend = env.WL_API_URL || 'https://func-weekendlive-api-e8ffdch2dua8grcq.centralindia-01.azurewebsites.net/api/api';
  const backendUrl = new URL(backend);
  imageProxy['/wl-api'] = {
    target: backendUrl.origin,
    changeOrigin: true,
    secure: true,
    rewrite: (p) => p.replace(/^\/wl-api/, backendUrl.pathname.replace(/\/$/, '')),
  };

  return {
    plugins: [react()],
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          // React rarely changes: keep it in its own long-cached file.
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react-vendor';
            return undefined;
          },
        },
      },
    },
    define: { __IMAGE_DEPLOYMENT__: JSON.stringify(deployment) },
    server: { proxy: imageProxy },
    preview: { proxy: imageProxy },
  };
});
