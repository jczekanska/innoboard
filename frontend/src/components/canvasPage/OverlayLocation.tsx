import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OverlayLocationProps {
    label: string;
    lat: number;
    lng: number;
    width: number;
    height: number;
}

export const OverlayLocation = ({ label, lat, lng, width, height }: OverlayLocationProps) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Create the map
        const map = L.map(mapRef.current, {
            center: [lat, lng],
            zoom: 13,
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            touchZoom: false,
            doubleClickZoom: false,
            scrollWheelZoom: false,
            boxZoom: false,
            keyboard: false,
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add marker
        L.marker([lat, lng])
            .addTo(map)
            .bindPopup(label);

        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [lat, lng, label]);

    // Update map view when coordinates change
    useEffect(() => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], 13);
            mapInstanceRef.current.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    mapInstanceRef.current?.removeLayer(layer);
                }
            });
            L.marker([lat, lng])
                .addTo(mapInstanceRef.current)
                .bindPopup(label);
        }
    }, [lat, lng, label]);

    return (
        <div
            className="relative rounded-2xl overflow-hidden shadow-lg border-2 border-white"
            style={{ width, height }}
        >
            {/* Map container */}
            <div
                ref={mapRef}
                className="w-full h-full"
                style={{ minHeight: '100px' }}
            />

            {/* Label overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                <div className="text-xs font-medium truncate">
                    {label}
                </div>
                <div className="text-xs opacity-75">
                    {lat.toFixed(4)}, {lng.toFixed(4)}
                </div>
            </div>
        </div>
    );
};