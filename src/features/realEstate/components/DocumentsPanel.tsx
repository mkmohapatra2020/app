/**
 * Booking documents and images: upload to the dedicated Real Estate container (upload
 * grant), then record it with POST /realestate/documents. Lists documents the booking
 * response includes plus those added in this session.
 */
import { useState } from 'react';
import { useT } from '../../../i18n/language.ts';
import { useToast } from '../../../context/ToastContext.jsx';
import { realEstateApi } from '../api/realEstateApi.ts';
import { useRealEstateMutation } from '../hooks/useRealEstateQuery.ts';
import { DOCUMENT_TYPES, type Id, type RealEstateDocument, type StoredBlob } from '../types/realEstateTypes.ts';
import { date } from '../utils/format.ts';
import { InlineError } from './ApiStateView.tsx';
import BlobUploadField from './BlobUploadField.tsx';
import { SelectInput } from './FormFields.tsx';

export const DOCUMENT_TYPE_LABEL: Record<string, string> = { PaymentReceipt: 'Payment receipt', IdentityProof: 'Identity proof', SitePhoto: 'Site photo', LedgerPage: 'Ledger page' };

export default function DocumentsPanel({ bookingId, initial = [] }: { bookingId: Id; initial?: RealEstateDocument[] }) {
  const t = useT();
  const { toast } = useToast();
  const [type, setType] = useState<string>('Agreement');
  const [added, setAdded] = useState<RealEstateDocument[]>([]);
  const [uploadKey, setUploadKey] = useState(0);
  const create = useRealEstateMutation(realEstateApi.documents.create);
  const docs = [...initial, ...added];

  const record = async (blob: StoredBlob) => {
    const doc = await create.run({ bookingId, documentType: type, blob });
    if (doc) {
      setAdded((l) => [...l, { ...doc, fileName: doc.fileName || blob.fileName, documentType: doc.documentType || type }]);
      setUploadKey((k) => k + 1);
      toast(t('Document added'));
    }
  };

  return (
    <section className="re-card" aria-labelledby="re-docs">
      <h2 id="re-docs">{t('Documents and images')}</h2>
      {docs.length === 0 ? <p className="re-sub">{t('No documents for this booking yet.')}</p> : (
        <ul className="re-doc-list">
          {docs.map((d, i) => (
            <li key={`${String(d.id)}-${i}`}>
              <span className="re-badge re-badge-info">{t(DOCUMENT_TYPE_LABEL[d.documentType] ?? d.documentType)}</span>
              {/* Only a URL the backend returned is linked — the UI never builds storage URLs. */}
              {d.documentUrl ? <a href={d.documentUrl} target="_blank" rel="noopener noreferrer">{d.fileName || t('Open')}</a> : <span>{d.fileName || '—'}</span>}
              {d.uploadedDate && <small className="re-sub">{date(d.uploadedDate)}</small>}
            </li>
          ))}
        </ul>
      )}
      <div className="re-form">
        <SelectInput label={t('Document type')} value={type} onChange={(e) => setType(e.target.value)}
          options={DOCUMENT_TYPES.map((d) => ({ value: d, label: t(DOCUMENT_TYPE_LABEL[d] ?? d) }))} />
        <BlobUploadField key={uploadKey} label={t('Add a document or image')} purpose="Document" disabled={create.pending} onUploaded={(b) => void record(b)} />
        <InlineError error={create.error} />
      </div>
    </section>
  );
}
