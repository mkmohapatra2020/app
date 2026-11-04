/**
 * Bookings and OCR batches created in this browser tab.
 *
 * The live API has no list or detail endpoints for bookings and no OCR batch list, so the
 * UI remembers what was created here (sessionStorage — cleared when the tab closes, like
 * the login session) to offer them in selectors and show booking details. IDs can always
 * be typed in as well. Only display fields are kept; no Aadhaar / PAN or contact details.
 */
import type { Booking, Id } from '../types/realEstateTypes.ts';
import type { OcrBatch } from '../types/ocrTypes.ts';

const KEY = 'wl-re-recent';
const MAX = 30;

export interface RecentBooking {
  id: Id;
  customerName: string;
  plotNumber: string;
  projectName: string;
  bookingDate: string;
  bookingAmount: number;
  agreedValue: number;
  status: string;
}
export interface RecentBatch { id: Id; fileName: string; status: string; createdAt: string }
interface Store { bookings: RecentBooking[]; batches: RecentBatch[] }

function read(): Store {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || 'null') as Store | null;
    return { bookings: Array.isArray(v?.bookings) ? v!.bookings : [], batches: Array.isArray(v?.batches) ? v!.batches : [] };
  } catch { return { bookings: [], batches: [] }; }
}
function write(s: Store) {
  try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked: selectors fall back to typing an ID */ }
}
const upsert = <T extends { id: Id }>(list: T[], item: T) => [item, ...list.filter((x) => String(x.id) !== String(item.id))].slice(0, MAX);

export const recentBookings = (): RecentBooking[] => read().bookings;
export const recentBooking = (id: Id): RecentBooking | undefined => read().bookings.find((b) => String(b.id) === String(id));
export function rememberBooking(b: Booking, extra: Partial<RecentBooking> = {}) {
  if (b.id === '' || b.id === null) return;
  const s = read();
  write({
    ...s,
    bookings: upsert(s.bookings, {
      id: b.id, customerName: b.customerName || extra.customerName || '', plotNumber: b.plotNumber || extra.plotNumber || '',
      projectName: b.projectName || extra.projectName || '', bookingDate: b.bookingDate || new Date().toISOString(),
      bookingAmount: b.bookingAmount || extra.bookingAmount || 0, agreedValue: b.agreedValue || extra.agreedValue || 0, status: String(b.status || 'Pending'),
    }),
  });
}

export const recentBatches = (): RecentBatch[] => read().batches;
export function rememberBatch(b: OcrBatch) {
  if (b.id === '' || b.id === null) return;
  const s = read();
  const prev = s.batches.find((x) => String(x.id) === String(b.id));
  write({ ...s, batches: upsert(s.batches, { id: b.id, fileName: b.fileName || prev?.fileName || '', status: String(b.status), createdAt: b.createdAt || prev?.createdAt || new Date().toISOString() }) });
}
