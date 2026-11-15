/**
 * AI Design Studio category catalogue.
 *
 * The backend has no category endpoint: it stores `visualizationTypeId` as given (no foreign key)
 * and builds the AI prompt from `systemPrompt` (this category's promptTemplate) + `businessArea`,
 * which the Studio sends with the request. So the catalogue lives here.
 *
 * `visualizationTypeId`s are this site's own stable ids. The backend's VisualizationTypes table
 * (Infra/Sql/011_ai_visualization_workflow.sql) has rows for these codes with its own identity
 * ids; if the backend later validates the id or adds GET /design-categories, align them there.
 */
import { studio } from './flagship.js';

const prompt = (id) => studio.categories.find((c) => c.id === id)?.prompt || '';

export const STUDIO_CATEGORIES = [
  { visualizationTypeId: 104, code: 'senior', name: 'Senior Home', description: 'Grab rails, ramps, lighting and safe flooring.', icon: '🧓', businessArea: 'SeniorLiving', promptTemplate: prompt('senior') },
  { visualizationTypeId: 105, code: 'heritage', name: 'Heritage Restoration', description: 'Restore a piece to its original character.', icon: '🏛️', businessArea: 'Heritage', promptTemplate: prompt('heritage') },
  { visualizationTypeId: 106, code: 'product', name: 'DIY Product Concept', description: 'Turn a sketch or object into a product render.', icon: '💡', businessArea: 'DIY', promptTemplate: prompt('product') },
  { visualizationTypeId: 107, code: 'kids-diy', name: "Kid's DIY", description: 'Safe, educational projects for children aged 10–15 with adult supervision.', icon: '🧒', businessArea: 'DIY', fieldSet: 'kids', promptTemplate: 'a safe, educational DIY project for children aged 10–15, shown being built with adult supervision' },
  { visualizationTypeId: 108, code: 'family-diy', name: 'Family DIY', description: 'Collaborative DIY projects for groups of 2–10 family members.', icon: '👨‍👩‍👧', businessArea: 'DIY', fieldSet: 'family', promptTemplate: 'a collaborative family DIY project with clear, age-appropriate roles' },
  { visualizationTypeId: 101, code: 'pergola', name: 'Pergola', description: 'Teak or WPC pergola with climbers and lighting.', icon: '🏡', businessArea: 'OutdoorLiving', promptTemplate: prompt('pergola') },
  { visualizationTypeId: 102, code: 'gazebo', name: 'Gazebo', description: 'A shaded gazebo for a garden or farmhouse.', icon: '⛺', businessArea: 'OutdoorLiving', promptTemplate: prompt('gazebo') },
  { visualizationTypeId: 103, code: 'terrace', name: 'Terrace', description: 'Deck, planters, shade and seating for a rooftop.', icon: '🌇', businessArea: 'OutdoorLiving', promptTemplate: prompt('terrace') },
  { visualizationTypeId: 109, code: 'elevation', name: 'Building Elevation', description: 'See an under-construction house as a finished exterior — facade, finishes and landscaping.', icon: '🏢', businessArea: 'OutdoorLiving', promptTemplate: prompt('elevation') },
].map((c, i) => ({ ...c, displayOrder: i + 1 }));

export default STUDIO_CATEGORIES;
