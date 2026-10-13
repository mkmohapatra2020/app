import { useMemo, useState } from 'react';
import PageShell, { EmptyState, SkeletonGrid, SourceNote } from '../../components/common/PageShell.jsx';
import ItemCard from '../../components/booking/ItemCard.jsx';
import useResource from '../../hooks/useResource.js';
import useApi from '../../hooks/useApi.js';
import { workshopService } from '../../services/workshopService.js';
import { campaignService } from '../../services/campaignService.js';
import { locationService } from '../../services/locationService.js';
import { fallbackCampaigns, fallbackWorkshops } from '../../data/fallbacks.js';

// Workshops + DIY campaigns, with search and "near me".
export default function WorkshopsPage() {
  const [tab, setTab] = useState('workshops');
  const [q, setQ] = useState('');
  const workshops = useResource('workshops', (a) => workshopService.list(a), { fallback: fallbackWorkshops });
  const campaigns = useResource('campaigns', (a) => campaignService.list(a), { fallback: fallbackCampaigns });
  const nearby = useApi((a) => locationService.nearby(a));
  const [geoError, setGeoError] = useState('');

  const findNearby = () => {
    setGeoError('');
    if (!navigator.geolocation) { setGeoError('Location is not available on this device.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setTab('nearby'); nearby.execute({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => setGeoError('Allow location access to find workshops near you.'),
      { timeout: 10000, maximumAge: 600000 },
    );
  };

  const source = tab === 'campaigns' ? campaigns : tab === 'nearby' ? { data: nearby.data || [], loading: nearby.loading, fromApi: true } : workshops;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const items = (source.data || []).slice().sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
    return s ? items.filter((i) => `${i.title} ${i.text} ${i.location} ${i.category}`.toLowerCase().includes(s)) : items;
  }, [source.data, q]);
  const base = tab === 'campaigns' ? '/campaigns' : '/workshops';

  return (
    <PageShell title="Workshops & DIY campaigns" eyebrow="Learn by building" crumbs={[[null, 'Workshops']]}
      intro="Weekend sessions for families, kids and first-time builders across Bhubaneswar, Cuttack, Puri and Khordha.">
      <div className="toolbar">
        <div className="tabs" role="tablist">
          {[['workshops', 'Workshops'], ['campaigns', 'DIY campaigns'], ...(nearby.data ? [['nearby', 'Near me']] : [])].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={`tab${tab === id ? ' sel' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <input className="f-input search" type="search" placeholder="Search workshops…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search workshops" />
        <button type="button" className="btn btn-outline btn-small" onClick={findNearby} disabled={nearby.loading}>📍 {nearby.loading ? 'Finding…' : 'Near me'}</button>
      </div>
      {(geoError || nearby.error) && <p className="f-alert f-alert-error">{geoError || nearby.error}</p>}
      <SourceNote fromApi={source.fromApi} />
      {source.loading ? <SkeletonGrid /> : list.length ? (
        <div className="item-grid">{list.map((w) => <ItemCard key={`${tab}-${w.id}`} item={w} to={`${base}/${encodeURIComponent(w.id)}`} cta={tab === 'campaigns' ? 'View & register' : 'View & book'} />)}</div>
      ) : <EmptyState icon="🔨" title="No sessions found">{q ? 'Try a different search.' : 'New dates are announced every month — check back soon.'}</EmptyState>}
    </PageShell>
  );
}
