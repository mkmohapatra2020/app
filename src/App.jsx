import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Nav from './components/layout/Nav.jsx';
import LazySection from './components/common/LazySection.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import RequireAuth from './components/common/RequireAuth.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';
import EnquiryDialog from './features/enquiry/EnquiryDialog.jsx';
import { EnquiryContext } from './features/enquiry/enquiry.js';
import { ToastProvider } from './context/ToastContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import HomePage from './pages/HomePage.jsx';
import useReveal from './hooks/useReveal.js';

// Every screen except the home page is its own chunk.
const pages = {
  Login: lazy(() => import('./pages/auth/LoginPage.jsx')),
  Register: lazy(() => import('./pages/auth/RegisterPage.jsx')),
  Forgot: lazy(() => import('./pages/auth/ForgotPasswordPage.jsx')),
  Reset: lazy(() => import('./pages/auth/ResetPasswordPage.jsx')),
  Profile: lazy(() => import('./pages/account/ProfilePage.jsx')),
  Workshops: lazy(() => import('./pages/workshops/WorkshopsPage.jsx')),
  WorkshopDetail: lazy(() => import('./pages/workshops/WorkshopDetailPage.jsx')),
  CampaignDetail: lazy(() => import('./pages/workshops/CampaignDetailPage.jsx')),
  Events: lazy(() => import('./pages/events/EventsPage.jsx')),
  Community: lazy(() => import('./pages/community/CommunityPage.jsx')),
  Learn: lazy(() => import('./pages/learn/LearnPage.jsx')),
  Article: lazy(() => import('./pages/learn/ArticlePage.jsx')),
  Heritage: lazy(() => import('./pages/heritage/HeritagePage.jsx')),
  ElderDiy: lazy(() => import('./pages/elderly/ElderDiyPage.jsx')),
  Incubator: lazy(() => import('./pages/incubator/IncubatorPage.jsx')),
  Studio: lazy(() => import('./pages/studio/DesignStudioPage.jsx')),
  Project: lazy(() => import('./pages/projects/ProjectPage.jsx')),
  Shop: lazy(() => import('./pages/shop/ShopPage.jsx')),
  Product: lazy(() => import('./pages/shop/ProductPage.jsx')),
  Cart: lazy(() => import('./pages/shop/CartPage.jsx')),
  Checkout: lazy(() => import('./pages/shop/CheckoutPage.jsx')),
  Contact: lazy(() => import('./pages/contact/ContactPage.jsx')),
  Admin: lazy(() => import('./pages/admin/AdminPage.jsx')),
  NotFound: lazy(() => import('./pages/NotFoundPage.jsx')),
};
const loadFooter = () => import('./components/layout/Footer.jsx');

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => { if (!hash) window.scrollTo(0, 0); }, [pathname, hash]);
  return null;
}

function Layout() {
  useReveal();
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <ErrorBoundary inline name="menu"><Nav /></ErrorBoundary>
      <ErrorBoundary inline name="page">
        <Suspense fallback={<div className="page-loading"><LoadingSpinner size="lg" text="Loading…" /></div>}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
      <LazySection name="footer" anchor="contact" minHeight={420} load={loadFooter} />
    </>
  );
}

const auth = (el, admin = false) => <RequireAuth admin={admin}>{el}</RequireAuth>;

export default function App() {
  const enquiry = useRef(null);
  const P = pages;
  return (
    <BrowserRouter>
      <ToastProvider>
        <CartProvider>
          <EnquiryContext.Provider value={enquiry}>
            <ScrollToTop />
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="login" element={<P.Login />} />
                <Route path="register" element={<P.Register />} />
                <Route path="forgot-password" element={<P.Forgot />} />
                <Route path="reset-password" element={<P.Reset />} />
                <Route path="profile" element={auth(<P.Profile />)} />
                <Route path="my-designs" element={auth(<P.Profile tab="designs" />)} />
                <Route path="workshops" element={<P.Workshops />} />
                <Route path="workshops/:id" element={<P.WorkshopDetail />} />
                <Route path="campaigns/:id" element={<P.CampaignDetail />} />
                <Route path="events" element={<P.Events />} />
                <Route path="community" element={<P.Community />} />
                <Route path="learn" element={<P.Learn />} />
                <Route path="learn/:slug" element={<P.Article />} />
                <Route path="heritage" element={<P.Heritage />} />
                <Route path="elderly-diy" element={<P.ElderDiy />} />
                <Route path="incubator" element={<P.Incubator />} />
                <Route path="design-studio" element={<P.Studio />} />
                <Route path="projects/:id" element={<P.Project />} />
                <Route path="shop" element={<P.Shop />} />
                <Route path="shop/:id" element={<P.Product />} />
                <Route path="cart" element={<P.Cart />} />
                <Route path="checkout" element={auth(<P.Checkout />)} />
                <Route path="contact" element={<P.Contact />} />
                <Route path="admin" element={auth(<P.Admin />, true)} />
                <Route path="*" element={<P.NotFound />} />
              </Route>
            </Routes>
            <EnquiryDialog ref={enquiry} />
          </EnquiryContext.Provider>
        </CartProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
