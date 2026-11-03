/** Client-side form checks. The backend re-validates everything. */
import { enT, type T } from '../../../i18n/language.ts';
import { PAYMENT_MODES, type Plot } from '../types/realEstateTypes.ts';

export type Errors<K extends string> = Partial<Record<K, string>>;

const blank = (v: unknown) => String(v ?? '').trim() === '';
const amount = (v: unknown) => Number(String(v ?? '').replace(/,/g, ''));
const isPositive = (v: unknown) => !blank(v) && Number.isFinite(amount(v)) && amount(v) > 0;

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const isIndianPhone = (v: string) => /^(\+?91[\s-]?)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, ''));
export const isAadhaar = (v: string) => /^[2-9]\d{11}$/.test(v.replace(/\s/g, ''));
export const isPan = (v: string) => /^[A-Z]{5}\d{4}[A-Z]$/.test(v.trim().toUpperCase());
export const isGstin = (v: string) => /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.trim().toUpperCase());
export const toAmount = amount;

/** Messages go through `t` (English by default) so forms show them in the chosen language. */
const required = <K extends string>(values: Record<K, unknown>, keys: [K, string][], t: T): Errors<K> => {
  const e: Errors<K> = {};
  for (const [k, label] of keys) if (blank(values[k])) e[k] = t('{field} is required.', { field: t(label) });
  return e;
};

export interface PartnerForm { businessName: string; contactPerson: string; phone: string; email: string; address: string; gstNumber: string }
export function validatePartner(v: PartnerForm, t: T = enT): Errors<keyof PartnerForm> {
  const e = required<keyof PartnerForm>(v, [['businessName', 'Business name'], ['contactPerson', 'Contact person'], ['phone', 'Phone']], t);
  if (!e.phone && !isIndianPhone(v.phone)) e.phone = t('Enter a valid 10-digit mobile number.');
  if (!blank(v.email) && !isEmail(v.email)) e.email = t('Enter a valid email address.');
  if (!blank(v.gstNumber) && !isGstin(v.gstNumber)) e.gstNumber = t('Enter a valid 15-character GSTIN.');
  return e;
}

export interface ProjectForm { partnerId: string; name: string; phase: string; location: string; district: string; state: string }
export function validateProject(v: ProjectForm, t: T = enT): Errors<keyof ProjectForm> {
  return required<keyof ProjectForm>(v, [['partnerId', 'Partner'], ['name', 'Project name'], ['location', 'Location'], ['district', 'District'], ['state', 'State']], t);
}

export interface PlotForm { plotNumber: string; area: string; areaUnit: string; facing: string; roadWidth: string }
export function validatePlot(v: PlotForm, t: T = enT): Errors<keyof PlotForm> {
  const e = required<keyof PlotForm>(v, [['plotNumber', 'Plot number'], ['area', 'Area'], ['areaUnit', 'Area unit']], t);
  if (!e.area && !isPositive(v.area)) e.area = t('Area must be more than 0.');
  if (!blank(v.roadWidth) && !isPositive(v.roadWidth)) e.roadWidth = t('Road width must be more than 0.');
  return e;
}

export interface CustomerForm { partnerId: string; name: string; phone: string; email: string; address: string; aadhaarNumber: string; panNumber: string }
export function validateCustomer(v: CustomerForm, t: T = enT): Errors<keyof CustomerForm> {
  const e = required<keyof CustomerForm>(v, [['partnerId', 'Partner'], ['name', 'Name'], ['phone', 'Phone']], t);
  if (!e.phone && !isIndianPhone(v.phone)) e.phone = t('Enter a valid 10-digit mobile number.');
  if (!blank(v.email) && !isEmail(v.email)) e.email = t('Enter a valid email address.');
  if (!blank(v.aadhaarNumber) && !isAadhaar(v.aadhaarNumber)) e.aadhaarNumber = t('Aadhaar must be 12 digits.');
  if (!blank(v.panNumber) && !isPan(v.panNumber)) e.panNumber = t('PAN must look like ABCDE1234F.');
  return e;
}

export interface BookingForm { customerId: string; plotId: string; bookingAmount: string; agreedValue: string }
/** `plot` is the selected plot, when known, so an unavailable one is refused before submit. */
export function validateBooking(v: BookingForm, plot?: Pick<Plot, 'status'> | null, t: T = enT): Errors<keyof BookingForm> {
  const e = required<keyof BookingForm>(v, [['customerId', 'Customer'], ['plotId', 'Plot'], ['bookingAmount', 'Booking amount'], ['agreedValue', 'Agreed value']], t);
  if (!e.plotId && plot && plot.status !== 'Available') e.plotId = t("This plot is {status} and can't be booked.", { status: t(String(plot.status)).toLowerCase() });
  if (!e.bookingAmount && !isPositive(v.bookingAmount)) e.bookingAmount = t('Booking amount must be more than 0.');
  if (!e.agreedValue && !isPositive(v.agreedValue)) e.agreedValue = t('Agreed value must be more than 0.');
  if (!e.bookingAmount && !e.agreedValue && amount(v.bookingAmount) > amount(v.agreedValue)) e.bookingAmount = t("Booking amount can't exceed the agreed value.");
  return e;
}

export interface TransactionForm { transactionDate: string; amount: string; paymentMode: string; referenceNumber: string; remarks: string }
export function validateTransaction(v: TransactionForm, today = new Date(), t: T = enT): Errors<keyof TransactionForm> {
  const e = required<keyof TransactionForm>(v, [['transactionDate', 'Transaction date'], ['amount', 'Amount'], ['paymentMode', 'Payment mode']], t);
  if (!e.amount && !isPositive(v.amount)) e.amount = t('Amount must be more than 0.');
  if (!e.paymentMode && !(PAYMENT_MODES as readonly string[]).includes(v.paymentMode)) e.paymentMode = t('Choose a payment mode.');
  if (!e.transactionDate) {
    const d = new Date(v.transactionDate);
    if (Number.isNaN(d.getTime())) e.transactionDate = t('Enter a valid date.');
    else if (d.getTime() > today.getTime() + 86_400_000) e.transactionDate = t("The date can't be in the future.");
  }
  if (v.paymentMode && v.paymentMode !== 'Cash' && blank(v.referenceNumber)) e.referenceNumber = t('Add the UPI / cheque / bank reference.');
  return e;
}

export const hasErrors = (e: object) => Object.values(e).some(Boolean);
