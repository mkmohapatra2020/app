// Product types, sub-types and default sizes (all in feet) for the Try now generator.
// Add a sub-type here and it shows up in the dialog automatically.

export const catalog = [
  {
    id: 'outdoor',
    label: 'Outdoor living',
    subtypes: [
      { id: 'pergola', label: 'Pergola', dims: { length: 12, width: 10, height: 9 } },
      { id: 'gazebo', label: 'Gazebo', dims: { length: 12, width: 12, height: 10 } },
      { id: 'deck', label: 'Timber deck', dims: { length: 16, width: 12, height: 2 } },
      { id: 'canopy', label: 'Covered patio roof', dims: { length: 14, width: 10, height: 9 } },
    ],
  },
  {
    id: 'furniture',
    label: 'Furniture & décor',
    subtypes: [
      { id: 'sofa', label: 'Outdoor sofa set', dims: { length: 8, width: 3, height: 3 } },
      { id: 'dining', label: 'Outdoor dining set', dims: { length: 6, width: 3, height: 2.5 } },
      { id: 'swing', label: 'Swing (jhula)', dims: { length: 5, width: 3, height: 7 } },
      { id: 'lounger', label: 'Sun lounger', dims: { length: 6.5, width: 2.5, height: 1.5 } },
      { id: 'bamboo-screen', label: 'Bamboo décor screen', dims: { length: 8, width: 0.5, height: 6 } },
    ],
  },
  {
    id: 'farmhouse',
    label: 'Farmhouse utilities',
    subtypes: [
      { id: 'shade-sail', label: 'Shade sail', dims: { length: 16, width: 12, height: 10 } },
      { id: 'tin-shed', label: 'Tin storage shed', dims: { length: 10, width: 8, height: 9 } },
      { id: 'tank-stand', label: 'Water tank stand', dims: { length: 5, width: 5, height: 8 } },
      { id: 'gateway', label: 'Pergola gateway', dims: { length: 10, width: 3, height: 9 } },
      { id: 'solar-patio', label: 'Solar patio lights', dims: { length: 12, width: 10, height: 8 } },
    ],
  },
];

export const materials = ['Teak wood', 'Pine (treated)', 'WPC composite', 'Marine plywood', 'Bamboo', 'Powder-coated steel'];
export const settings = ['Garden lawn', 'Stone patio', 'Rooftop terrace', 'Farmhouse plot', 'Poolside', 'Beside the house'];

export const dimensionFields = [
  { key: 'length', label: 'Length', required: true },
  { key: 'width', label: 'Width', required: true },
  { key: 'height', label: 'Height', required: true },
];

const fmt = (n) => `${Number(n)} ft`;

// Turns the chosen specs into a detailed prompt that asks for a labelled
// spec-sheet image: hero render with dimension arrows, front / side / height
// views and a spec box — the layout of the Weekend-Live pergola sheet.
export function buildSpecPrompt({ category, subtype, dims, material, setting, notes }) {
  const name = subtype.label;
  const { length, width, height } = dims;
  const sizeLine = `${length} ft (L) × ${width} ft (W) × ${height} ft (H)`;
  const specs = [
    `Length: ${fmt(length)}`,
    `Width: ${fmt(width)}`,
    `Height: ${fmt(height)}`,
    `Material: ${material}`,
  ].filter(Boolean);

  return [
    `Create a professional product specification sheet image for a ${name.toLowerCase()} (${category.label.toLowerCase()} category) by Weekend-Live, a builder of outdoor structures for Odisha's climate.`,
    '',
    `TOP (about two thirds of the image): a photorealistic render of the ${name.toLowerCase()} built from ${material.toLowerCase()}, set on a ${setting.toLowerCase()} on a bright sunny day with plants around it.`,
    `- Top-left: a dark navy title box with white text: "${name}" and below it "${sizeLine}".`,
    `- Top-right: a light semi-transparent box listing the specs as bullet points: ${specs.map((s) => `"${s}"`).join(', ')}.`,
    `- Draw thin black dimension arrows directly on the render with labels: "${fmt(length)} (Length)" along the long side, "${fmt(width)} (Width)" along the short side, and "${fmt(height)}" as a vertical arrow beside one post.`,
    '',
    `BOTTOM (white panel): three clean technical views of the same ${name.toLowerCase()} side by side, each with a dimension line and a caption underneath: "Front View (${fmt(length)} wide)", "Side View (${fmt(width)} wide)", "Height View (${fmt(height)} high)".`,
    'FOOTER: a dark navy band with white italic text "Shade • Style • Outdoor Living".',
    '',
    `All measurements must be exactly as written above, in feet, proportionally accurate, and all text must be spelled correctly and legible.`,
    notes ? `Extra details from the customer: ${notes}` : null,
  ].filter((l) => l !== null).join('\n');
}

export function specFilename({ subtype, dims }) {
  const { length, width, height } = dims;
  return `${subtype.id}-${length}x${width}x${height}ft.png`.replace(/\.(?=\d)/g, '_');
}

// Photo-edit mode: place the chosen structure into the visitor's own photo.
export function buildEditPrompt({ subtype, dims, material }) {
  const name = subtype.label.toLowerCase();
  const { length, width, height } = dims;
  return [
    `Edit this photo to add a ${name} built by Weekend-Live, made of ${material.toLowerCase()}, sized ${length} ft long × ${width} ft wide × ${height} ft high.`,
    'Keep everything already in the photo — walls, floor, buildings, trees, perspective, shadows and lighting — exactly as it is.',
    `Place the ${name} where it fits naturally, in correct real-world scale for those measurements, with realistic materials, shadows and a few plants around it.`,
    `Add thin white dimension lines on the ${name} labelled "${length} ft", "${width} ft" and "${height} ft", plus a small clean label "${subtype.label}". All text spelled correctly. Photorealistic.`,
  ].join(' ');
}
