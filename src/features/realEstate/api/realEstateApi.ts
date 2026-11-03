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
import type { Booking, BookingInput, Customer, CustomerInput, DashboardSummary, Id, LedgerTransaction, PageQuery, Paged, Partner, PartnerInput, Plot, PlotInput, Project, ProjectInput, TransactionInput } from '../types/realEstateTypes.ts';
import { toBooking, toCustomer, toDashboard, toList, toPaged, toPartner, toPlot, toProject, toTransaction } from './normalize.ts';

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

export const realEstateApi = {
  /** GET /realestate/dashboard — assumed summary endpoint (see README). */
  dashboard: async (signal?: AbortSignal): Promise<DashboardSummary> => toDashboard(await get('/dashboard', signal)),

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
    /** GET /realestate/projects */
    list: async (signal?: AbortSignal): Promise<Project[]> => toList(await get('/projects', signal), toProject),
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
    /** GET /realestate/bookings — assumed list endpoint (see README). */
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
    /** POST /realestate/bookings/:bookingId/transactions */
    create: async (bookingId: Id, t: TransactionInput): Promise<LedgerTransaction> => toTransaction(await post(`/bookings/${pathId(bookingId, 'booking id')}/transactions`, {
      transactionDate: t.transactionDate, amount: t.amount, paymentMode: t.paymentMode, referenceNumber: trim(t.referenceNumber), remarks: trim(t.remarks),
      ...(t.proof ? { proofBlobName: t.proof.blobName, proofContainer: t.proof.container } : {}),
    })),
  },
};

export default realEstateApi;
