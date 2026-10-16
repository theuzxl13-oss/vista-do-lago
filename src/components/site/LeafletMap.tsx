import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'

const icon = L.divIcon({
  className: '',
  html: `<div style="width:44px;height:44px;border-radius:50% 50% 50% 0;background:#18392B;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(0,0,0,.3);border:2px solid #C6A76A"><div style="width:14px;height:14px;border-radius:50%;background:#C6A76A"></div></div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  popupAnchor: [0, -40],
})

export default function LeafletMap({ lat, lng, zoom, label }: { lat: number; lng: number; zoom: number; label: string }) {
  return (
    <MapContainer center={[lat, lng]} zoom={zoom} scrollWheelZoom={false} className="h-full w-full" attributionControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={icon}>
        <Popup>{label}</Popup>
      </Marker>
    </MapContainer>
  )
}
