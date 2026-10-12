import { useRef } from 'react';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Pillars from './components/Pillars.jsx';
import Campaigns from './components/Campaigns.jsx';
import Configurator from './components/Configurator.jsx';
import CommunityMap from './components/CommunityMap.jsx';
import Showcase from './components/Showcase.jsx';
import OutdoorVisualizer from './components/OutdoorVisualizer.jsx';
import ProjectGallery from './components/ProjectGallery.jsx';
import SeniorHub from './components/SeniorHub.jsx';
import KnowledgeCenter from './components/KnowledgeCenter.jsx';
import Journey from './components/Journey.jsx';
import KidsPassport from './components/KidsPassport.jsx';
import Heritage from './components/Heritage.jsx';
import Stories from './components/Stories.jsx';
import Membership from './components/Membership.jsx';
import Footer from './components/Footer.jsx';
import EnquiryDialog from './components/EnquiryDialog.jsx';
import NudgeModal from './components/NudgeModal.jsx';
import useReveal from './hooks/useReveal.js';
import { EnquiryContext } from './lib/enquiry.js';

export default function App() {
  useReveal();
  const enquiry = useRef(null);
  return (
    <EnquiryContext.Provider value={enquiry}>
      <a className="skip-link" href="#main">Skip to content</a>
      <Nav />
      <Hero />
      <main id="main">
        <Pillars />
        <Campaigns />
        <section className="sec sec-warm sec-tight" aria-label="DIY project configurator"><div className="wrap"><Configurator /></div></section>
        <CommunityMap />
        <Showcase />
        <section className="sec sec-tight" aria-label="Outdoor space visualizer"><div className="wrap"><OutdoorVisualizer /></div></section>
        <ProjectGallery />
        <SeniorHub />
        <KnowledgeCenter />
        <Journey />
        <section className="sec sec-tight" aria-label="Kids DIY passport"><div className="wrap"><KidsPassport /></div></section>
        <Heritage />
        <Stories />
        <Membership />
      </main>
      <Footer />
      <EnquiryDialog ref={enquiry} />
      <NudgeModal />
    </EnquiryContext.Provider>
  );
}
