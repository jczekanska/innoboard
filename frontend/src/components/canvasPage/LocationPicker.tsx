import React, { useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';

interface LocationPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onLocationSelect: (location: { name: string; lat: number; lng: number }) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
    isOpen,
    onClose,
    onLocationSelect,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Array<{
        name: string;
        lat: number;
        lng: number;
        display_name: string;
    }>>([]);

    const searchLocation = async () => {
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        try {
            // Using Nominatim (OpenStreetMap) geocoding service
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
            );
            const data = await response.json();
            
            const results = data.map((item: any) => ({
                name: item.display_name.split(',')[0], // Get the first part as the name
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                display_name: item.display_name,
            }));
            
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching location:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleLocationSelect = (location: { name: string; lat: number; lng: number; display_name: string }) => {
        onLocationSelect({
            name: location.name,
            lat: location.lat,
            lng: location.lng,
        });
        onClose();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            searchLocation();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Select Location
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Input */}
                <div className="flex gap-2 mb-4">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Search for a location..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={searchLocation}
                        disabled={isSearching || !searchQuery.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Search className="w-4 h-4" />
                        {isSearching ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {/* Search Results */}
                <div className="flex-1 overflow-y-auto">
                    {searchResults.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Search Results:</h3>
                            {searchResults.map((result, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleLocationSelect(result)}
                                    className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="font-medium text-sm">{result.name}</div>
                                    <div className="text-xs text-gray-500 mt-1">{result.display_name}</div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {searchResults.length === 0 && searchQuery && !isSearching && (
                        <div className="text-center text-gray-500 py-8">
                            No locations found. Try a different search term.
                        </div>
                    )}

                    {!searchQuery && (
                        <div className="text-center text-gray-500 py-8">
                            Enter a location name to search
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
