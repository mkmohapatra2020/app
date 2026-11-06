// Ledger page analysis with the Azure AI Foundry model (default deployment "gpt-6-luna"),
// used until the backend's own OCR parse is ready. Shared by:
//   - the Vite dev/preview server (vite.config.js → POST /api/ledger-ocr)
//   - the Azure Static Web Apps function (api/src/functions/ledgerOcr.mjs)
//
// The API key stays on the server. The prompt is fixed here, so the endpoint can only be
// used to read one ledger page (an image or a PDF) and return its rows as JSON.
//
// Settings (.env locally; Static Web App → Environment variables in Azure):
//   AZURE_OPENAI_ENDPOINT     resource or project URL, e.g.
//                             https://weekend-live-new-resource.services.ai.azure.com/api/projects/weekend-live-new
//   AZURE_OPENAI_API_KEY      key of that Azure AI Foundry resource
//   AZURE_LEDGER_DEPLOYMENT   optional, defaults to "gpt-6-luna"

export const LEDGER_DEFAULT_DEPLOYMENT = 'gpt-6-luna';
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/** https://<resource>.services.ai.azure.com/api/projects/<p> → https://<resource>.services.ai.azure.com */
export function resourceOrigin(endpoint) {
  try { return new URL(endpoint).origin; } catch { return ''; }
}

const PROMPT = `You read one page of an Indian real-estate sales ledger ("hisab khata"), handwritten or printed, possibly in English or Odia.
Return every payment row on the page, top to bottom, as JSON that matches the schema.
Rules:
- Copy values exactly as written. Do not guess. If a value is missing or unreadable, use null.
- transactionDate: as YYYY-MM-DD when the date is clear, otherwise exactly as written.
- customerName and plotNumber: as written (they are only matching hints).
- There are three separate amounts. Never add, combine or derive them from each other:
  totalAmountReceived = the amount in the previous / "total received" column;
  commissionAmount = the lower amount written in black after "Payment Details";
  propertyAmount = the amount written in red.
  Write amounts as plain numbers without currency symbols or commas (e.g. "95000"), or null.
- paymentMode: Cash, UPI, Cheque, NEFT/RTGS, Bank transfer, etc., as written, or null.
- referenceNumber: cheque / UTR / transaction number, or null. remarks: any other note on the row, or null.
- confidence: 0 to 1, how sure you are about the row overall.
- pageNotes: anything on the page that is not a row (totals, headings), or null.`;

const nullableString = { type: ['string', 'null'] };
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rows', 'pageNotes'],
  properties: {
    pageNotes: nullableString,
    rows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['rowNumber', 'transactionDate', 'customerName', 'plotNumber', 'totalAmountReceived', 'commissionAmount', 'propertyAmount', 'paymentMode', 'referenceNumber', 'remarks', 'confidence'],
        properties: {
          rowNumber: { type: 'integer' },
          transactionDate: nullableString,
          customerName: nullableString,
          plotNumber: nullableString,
          totalAmountReceived: nullableString,
          commissionAmount: nullableString,
          propertyAmount: nullableString,
          paymentMode: nullableString,
          referenceNumber: nullableString,
          remarks: nullableString,
          confidence: { type: 'number' },
        },
      },
    },
  },
};

const fail = (status, message) => ({ status, body: { error: { message } } });

/** Text of a Responses API result (output[].content[].text where type is output_text). */
function outputText(res) {
  if (typeof res?.output_text === 'string') return res.output_text;
  return (res?.output || [])
    .flatMap((item) => item?.content || [])
    .filter((c) => c?.type === 'output_text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('');
}

/**
 * body: { fileName, contentType, data } where data is base64 (no data: prefix).
 * Resolves to { status, body } — body is { rows, pageNotes, model } or { error: { message } }.
 */
export async function analyseLedger(body, env = process.env, fetchImpl = fetch) {
  const endpoint = resourceOrigin(env.AZURE_OPENAI_ENDPOINT || '');
  const apiKey = (env.AZURE_OPENAI_API_KEY || '').trim();
  const model = (env.AZURE_LEDGER_DEPLOYMENT || '').trim() || LEDGER_DEFAULT_DEPLOYMENT;
  if (!endpoint || !apiKey) return fail(500, 'Ledger analysis is not set up: AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY are needed on the server.');

  const contentType = String(body?.contentType || '');
  const data = String(body?.data || '').replace(/^data:[^,]*,/, '');
  const fileName = String(body?.fileName || 'ledger').slice(0, 120);
  if (!TYPES.includes(contentType)) return fail(415, 'Ledger analysis reads JPG, PNG, WebP or PDF files.');
  if (!data || !/^[A-Za-z0-9+/=\s]+$/.test(data)) return fail(400, 'The file could not be read.');
  if (Math.floor(data.length * 3 / 4) > MAX_BYTES) return fail(413, 'The file is too large (max 10 MB).');

  const file = contentType === 'application/pdf'
    ? { type: 'input_file', filename: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`, file_data: `data:application/pdf;base64,${data}` }
    : { type: 'input_image', image_url: `data:${contentType};base64,${data}`, detail: 'high' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 150000);
  let res;
  try {
    res = await fetchImpl(`${endpoint}/openai/v1/responses`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        model,
        input: [{ role: 'user', content: [{ type: 'input_text', text: PROMPT }, file] }],
        text: { format: { type: 'json_schema', name: 'ledger_page', strict: true, schema: SCHEMA } },
      }),
    });
  } catch (err) {
    return fail(502, err?.name === 'AbortError' ? 'The ledger analysis took too long. Please try again.' : `Could not reach Azure: ${err?.message || err}`);
  } finally {
    clearTimeout(timer);
  }

  let json = null;
  try { json = await res.json(); } catch { /* handled below */ }
  if (!res.ok) return fail(res.status === 429 ? 429 : 502, json?.error?.message || `Azure returned ${res.status}.`);

  let parsed;
  try { parsed = JSON.parse(outputText(json)); } catch { return fail(502, 'The model did not return ledger rows. Please try again.'); }
  const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
  return { status: 200, body: { rows, pageNotes: parsed?.pageNotes ?? null, model } };
}
