import { useEffect, useState } from 'react';
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

  const allPoints = [...points, ...(destPoint ? [{ lat: destPoint.lat, lon: destPoint.lon }] : [])];

  if (loading) {
    return (
      <div className="h-72 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 text-sm">
        Locating shipment on map…
      </div>
    );
  }

  if (allPoints.length === 0) {
    return (
      <div className="h-48 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 text-sm">
        Map will appear once a location-tagged update is posted.
      </div>
    );
  }

  // Center: latest checkpoint, or destination
  const center = points[0] ?? destPoint ?? allPoints[0];
  const polyLine = points.map((p) => [p.lat, p.lon] as [number, number]).reverse();
  if (destPoint) polyLine.push([destPoint.lat, destPoint.lon]);

  return (
    <div className="h-72 rounded-lg overflow-hidden border border-white/10">
      <MapContainer
        center={[center.lat, center.lon] as [number, number]}
        zoom={5}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
  );
};

export default TrackingMap;
