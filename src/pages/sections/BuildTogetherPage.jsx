import SectionPage from './SectionPage.jsx';
import BuildTogether from '../../sections/BuildTogether.jsx';

// /build-together — family / multi-generation programmes.
export default function BuildTogetherPage() {
  return (
    <SectionPage title="Build Together" eyebrow="DIY campaign"
      intro="Family build days where kids, parents and grandparents make something real together, with safe roles for every age."
      sections={[BuildTogether]}
      related={[
        ['/kids', 'Kids', 'Kids DIY campaign and school projects', '🧒'],
        ['/seniors', 'Seniors', 'Elderly home improvement and programmes', '🧓'],
        ['/workshops?tab=campaigns', 'All DIY campaigns', 'Register for a campaign', '🗓️'],
      ]} />
  );
}
