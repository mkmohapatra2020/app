import { lazy, Suspense, useEffect, useState } from 'react';
import Hero from '../sections/Hero.jsx';
import LazySection from '../components/common/LazySection.jsx';
import ErrorBoundary from '../components/common/ErrorBoundary.jsx';
import useHashScroll from '../hooks/useHashScroll.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { scrollToTarget } from '../utils/scrollTo.js';
import { afterLoad } from '../utils/idle.js';

// Everything below the hero is code-split and rendered when it nears the viewport.
// `minHeight` reserves roughly the section's height so the page doesn't jump.
const SECTIONS = [
  { name: 'pillars', anchor: 'about', minHeight: 900, load: () => import('../sections/Pillars.jsx') },
  { name: 'flagships', anchor: 'flagships', minHeight: 760, load: () => import('../sections/Flagships.jsx') },
  { name: 'workshops', anchor: 'diy', minHeight: 900, load: () => import('../sections/Campaigns.jsx') },
  { name: 'project configurator', minHeight: 520, load: () => import('../features/configurator/ConfiguratorSection.jsx') },
  { name: 'community map', anchor: 'community', minHeight: 900, load: () => import('../sections/CommunityMap.jsx') },
  { name: 'knowledge center', anchor: 'learn', minHeight: 1000, load: () => import('../sections/KnowledgeCenter.jsx') },
  { name: 'workshop journey', anchor: 'journey', minHeight: 520, load: () => import('../sections/Journey.jsx') },
  { name: 'heritage', anchor: 'heritage', minHeight: 900, load: () => import('../sections/Heritage.jsx') },
  { name: 'stories', anchor: 'stories', minHeight: 500, load: () => import('../sections/Stories.jsx') },
  { name: 'membership', anchor: 'club', minHeight: 640, load: () => import('../sections/Membership.jsx') },
];

const NudgeModal = lazy(() => import('../features/nudge/NudgeModal.jsx'));

// Sections that now have their own pages: old /#anchor links forward there.
const MOVED = {
  '#outdoor': '/outdoor', '#visualizer': '/outdoor#visualizer', '#gallery': '/outdoor#gallery',
  '#seniors': '/seniors', '#safety-score': '/seniors#safety-score',
  '#passport': '/kids', '#together': '/build-together', '#restoration': '/heritage#restoration',
};

export default function HomePage() {
  useHashScroll();
  const location = useLocation();
  const [afterLoaded, setAfterLoaded] = useState(false);

  // Once the page has loaded and the browser is idle, prefetch every section
  // chunk so scrolling never waits on the network, and mount the nudge.
  useEffect(() => afterLoad(() => { SECTIONS.forEach((s) => s.load()); setAfterLoaded(true); }, 3000), []);
  const navigate = useNavigate();
  // Links like /#diy from other pages: scroll once the home page is shown;
  // anchors of sections that moved to their own page are forwarded there.
  useEffect(() => {
    if (MOVED[location.hash]) { navigate(MOVED[location.hash], { replace: true }); return; }
    if (location.hash) scrollToTarget(location.hash); else window.scrollTo(0, 0);
  }, [location.hash]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <ErrorBoundary inline name="banner"><Hero /></ErrorBoundary>
      <main id="main">
        {SECTIONS.map((s) => <LazySection key={s.name} {...s} />)}
      </main>
      {afterLoaded && <Suspense fallback={null}><NudgeModal /></Suspense>}
    </>
  );
}
