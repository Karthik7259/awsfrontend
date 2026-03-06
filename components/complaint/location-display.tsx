'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapPin } from 'lucide-react'

import 'leaflet/dist/leaflet.css'

// leafelt components
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface LocationDisplayProps {
  lat: number
  lng: number
  address?: string | null
}

function FitBounds({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], 15, { animate: true })
  }, [map, lat, lng])
  return null
}

export function LocationDisplay({ lat, lng, address }: LocationDisplayProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/30">
        <MapPin className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          Complaint Location
        </span>
      </div>

      {/* Map */}
      <div className="h-[240px] sm:h-[280px] relative">
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          scrollWheelZoom={false}
          dragging={true}
          zoomControl={true}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds lat={lat} lng={lng} />
          <Marker position={[lat, lng]} />
        </MapContainer>
      </div>

      {/* Coordinates + Address */}
      <div className="px-4 py-3 border-t border-border space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>
        {address && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            <MapPin className="w-3 h-3 shrink-0" />
            {address}
          </p>
        )}
      </div>
    </div>
  )
}
