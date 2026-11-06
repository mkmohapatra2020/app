// POST /api/ledger-ocr — reads one ledger page with the Azure AI model (see ../lib/ledgerOcr.mjs).
// Interim: used until the backend's own OCR parse is ready.
// Static Web App → Environment variables: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY,
// AZURE_LEDGER_DEPLOYMENT (optional, default "gpt-6-luna").
import { app } from '@azure/functions';
import { analyseLedger } from '../lib/ledgerOcr.mjs';

app.http('ledgerOcr', {
  route: 'ledger-ocr',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    // Only signed-in pages call this (they send their bearer token).
    if (!/^Bearer\s+\S+/i.test(request.headers.get('authorization') || '')) {
      return { status: 401, jsonBody: { error: { message: 'Please sign in to continue.' } } };
    }
    let body = null;
    try { body = await request.json(); } catch { /* handled below */ }
    if (!body) return { status: 400, jsonBody: { error: { message: 'Invalid request.' } } };
    const out = await analyseLedger(body, process.env);
    if (out.status >= 500) context.warn('ledger-ocr', out.status, out.body?.error?.message);
    return { status: out.status, jsonBody: out.body };
  },
});
