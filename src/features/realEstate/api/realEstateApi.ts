/**
 * Real Estate CRM + ledger API — only the routes in the live swagger (2026-11-04).
 * Uses the app's authenticated Axios client (bearer token, refresh-on-401, APIM key,
 * envelope unwrapping, ApiError) — nothing auth-related here.
 *
 * Request bodies follow the swagger request models field by field. Optional values that
 * are empty are left out (the API models them as plain strings / doubles).
 * Buyer payments go to /realestate/bookings/:id/transactions — never the membership
 * payment API.
 *
 * Not in the API (so not called): bookings list, booking by id, overview totals.
 */
import { apiGet, apiPost, pathId } from '../../../api/apiClient.ts';
import { requireAuth } from '../../../api/authApi.ts';
import type { Booking, BookingInput, Customer, CustomerInput, DocumentInput, Id, LedgerTransaction, Partner, PartnerInput, Plot, PlotInput, Project, ProjectInput, RealEstateDocument, TransactionInput } from '../types/realEstateTypes.ts';
import { toBooking, toCustomer, toDocument, toList, toPartner, toPlot, toProject, toTransaction } from './normalize.ts';

export const RE_BASE = '/realestate';

const get = async (path: string, signal?: AbortSignal, params?: object): Promise<unknown> => {
  requireAuth();
  return apiGet<unknown>(`${RE_BASE}${path}`, { signal, params });
};
const post = async (path: string, body?: unknown): Promise<unknown> => {
  requireAuth();
  return apiPost<unknown>(`${RE_BASE}${path}`, body ?? {});
};
const trim = (v: string) => String(v ?? '').trim();
/** Drops undefined / null / '' so optional fields are omitted rather than sent empty. */
const compact = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
/** yyyy-mm-dd (date input) → "yyyy-mm-ddT00:00:00Z" (swagger: date-time); full ISO strings pass through. */
export const isoDate = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00Z` : d);

export const realEstateApi = {
  partners: {
    /** GET /realestate/partners — only partners the caller may see. */
    list: async (signal?: AbortSignal): Promise<Partner[]> => toList(await get('/partners', signal), toPartner),
    /** POST /realestate/partners — createPartnerRequest */
    create: async (p: PartnerInput): Promise<Partner> => toPartner(await post('/partners', compact({
      businessName: trim(p.businessName), contactPerson: trim(p.contactPerson), phone: trim(p.phone),
      email: trim(p.email), address: trim(p.address), gstNumber: trim(p.gstNumber).toUpperCase(),
    }))),
  },

  projects: {
    /** GET /realestate/projects?partnerId={int} (all visible projects when no partner). */
    list: async (partnerId?: Id | null, signal?: AbortSignal): Promise<Project[]> =>
      toList(await get('/projects', signal, partnerId !== undefined && partnerId !== null && partnerId !== '' ? { partnerId } : undefined), toProject),
    /** POST /realestate/projects — createProjectRequest */
    create: async (p: ProjectInput): Promise<Project> => toProject(await post('/projects', compact({
      partnerId: p.partnerId, projectName: trim(p.name), phase: trim(p.phase), location: trim(p.location), district: trim(p.district), state: trim(p.state),
    }))),
  },

  plots: {
    /** GET /realestate/projects/:projectId/plots */
    list: async (projectId: Id, signal?: AbortSignal): Promise<Plot[]> => toList(await get(`/projects/${pathId(projectId, 'project id')}/plots`, signal), toPlot),
    /** POST /realestate/plots — createPlotRequest */
    create: async (p: PlotInput): Promise<Plot> => toPlot(await post('/plots', compact({
      projectId: p.projectId, plotNumber: trim(p.plotNumber), area: p.area, areaUnit: p.areaUnit, facing: p.facing, roadWidth: p.roadWidth,
    }))),
  },

  customers: {
    /** GET /realestate/partners/:partnerId/customers — the whole list (no paging/search in the API). */
    list: async (partnerId: Id, signal?: AbortSignal): Promise<Customer[]> =>
      toList(await get(`/partners/${pathId(partnerId, 'partner id')}/customers`, signal), toCustomer),
    /** POST /realestate/customers — createCustomerRequest */
    create: async (c: CustomerInput): Promise<Customer> => toCustomer(await post('/customers', compact({
      partnerId: c.partnerId, name: trim(c.name), phone: trim(c.phone), email: trim(c.email), address: trim(c.address),
      aadhaarNumber: trim(c.aadhaarNumber).replace(/\s+/g, ''), panNumber: trim(c.panNumber).toUpperCase(),
    }))),
  },

  bookings: {
    /** POST /realestate/bookings — createBookingRequest. 409 when the plot is unavailable. */
    create: async (b: BookingInput): Promise<Booking> => toBooking(await post('/bookings', {
      customerId: b.customerId, plotId: b.plotId, bookingAmount: b.bookingAmount, agreedValue: b.agreedValue,
    })),
  },

  ledger: {
    /** GET /realestate/bookings/:bookingId/transactions */
    list: async (bookingId: Id, signal?: AbortSignal): Promise<LedgerTransaction[]> => toList(await get(`/bookings/${pathId(bookingId, 'booking id')}/transactions`, signal), toTransaction),
    /**
     * POST /realestate/bookings/:bookingId/transactions — createTransactionRequest.
     * The three amounts are sent exactly as entered and independently; an empty commission
     * or property amount (and empty reference / remarks) is omitted, never sent as 0.
     */
    create: async (bookingId: Id, t: TransactionInput): Promise<LedgerTransaction> => toTransaction(await post(`/bookings/${pathId(bookingId, 'booking id')}/transactions`, compact({
      transactionDate: isoDate(t.transactionDate),
      amount: t.amount,
      commissionAmount: t.commissionAmount,
      propertyAmount: t.propertyAmount,
      paymentMode: t.paymentMode,
      referenceNumber: trim(t.referenceNumber),
      remarks: trim(t.remarks),
    }))),
  },

  documents: {
    /**
     * POST /realestate/documents — createDocumentRequest { bookingId, documentType, blobName }.
     * documentUrl is left to the backend: the UI never builds storage URLs.
     */
    create: async (d: DocumentInput): Promise<RealEstateDocument> => {
      const doc = toDocument(await post('/documents', { bookingId: d.bookingId, documentType: d.documentType, blobName: d.blob.blobName }));
      return { ...doc, fileName: doc.fileName || d.blob.fileName };
    },
  },
};

export default realEstateApi;
