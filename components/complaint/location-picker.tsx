"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    useMapEvents,
    useMap,
} from "react-leaflet";
import L from "leaflet";
import { MapPin, Navigation, X, Check, Loader2, Search } from "lucide-react";

import "leaflet/dist/leaflet.css";

// leaflet components
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationPickerProps {
    onLocationSelect: (lat: number, lng: number) => void;
    onClose: () => void;
    initialLocation?: { lat: number; lng: number } | null;
}

// Default center: Bangalore
const DEFAULT_CENTER: L.LatLngExpression = [12.9716, 77.5946];
const DEFAULT_ZOOM = 13;

function ClickHandler({
    onClick,
}: {
    onClick: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click(e) {
            onClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function FlyToLocation({ position }: { position: L.LatLngExpression | null }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.setView(position, 16, { animate: false });
        }
    }, [map, position]);
    return null;
}

export function LocationPicker({
    onLocationSelect,
    onClose,
    initialLocation,
}: LocationPickerProps) {
    const [markerPos, setMarkerPos] = useState<[number, number] | null>(
        initialLocation ? [initialLocation.lat, initialLocation.lng] : null
    );
    const [flyTarget, setFlyTarget] = useState<L.LatLngExpression | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<
        Array<{ display_name: string; lat: string; lon: string }>
    >([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Reverse geocode via Nominatim
    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        setIsGeocoding(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
                { headers: { "Accept-Language": "en" } },
            );
            if (res.ok) {
                const data = await res.json();
                setAddress(data.display_name || null);
            }
        } catch {
            setAddress(null);
        } finally {
            setIsGeocoding(false);
        }
    }, []);

    useEffect(() => {
        if (initialLocation) {
            reverseGeocode(initialLocation.lat, initialLocation.lng);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleMapClick = useCallback(
        (lat: number, lng: number) => {
            setMarkerPos([lat, lng]);
            setLocationError(null);
            reverseGeocode(lat, lng);
        },
        [reverseGeocode],
    );

    const handleUseMyLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser.");
            return;
        }

        setIsLocating(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setMarkerPos([latitude, longitude]);
                setFlyTarget([latitude, longitude]);
                reverseGeocode(latitude, longitude);
                setIsLocating(false);
            },
            (err) => {
                setIsLocating(false);
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setLocationError(
                            "Location permission denied. Please enable it in your browser settings.",
                        );
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setLocationError("Location information unavailable.");
                        break;
                    case err.TIMEOUT:
                        setLocationError("Location request timed out.");
                        break;
                    default:
                        setLocationError("An unknown error occurred.");
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
    }, [reverseGeocode]);

    const handleConfirm = () => {
        if (markerPos) {
            onLocationSelect(markerPos[0], markerPos[1]);
        }
    };

    const handleClear = () => {
        setMarkerPos(null);
        setAddress(null);
        setFlyTarget(null);
    };

    // Debounced search via Nominatim
    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (value.trim().length < 3) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&countrycodes=in`,
                    { headers: { "Accept-Language": "en" } },
                );
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data);
                    setShowResults(data.length > 0);
                }
            } catch {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 400);
    }, []);

    const handleSearchSelect = useCallback(
        (result: { display_name: string; lat: string; lon: string }) => {
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            setMarkerPos([lat, lng]);
            setFlyTarget([lat, lng]);
            setAddress(result.display_name);
            setSearchQuery(result.display_name.split(",")[0]);
            setShowResults(false);
            setLocationError(null);
        },
        [],
    );

    // Close search dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                searchContainerRef.current &&
                !searchContainerRef.current.contains(e.target as Node)
            ) {
                setShowResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, []);

    return (
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xl relative flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                        Pin Complaint Location
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-md hover:bg-secondary transition-colors"
                    aria-label="Close map"
                >
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            {/* "Use My Location" - primary action, above the map */}
            <div className="px-4 py-3 border-b border-border bg-primary/5">
                <button
                    onClick={handleUseMyLocation}
                    disabled={isLocating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                    {isLocating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Navigation className="w-4 h-4" />
                    )}
                    {isLocating
                        ? "Detecting location..."
                        : "Use My Current Location"}
                </button>
                {locationError && (
                    <p className="text-xs text-destructive mt-2 text-center">
                        {locationError}
                    </p>
                )}
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    Or search for a place or tap on the map below
                </p>
            </div>

            {/* Search bar */}
            <div
                className="px-4 py-2.5 border-b border-border"
                ref={searchContainerRef}
            >
                <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-background focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search for a place or address..."
                            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        {isSearching && (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                        {searchQuery && !isSearching && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setSearchResults([]);
                                    setShowResults(false);
                                }}
                                className="p-0.5 hover:text-foreground text-muted-foreground transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Search results dropdown */}
                    {showResults && searchResults.length > 0 && (
                        <div className="absolute z-[2000] top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
                            {searchResults.map((result, idx) => (
                                <button
                                    key={`${result.lat}-${result.lon}-${idx}`}
                                    onClick={() => handleSearchSelect(result)}
                                    className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors border-b border-border last:border-b-0 flex items-start gap-2"
                                >
                                    <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-2 leading-snug">
                                        {result.display_name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Map */}
            <div className="h-[320px] sm:h-[400px] relative z-0">
                <MapContainer
                    center={initialLocation ? [initialLocation.lat, initialLocation.lng] : DEFAULT_CENTER}
                    zoom={initialLocation ? 16 : DEFAULT_ZOOM}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%" }}
                    attributionControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ClickHandler onClick={handleMapClick} />
                    <FlyToLocation position={flyTarget} />
                    {markerPos && <Marker position={markerPos} />}
                </MapContainer>
            </div>

            {/* Address + actions */}
            {markerPos && (
                <div className="absolute bottom-0 inset-x-0 z-[1000] px-4 py-3 sm:py-4 border-t border-border/50 space-y-3 bg-background/85 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.2)]">
                    {isGeocoding ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-muted-foreground/60" />
                            <span className="text-xs text-muted-foreground/70">Fetching address...</span>
                        </div>
                    ) : address ? (
                        <p className="flex items-start gap-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                            {address}
                        </p>
                    ) : null}
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="font-medium bg-secondary/50 px-2 py-0.5 rounded-md">
                            {markerPos[0].toFixed(5)}, {markerPos[1].toFixed(5)}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={handleClear}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 border border-border/60 rounded-lg hover:bg-secondary/80 transition-all duration-200 text-foreground shadow-sm active:scale-[0.98]"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span className="font-medium">Clear</span>
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span className="font-medium">Confirm</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
