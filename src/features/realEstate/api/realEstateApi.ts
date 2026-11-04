/**
 * Real Estate CRM + ledger API. Uses the app's authenticated Axios client (bearer token,
 * refresh-on-401, APIM key, envelope unwrapping, ApiError) — nothing auth-related here.
 *
 * Request bodies are built field-by-field so nothing unexpected (or sensitive) is sent.
 * Buyer payments go to /realestate/bookings/:id/transactions — never the membership
 * payment API.
 */
import { apiGet, apiPost, pathId } from '../../../api/apiClient.ts';
import { requireAuth } from '../../../api/authApi.ts';
import { isApiError } from '../../../api/errors.ts';
import type { Booking, BookingInput, Customer, CustomerInput, DocumentInput, Id, LedgerTransaction, OverviewTotals, PageQuery, Paged, Partner, PartnerInput, Plot, PlotInput, Project, ProjectInput, RealEstateDocument, TransactionInput } from '../types/realEstateTypes.ts';
import { installRealEstateMock } from '../mocks/realEstateMock.ts';
import { toBooking, toCustomer, toDocument, toList, toOverview, toPaged, toPartner, toPlot, toProject, toTransaction } from './normalize.ts';

// Optional sample data for local demos (VITE_REALESTATE_MOCK=on); off by default — the real API is live.
installRealEstateMock();

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
const pageParams = (q: PageQuery = {}) => Object.fromEntries(Object.entries({ page: q.page, pageSize: q.pageSize, search: q.search || undefined, status: q.status || undefined }).filter(([, v]) => v !== undefined));
/** yyyy-mm-dd (date input) → "yyyy-mm-ddT00:00:00Z"; full ISO strings pass through. */
export const isoDate = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00Z` : d);

export const realEstateApi = {
  /**
   * GET /realestate/overview — optional aggregate endpoint (not in the API list yet).
   * Returns null when it doesn't exist, so the UI shows "not available" instead of
   * inventing totals.
   */
  overview: async (signal?: AbortSignal): Promise<OverviewTotals | null> => {
    try {
      return toOverview(await get('/overview', signal));
    } catch (e) {
      if (isApiError(e) && (e.kind === 'notFound' || e.kind === 'network')) return null;
      throw e;
    }
  },

  partners: {
    /** GET /realestate/partners — only partners the caller may see. */
    list: async (signal?: AbortSignal): Promise<Partner[]> => toList(await get('/partners', signal), toPartner),
    /** POST /realestate/partners */
    create: async (p: PartnerInput): Promise<Partner> => toPartner(await post('/partners', {
      businessName: trim(p.businessName), contactPerson: trim(p.contactPerson), phone: trim(p.phone),
      email: trim(p.email), address: trim(p.address), gstNumber: trim(p.gstNumber).toUpperCase(),
    })),
  },

  projects: {
    /** GET /realestate/projects?partnerId={id} (all visible projects when no partner). */
    list: async (partnerId?: Id | null, signal?: AbortSignal): Promise<Project[]> =>
      toList(await get('/projects', signal, partnerId !== undefined && partnerId !== null && partnerId !== '' ? { partnerId } : undefined), toProject),
    /** POST /realestate/projects */
    create: async (p: ProjectInput): Promise<Project> => toProject(await post('/projects', {
      partnerId: p.partnerId, projectName: trim(p.name), phase: trim(p.phase), location: trim(p.location), district: trim(p.district), state: trim(p.state),
    })),
  },

  plots: {
    /** GET /realestate/projects/:projectId/plots */
    list: async (projectId: Id, signal?: AbortSignal): Promise<Plot[]> => toList(await get(`/projects/${pathId(projectId, 'project id')}/plots`, signal), toPlot),
    /** POST /realestate/plots */
    create: async (p: PlotInput): Promise<Plot> => toPlot(await post('/plots', {
      projectId: p.projectId, plotNumber: trim(p.plotNumber), area: p.area, areaUnit: p.areaUnit, facing: p.facing, roadWidth: p.roadWidth,
    })),
  },

  customers: {
    /** GET /realestate/partners/:partnerId/customers */
    list: async (partnerId: Id, q: PageQuery = {}, signal?: AbortSignal): Promise<Paged<Customer>> =>
      toPaged(await get(`/partners/${pathId(partnerId, 'partner id')}/customers`, signal, pageParams(q)), toCustomer, q.page, q.pageSize),
    /** POST /realestate/customers */
    create: async (c: CustomerInput): Promise<Customer> => toCustomer(await post('/customers', {
      partnerId: c.partnerId, name: trim(c.name), phone: trim(c.phone), email: trim(c.email), address: trim(c.address),
      aadhaarNumber: trim(c.aadhaarNumber).replace(/\s+/g, '') || null, panNumber: trim(c.panNumber).toUpperCase() || null,
    })),
  },

  bookings: {
    /** GET /realestate/bookings — assumed list endpoint (see README); screens fall back to "enter booking ID" on 404. */
    list: async (q: PageQuery = {}, signal?: AbortSignal): Promise<Paged<Booking>> => toPaged(await get('/bookings', signal, pageParams(q)), toBooking, q.page, q.pageSize),
    /** GET /realestate/bookings/:bookingId — assumed (see README). */
    get: async (bookingId: Id, signal?: AbortSignal): Promise<Booking> => toBooking(await get(`/bookings/${pathId(bookingId, 'booking id')}`, signal)),
    /** POST /realestate/bookings — 409 when the plot is no longer available. */
    create: async (b: BookingInput): Promise<Booking> => toBooking(await post('/bookings', {
      customerId: b.customerId, plotId: b.plotId, bookingAmount: b.bookingAmount, agreedValue: b.agreedValue,
    })),
  },

  ledger: {
    /** GET /realestate/bookings/:bookingId/transactions */
    list: async (bookingId: Id, signal?: AbortSignal): Promise<LedgerTransaction[]> => toList(await get(`/bookings/${pathId(bookingId, 'booking id')}/transactions`, signal), toTransaction),
    /**
     * POST /realestate/bookings/:bookingId/transactions
     * The three amounts are sent exactly as entered; empty commission/property stay null.
     */
    create: async (bookingId: Id, t: TransactionInput): Promise<LedgerTransaction> => toTransaction(await post(`/bookings/${pathId(bookingId, 'booking id')}/transactions`, {
      transactionDate: isoDate(t.transactionDate),
      amount: t.amount,
      commissionAmount: t.commissionAmount,
      propertyAmount: t.propertyAmount,
      paymentMode: t.paymentMode,
      referenceNumber: trim(t.referenceNumber) || null,
      remarks: trim(t.remarks) || null,
    })),
  },

  documents: {
    /** POST /realestate/documents — records an already-uploaded file against a booking. */
    create: async (d: DocumentInput): Promise<RealEstateDocument> => {
      const doc = toDocument(await post('/documents', { bookingId: d.bookingId, documentType: d.documentType, blobName: d.blob.blobName }));
      return { ...doc, fileName: doc.fileName || d.blob.fileName };
    },
  },
};

export default realEstateApi;
