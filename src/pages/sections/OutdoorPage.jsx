import SectionPage from './SectionPage.jsx';
import Showcase from '../../sections/Showcase.jsx';
import VisualizerSection from '../../features/visualizer/VisualizerSection.jsx';
import ProjectGallery from '../../sections/ProjectGallery.jsx';

// /outdoor — Outdoor Living: showcase, AI Space Visualizer, structure types.
export default function OutdoorPage() {
  return (
    <SectionPage title="Outdoor Living" eyebrow="Pergolas · gazebos · decks"
      intro="See featured outdoor projects, try the AI Space Visualizer on a photo of your own terrace or garden, and browse the structures we build."
      sections={[VisualizerSection, Showcase, ProjectGallery]}
      related={[
        ['/design-studio', 'AI Design Studio', 'Full design requests with site photos and references', '✨'],
        ['/workshops?q=pergola', 'Pergola workshops', 'Build one yourself with our team', '🔨'],
        ['/contact', 'Get a quote', 'Site visit and estimate for your space', '📐'],
      ]} />
  );
}
