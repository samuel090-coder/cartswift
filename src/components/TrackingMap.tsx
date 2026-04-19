import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon under Vite bundlers
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// CartSwift HQ in Miami, Florida
const ORIGIN = { lat: 25.7617, lon: -80.1918, label: 'CartSwift HQ — Miami, FL' };

interface TrackingUpdate {
  id: string;
  status: string;
  location: string | null;
  description: string | null;
  created_at: string;
}

interface Props {
  updates: TrackingUpdate[];
  destination?: string | null;
}

interface GeoPoint extends TrackingUpdate {
  lat: number;
  lon: number;
}

// Free Nominatim geocoding (OpenStreetMap). No API key.
const geocode = async (place: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    const cacheKey = `geo:${place.toLowerCase()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`,
      { headers: { Accept: 'application/json' } },
    );
    const j = await r.json();
    if (Array.isArray(j) && j[0]) {
      const out = { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon) };
      sessionStorage.setItem(cacheKey, JSON.stringify(out));
      return out;
    }
  } catch {
    /* ignore */
  }
  return null;
};

// Haversine distance in km
const distanceKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
};

// Estimate days from km — coarse: 0-1500 km = 2-4d, 1500-5000 = 5-8d, 5000-10000 = 10-15d, +10000 = 14-21d.
const etaDays = (km: number): { min: number; max: number } => {
  if (km < 1500) return { min: 2, max: 4 };
  if (km < 5000) return { min: 5, max: 8 };
  if (km < 10000) return { min: 10, max: 15 };
  return { min: 14, max: 21 };
};

const TrackingMap = ({ updates, destination }: Props) => {
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [destPoint, setDestPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const located: GeoPoint[] = [];
      for (const u of updates) {
        if (!u.location) continue;
        const g = await geocode(u.location);
        if (g) located.push({ ...u, ...g });
      }
      let dest: { lat: number; lon: number } | null = null;
      if (destination) dest = await geocode(destination);
      if (!cancelled) {
        setPoints(located);
        setDestPoint(dest);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [updates, destination]);

  const stats = useMemo(() => {
    if (!destPoint) return null;
    const km = distanceKm(ORIGIN, destPoint);
    const eta = etaDays(km);
    return { km, eta };
  }, [destPoint]);

  if (loading) {
    return (
      <div className="h-72 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 text-sm">
        Locating shipment on map…
      </div>
    );
  }

  // Always anchor to Miami origin even if no updates yet
  const allPoints = [ORIGIN, ...points, ...(destPoint ? [destPoint] : [])];
  const center = points[0] ?? destPoint ?? ORIGIN;

  // Polyline: Miami → checkpoints → destination
  const polyLine: [number, number][] = [[ORIGIN.lat, ORIGIN.lon]];
  [...points].reverse().forEach((p) => polyLine.push([p.lat, p.lon]));
  if (destPoint) polyLine.push([destPoint.lat, destPoint.lon]);

  return (
    <div className="space-y-3">
      {stats && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/5 border border-white/10 rounded-lg py-2">
            <p className="text-white/60 text-[10px] uppercase">Distance</p>
            <p className="text-white font-semibold text-sm">{stats.km.toLocaleString()} km</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg py-2">
            <p className="text-white/60 text-[10px] uppercase">ETA</p>
            <p className="text-white font-semibold text-sm">{stats.eta.min}–{stats.eta.max} days</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg py-2">
            <p className="text-white/60 text-[10px] uppercase">Origin</p>
            <p className="text-white font-semibold text-sm">Miami, FL</p>
          </div>
        </div>
      )}
      <div className="h-72 rounded-lg overflow-hidden border border-white/10">
        <MapContainer
          center={[center.lat, center.lon] as [number, number]}
          zoom={3}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Origin marker — always shown */}
          <Marker position={[ORIGIN.lat, ORIGIN.lon]}>
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{ORIGIN.label}</p>
                <p className="text-muted-foreground">Origin warehouse</p>
              </div>
            </Popup>
          </Marker>
          {points.map((p, idx) => (
            <Marker key={p.id} position={[p.lat, p.lon]}>
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold capitalize">{p.status.replace(/_/g, ' ')}</p>
                  {p.description && <p>{p.description}</p>}
                  <p className="text-muted-foreground">{p.location}</p>
                  <p className="text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
                  {idx === 0 && <p className="font-semibold text-primary mt-1">Latest</p>}
                </div>
              </Popup>
            </Marker>
          ))}
          {destPoint && (
            <Marker position={[destPoint.lat, destPoint.lon]}>
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">Destination</p>
                  <p>{destination}</p>
                </div>
              </Popup>
            </Marker>
          )}
          {polyLine.length > 1 && (
            <Polyline positions={polyLine} pathOptions={{ color: '#ec4899', weight: 3, dashArray: '6 6' }} />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default TrackingMap;
