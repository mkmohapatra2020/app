import SectionPage from './SectionPage.jsx';
import SeniorHub from '../../sections/SeniorHub.jsx';

// /seniors — Elderly Home Improvement Hub (includes the Senior Safety Score).
export default function SeniorsPage() {
  return (
    <SectionPage title="Seniors" eyebrow="Safe, comfortable homes for every age"
      intro="Simple home improvements for parents and grandparents, a two-minute Senior Safety Score, and programmes where elders keep learning and building."
      sections={[SeniorHub]}
      relatedTitle="Related campaigns"
      related={[
        ['/elderly-diy', 'Elderly DIY', 'Gentle, social DIY programmes for seniors', '🪴'],
        ['/heritage#restoration', 'Heritage Restoration', 'Restore family pieces and heritage homes', '🏛️'],
        ['/build-together', 'Build Together', 'Three generations, one weekend project', '👨‍👩‍👧'],
      ]} />
  );
}
