// mapFunctions.js
// Contains map-related functions extracted from index.html

// Import config for API URLs
import config from './config.js';

async function handleSearch() {
    const query = document.getElementById('city-search').value;
    if (!query) return;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}, Philippines`);
    const data = await res.json();
    if (data.length > 0) selectCity(parseFloat(data[0].lat), parseFloat(data[0].lon));
    else showErrorMessage("Location not found in PH.");
}

function selectCity(lat, lng) {
    // Only allow Butuan City selection
    const butuanLat = 8.9475;
    const butuanLng = 125.5406;
    
    // Use a small tolerance for floating point comparison
    const tolerance = 0.0001;
    if (Math.abs(lat - butuanLat) > tolerance || Math.abs(lng - butuanLng) > tolerance) {
        showErrorMessage("Only Butuan City is supported at this time.");
        return;
    }
    
    // Cache the city selection
    localStorage.setItem('cityLat', lat.toString());
    localStorage.setItem('cityLng', lng.toString());
    
    hideModal();
    
    // Only fly to location if we're on the map page
    if (typeof window !== 'undefined' && window.map) {
        map.flyTo([lat, lng], 15, { duration: 1.5 });
    }
}

function useGPS() {
    hideModal();
    
    // Only use GPS if we're on the map page
    if (typeof window !== 'undefined' && window.map) {
        map.locate({setView: true, maxZoom: 15});
    }
}

function showModal() { 
    const modal = document.getElementById('city-modal');
    modal.style.setProperty('display', 'flex', 'important'); 
    modal.classList.remove('hidden');
}

function hideModal() { 
    const modal = document.getElementById('city-modal');
    modal.style.setProperty('display', 'none', 'important'); 
    modal.classList.add('hidden');
}

function vote(type) {
    if (!username) {
        showLoginRequiredModal();
        return;
    }
    
    const stationName = document.getElementById('station-name').innerText.toLowerCase().trim();
    
    // Get location - use currentStation if available, otherwise use map center if on map page
    let lat, lng;
    if (typeof window !== 'undefined' && window.currentStation) {
        lat = window.currentStation.lat;
        lng = window.currentStation.lng;
    } else if (typeof window !== 'undefined' && window.map) {
        lat = map.getCenter().lat;
        lng = map.getCenter().lng;
    } else {
        // For station-focused page, we need to get the coordinates from somewhere
        // This might need to be handled differently based on the context
        lat = 8.9475; // Default to Butuan
        lng = 125.5406;
    }
    
    fetch(`${config.API_BASE_URL}/api/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationName, type, username, lat, lng })
    }).then(response => {
        console.log('Response status:', response.status);
        if (response.ok) {
            console.log('Vote success');
            closePanel(); // Close the panel so user can re-click marker to see updated status
            fetchGasStations(); // Use cache to avoid 429 errors
            showSuccessModal("Vote recorded!");
        } else {
            console.log('Vote error status:', response.status);
            response.json().then(data => {
                console.log('Error data:', data);
                if (data.error === 'Already voted') {
                    showErrorMessage('You have already voted on this submission.');
                } else {
                    showErrorMessage(data.error || "Error recording vote.");
                }
            }).catch(() => {
                showNetworkErrorModal();
            });
        }
    }).catch(err => {
        console.log('Catch error:', err);
        showNetworkErrorModal();
    });
}

async function fetchGasStations(force = false) {
    // Only run map-related functionality if we're on the map page
    if (typeof window !== 'undefined' && window.map) {
        const loader = document.getElementById('map-loader');
        const currentZoom = map.getZoom();
        if (currentZoom < 10) {
            console.log('Zoom too low to fetch new stations');
            return; 
        }
        const b = map.getBounds();
        const cacheKey = `gasStations_${currentZoom}_${b.getSouth().toFixed(2)}_${b.getWest().toFixed(2)}`;
        const cached = localStorage.getItem(cacheKey);
        const now = Date.now();
        if (cached && !force) {
            const { data, timestamp } = JSON.parse(cached);
            if (now - timestamp < 3 * 86400000) { // 3 days
                await renderMarkers(data);
                return;
            }
        }
        loader.classList.remove('hidden');
        const query = `[out:json][timeout:25];\n(node[\"amenity\"=\"fuel\"](8.78833,125.37694,9.10833,125.69694);\n way[\"amenity\"=\"fuel\"](8.78833,125.37694,9.10833,125.69694););\nout center;`;
        try {
            const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(query)});
            const data = await res.json();
            localStorage.setItem(cacheKey, JSON.stringify({ data: data.elements, timestamp: now }));
            await renderMarkers(data.elements);
        } catch (err) {
            console.error('OSM fetch failed:', err);
        } finally {
            loader.classList.add('hidden');
        }
    } else {
        // For station-focused page, just fetch from our API
        try {
            const response = await fetch(`${config.API_BASE_URL}/api/gas-stations`);
            const stations = await response.json();
            return stations;
        } catch (error) {
            console.error('Error fetching gas stations:', error);
            return [];
        }
    }
}

// Global functions for station rankings
window.focusStationOnMap = function(stationName, lat, lng) {
    // Only fly to location if we're on the map page
    if (typeof window !== 'undefined' && window.map) {
        // Fly to the station location
        map.flyTo([lat, lng], 15, { duration: 1.5 });
        
        // Try to find and open the marker for this station
        markerGroup.eachLayer(function(layer) {
            if (layer.getLatLng().lat === lat && layer.getLatLng().lng === lng) {
                layer.openPopup();
            }
        });
    }
};

window.closeStationRankings = function() {
    const modal = document.getElementById('station-rankings-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.getDirections = function(lat, lng, stationName) {
    // Only create directions if we're on the map page
    if (typeof window !== 'undefined' && window.map) {
        // Create a Google Maps directions URL
        const currentLocation = map.getCenter();
        const googleMapsUrl = `https://www.google.com/maps/dir/${currentLocation.lat},${currentLocation.lng}/${lat},${lng}/data=!3m1!4b1!4m2!4m1!3e0`;
        
        // Open in new tab
        window.open(googleMapsUrl, '_blank');
    } else {
        // For station-focused page, just open the destination
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(googleMapsUrl, '_blank');
    }
};

export { handleSearch, selectCity, useGPS, showModal, hideModal, fetchGasStations };
