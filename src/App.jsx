import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Nav from './components/layout/Nav.jsx';
import Hero from './sections/Hero.jsx';
import LazySection from './components/common/LazySection.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import EnquiryDialog from './features/enquiry/EnquiryDialog.jsx';
import useReveal from './hooks/useReveal.js';
import useHashScroll from './hooks/useHashScroll.js';
import { EnquiryContext } from './features/enquiry/enquiry.js';
import { afterLoad } from './utils/idle.js';

// Everything below the hero is code-split and rendered when it nears the viewport.
// `minHeight` reserves roughly the section's height so the page doesn't jump.
const SECTIONS = [
  { name: 'pillars', anchor: 'about', minHeight: 900, load: () => import('./sections/Pillars.jsx') },
  { name: 'workshops', anchor: 'diy', minHeight: 900, load: () => import('./sections/Campaigns.jsx') },
  { name: 'project configurator', minHeight: 520, load: () => import('./features/configurator/ConfiguratorSection.jsx') },
  { name: 'community map', anchor: 'community', minHeight: 900, load: () => import('./sections/CommunityMap.jsx') },
  { name: 'outdoor showcase', anchor: 'outdoor', minHeight: 1100, load: () => import('./sections/Showcase.jsx') },
  { name: 'outdoor visualizer', minHeight: 640, load: () => import('./features/visualizer/VisualizerSection.jsx') },
  { name: 'project gallery', anchor: 'gallery', minHeight: 900, load: () => import('./sections/ProjectGallery.jsx') },
  { name: 'senior hub', anchor: 'seniors', minHeight: 1500, load: () => import('./sections/SeniorHub.jsx') },
  { name: 'knowledge center', anchor: 'learn', minHeight: 1000, load: () => import('./sections/KnowledgeCenter.jsx') },
  { name: 'workshop journey', anchor: 'journey', minHeight: 520, load: () => import('./sections/Journey.jsx') },
  { name: 'kids passport', minHeight: 560, load: () => import('./features/passport/PassportSection.jsx') },
  { name: 'heritage', anchor: 'heritage', minHeight: 900, load: () => import('./sections/Heritage.jsx') },
  { name: 'stories', anchor: 'stories', minHeight: 500, load: () => import('./sections/Stories.jsx') },
  { name: 'membership', anchor: 'club', minHeight: 640, load: () => import('./sections/Membership.jsx') },
  { name: 'footer', anchor: 'contact', minHeight: 420, load: () => import('./components/layout/Footer.jsx') },
];

const NudgeModal = lazy(() => import('./features/nudge/NudgeModal.jsx'));

export default function App() {
  useReveal();
  useHashScroll();
  const enquiry = useRef(null);
  const [afterLoaded, setAfterLoaded] = useState(false);

  // Once the page has loaded and the browser is idle, prefetch every section
  // chunk so scrolling never waits on the network, and mount the nudge.
  useEffect(() => afterLoad(() => { SECTIONS.forEach((s) => s.load()); setAfterLoaded(true); }, 3000), []);

  const footer = SECTIONS[SECTIONS.length - 1];
  return (
    <EnquiryContext.Provider value={enquiry}>
      <a className="skip-link" href="#main">Skip to content</a>
      <ErrorBoundary inline name="menu"><Nav /></ErrorBoundary>
      <ErrorBoundary inline name="banner"><Hero /></ErrorBoundary>
      <main id="main">
        {SECTIONS.slice(0, -1).map((s) => <LazySection key={s.name} {...s} />)}
      </main>
      <LazySection key={footer.name} {...footer} />
      <EnquiryDialog ref={enquiry} />
      {afterLoaded && <Suspense fallback={null}><NudgeModal /></Suspense>}
    </EnquiryContext.Provider>
  );
}
