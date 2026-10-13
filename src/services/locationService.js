/** Locations — community places, nearby workshops. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toCampaign, toLocation, unwrapList } from './adapters.js';

const E = BACKEND_ENDPOINTS.LOCATIONS;

class LocationService {
  list({ signal } = {}) { return api.get(E.LIST, { signal }).then((r) => mapRes(r, (d) => unwrapList(d, 'locations').map(toLocation).filter((l) => l.name))); }
  nearby({ lat, lng, radiusKm = 50, signal }) {
    return api.get(E.NEARBY, { query: { lat, lng, latitude: lat, longitude: lng, radius: radiusKm }, signal })
      .then((r) => mapRes(r, (d) => unwrapList(d, 'workshops', 'locations').map((x) => ({ ...toCampaign(x), distanceKm: toLocation(x).distanceKm, place: toLocation(x).name }))));
  }
}
export const locationService = new LocationService();
export default locationService;
