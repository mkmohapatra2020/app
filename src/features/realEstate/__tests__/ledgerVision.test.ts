/** Interim direct ledger analysis (gpt-6-luna): server module, browser client, submit helper. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyseLedger, resourceOrigin } from '../../../../api/src/lib/ledgerOcr.mjs';
import { analyseLedgerFile, LEDGER_OCR_PATH, LedgerAnalysisError } from '../api/ledgerVisionApi.ts';
import { toOcrBatch } from '../api/normalize.ts';
import { DIALOG_FIELDS } from '../components/OcrAnalysisDialog.tsx';
import { allValuesAsCorrections } from '../utils/ocr.ts';
import { signIn } from './helpers.tsx';

const ENV = {
  AZURE_OPENAI_ENDPOINT: 'https://weekend-live-new-resource.services.ai.azure.com/api/projects/weekend-live-new',
  AZURE_OPENAI_API_KEY: 'test-key',
};
const ROW = {
  rowNumber: 1, transactionDate: '2026-01-15', customerName: 'Ramesh', plotNumber: 'A-12',
  totalAmountReceived: '100000', commissionAmount: '5000', propertyAmount: '95000',
  paymentMode: 'Cash', referenceNumber: null, remarks: null, confidence: 0.92,
};
const azureReply = (rows: unknown[]) => ({
  output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ rows, pageNotes: 'Page 3' }) }] }],
});
const jsonResponse = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('server: analyseLedger (api/src/lib/ledgerOcr.mjs)', () => {
  it('calls the resource /openai/v1/responses route with the key, gpt-6-luna and a strict JSON schema', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, azureReply([ROW])));
    const out = await analyseLedger({ fileName: 'p.jpg', contentType: 'image/jpeg', data: 'QUJD' }, ENV, fetchImpl as unknown as typeof fetch);

    expect(resourceOrigin(ENV.AZURE_OPENAI_ENDPOINT)).toBe('https://weekend-live-new-resource.services.ai.azure.com');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://weekend-live-new-resource.services.ai.azure.com/openai/v1/responses');
    expect((init.headers as Record<string, string>)['api-key']).toBe('test-key');
    const req = JSON.parse(String(init.body));
    expect(req.model).toBe('gpt-6-luna');
    expect(req.text.format).toMatchObject({ type: 'json_schema', strict: true });
    expect(req.input[0].content[1]).toEqual({ type: 'input_image', image_url: 'data:image/jpeg;base64,QUJD', detail: 'high' });
    expect(req.input[0].content[0].text).toMatch(/Never add, combine or derive them/);
    expect(out).toEqual({ status: 200, body: { rows: [ROW], pageNotes: 'Page 3', model: 'gpt-6-luna' } });
  });

  it('sends a PDF as input_file and honours AZURE_LEDGER_DEPLOYMENT', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, azureReply([])));
    await analyseLedger({ fileName: 'page', contentType: 'application/pdf', data: 'JVBERg==' }, { ...ENV, AZURE_LEDGER_DEPLOYMENT: 'other' }, fetchImpl as unknown as typeof fetch);
    const req = JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(req.model).toBe('other');
    expect(req.input[0].content[1]).toEqual({ type: 'input_file', filename: 'page.pdf', file_data: 'data:application/pdf;base64,JVBERg==' });
  });

  it('refuses bad input and missing settings without calling Azure', async () => {
    const fetchImpl = vi.fn();
    const f = fetchImpl as unknown as typeof fetch;
    expect((await analyseLedger({ contentType: 'image/jpeg', data: 'QUJD' }, {}, f)).status).toBe(500);
    expect((await analyseLedger({ contentType: 'text/html', data: 'QUJD' }, ENV, f)).status).toBe(415);
    expect((await analyseLedger({ contentType: 'image/png', data: '<script>' }, ENV, f)).status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('passes Azure errors on as 502 with their message, and rejects non-JSON output', async () => {
    const err = await analyseLedger({ contentType: 'image/png', data: 'QUJD' }, ENV, (async () => jsonResponse(404, { error: { message: 'The API deployment for this resource does not exist.' } })) as unknown as typeof fetch);
    expect(err).toEqual({ status: 502, body: { error: { message: 'The API deployment for this resource does not exist.' } } });
    const bad = await analyseLedger({ contentType: 'image/png', data: 'QUJD' }, ENV, (async () => jsonResponse(200, { output: [{ content: [{ type: 'output_text', text: 'sorry' }] }] })) as unknown as typeof fetch);
    expect(bad.status).toBe(502);
  });
});

describe('browser: analyseLedgerFile', () => {
  it('posts the file to /api/ledger-ocr with the bearer token and returns reviewable rows', async () => {
    signIn();
    const fetchMock = vi.fn(async () => jsonResponse(200, { rows: [ROW], pageNotes: null, model: 'gpt-6-luna' }));
    vi.stubGlobal('fetch', fetchMock);
    const batch = await analyseLedgerFile(new File(['abc'], 'ledger.jpg', { type: 'image/jpeg' }));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(LEDGER_OCR_PATH);
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Bearer \S+/);
    expect(JSON.parse(String(init.body))).toEqual({ fileName: 'ledger.jpg', contentType: 'image/jpeg', data: 'YWJj' });
    expect(batch.id).toBe('');
    expect(batch.status).toBe('Parsed');
    expect(batch.rows[0].cells.commissionAmount.extracted).toBe('5000');
    expect(batch.rows[0].cells.propertyAmount.extracted).toBe('95000');
  });

  it('rejects Excel and shows the server message on failure', async () => {
    signIn();
    await expect(analyseLedgerFile(new File(['x'], 'a.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))).rejects.toThrow(/Excel/);
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(500, { error: { message: 'Ledger analysis is not set up: AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY are needed on the server.' } })));
    const e = await analyseLedgerFile(new File(['x'], 'a.png', { type: 'image/png' })).catch((x) => x);
    expect(e).toBeInstanceOf(LedgerAnalysisError);
    expect(e.message).toMatch(/not set up/);
  });
});

describe('submit helper: allValuesAsCorrections', () => {
  it('sends every non-empty reviewed value (edits win) as ledgerRows[n].Field', () => {
    const b = toOcrBatch({ status: 'Parsed', ledgerRows: [ROW] });
    const out = allValuesAsCorrections(b.rows, { 0: { commissionAmount: '5500', remarks: '  ' } });
    expect(out).toContainEqual({ fieldName: 'ledgerRows[0].CommissionAmount', value: '5500' });
    expect(out).toContainEqual({ fieldName: 'ledgerRows[0].CustomerName', value: 'Ramesh' });
    expect(out).toContainEqual({ fieldName: 'ledgerRows[0].TotalAmountReceived', value: '100000' });
    expect(out.some((c) => c.fieldName.endsWith('.Remarks') || c.fieldName.endsWith('.ReferenceNumber'))).toBe(false);
  });

  it('can leave fields out (the popup does not show or send Remarks)', () => {
    const b = toOcrBatch({ status: 'Parsed', ledgerRows: [{ ...ROW, remarks: 'repeat entry' }] });
    expect(allValuesAsCorrections(b.rows, {}).some((c) => c.fieldName.endsWith('.Remarks'))).toBe(true);
    expect(allValuesAsCorrections(b.rows, {}, DIALOG_FIELDS).some((c) => c.fieldName.endsWith('.Remarks'))).toBe(false);
  });
});
