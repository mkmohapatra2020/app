/**
 * Real Estate routes, mounted by App.jsx at `real-estate/*` (behind ProtectedRoute).
 * Each screen is its own chunk; each one gates itself on the backend access response.
 */
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { LoadingState } from '../components/ApiStateView.tsx';
import '../realEstate.css';
import '../i18n/or.ts';

const Dashboard = lazy(() => import('../pages/RealEstateDashboardPage.tsx'));
const Partners = lazy(() => import('../pages/PartnersPage.tsx'));
const Projects = lazy(() => import('../pages/ProjectsPage.tsx'));
const Plots = lazy(() => import('../pages/PlotsPage.tsx'));
const Customers = lazy(() => import('../pages/CustomersPage.tsx'));
const Bookings = lazy(() => import('../pages/BookingsPage.tsx'));
const BookingLedger = lazy(() => import('../pages/BookingLedgerPage.tsx'));
const Ledger = lazy(() => import('../pages/LedgerTransactionsPage.tsx'));
const Documents = lazy(() => import('../pages/DocumentsPage.tsx'));
const OcrBatches = lazy(() => import('../pages/OcrBatchesPage.tsx'));
const OcrUpload = lazy(() => import('../pages/OcrUploadPage.tsx'));
const OcrReview = lazy(() => import('../pages/OcrReviewPage.tsx'));
const NotFound = lazy(() => import('../../../pages/NotFoundPage.jsx'));

/** Paths relative to /real-estate (documented in src/features/realEstate/README.md). */
export const REAL_ESTATE_PATHS = [
  '', 'partners', 'projects', 'projects/:projectId/plots', 'customers', 'bookings',
  'bookings/:bookingId', 'bookings/:bookingId/ledger', 'ledger', 'documents', 'ocr', 'ocr/new', 'ocr/:batchId',
] as const;

export default function RealEstateRoutes() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="partners" element={<Partners />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:projectId/plots" element={<Plots />} />
        <Route path="customers" element={<Customers />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="bookings/:bookingId" element={<BookingLedger view="detail" />} />
        <Route path="bookings/:bookingId/ledger" element={<BookingLedger view="ledger" />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="documents" element={<Documents />} />
        <Route path="ocr" element={<OcrBatches />} />
        <Route path="ocr/new" element={<OcrUpload />} />
        <Route path="ocr/:batchId" element={<OcrReview />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
