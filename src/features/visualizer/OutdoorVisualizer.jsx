import { Link } from 'react-router-dom';
import DesignForm from '../tryNow/DesignForm.jsx';
import { generalEnquiry, useEnquiry } from '../enquiry/enquiry.js';

// AI Space Visualizer — the same form, fields, prompt and API flow as Try now
// (DesignForm), shown inline on the Outdoor page.
export default function OutdoorVisualizer() {
  const enquiry = useEnquiry();
  return (
    <div className="tool-card visualizer reveal" id="visualizer">
      <div className="tool-head">
        <span className="eyebrow">AI Space Visualizer</span>
        <h3>See your terrace or backyard transformed</h3>
        <p>Upload a photo, pick the structure and its exact size, and our AI adds it to your space — or design one from scratch with a labelled spec sheet.</p>
        <p className="vis-studio-link"><span className="pill">New</span> Need reference images, heritage or product concepts and saved requests? <Link to="/design-studio">Open the AI Design Studio →</Link></p>
      </div>
      <DesignForm
        idPrefix="vis"
        extraActions={({ subtype }) => (
          <button type="button" className="btn btn-outline" onClick={() => generalEnquiry(enquiry, `I used the AI Space Visualizer for a ${subtype.label.toLowerCase()} and would like a site visit and quote.`)}>Get a site visit & quote</button>
        )}
      />
    </div>
  );
}
