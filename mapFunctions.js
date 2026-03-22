import config from './config.js';
import { isInButuan, calculateDistance } from './utilFunctions.js';
import { renderMarkers } from './markerFunctions.js';

async function handleSearch() {
    const query = document.getElementById('city-search').value;
    if (!query) return;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}, Philippines`);
    const data = await res.json();
    if (data.length > 0) selectCity(parseFloat(data[0].lat), parseFloat(data[0].lon));
    else showErrorMessage("Location not found in PH.");
}

function selectCity(lat, lng) {
    const butuanLat = 8.9475;
    const butuanLng = 125.5406;
    
    const tolerance = 0.0001;
    if (Math.abs(lat - butuanLat) > tolerance || Math.abs(lng - butuanLng) > tolerance) {
        showErrorMessage("Only Butuan City is supported at this time.");
        return;
    }
    
    localStorage.setItem('cityLat', lat.toString());
    localStorage.setItem('cityLng', lng.toString());
    
    hideModal();
    
    if (typeof window !== 'undefined' && window.map) {
        map.flyTo([lat, lng], 15, { duration: 1.5 });
    }
}

// Global variables for current location tracking
window.currentLocationMarker = null;
window.currentAccuracyCircle = null;
window.followMode = false;

function createOrUpdateCurrentLocationMarker(latlng, accuracy) {
    if (typeof window === 'undefined' || !window.map) return;
    
    // Remove existing marker and accuracy circle
    if (window.currentLocationMarker) {
        window.map.removeLayer(window.currentLocationMarker);
    }
    if (window.currentAccuracyCircle) {
        window.map.removeLayer(window.currentAccuracyCircle);
    }
    
    // Create custom marker element
    const markerDiv = document.createElement('div');
    markerDiv.className = 'current-location-marker';
    markerDiv.innerHTML = '<div class="current-location-label">You Are Here</div>';
    
    // Create marker
    const marker = L.marker(latlng, {
        icon: L.divIcon({
            html: markerDiv.outerHTML,
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        }),
        zIndexOffset: 1000
    });
    
    // Add marker to map
    marker.addTo(window.map);
    window.currentLocationMarker = marker;
    
    // Create accuracy circle if accuracy is available
    if (accuracy && accuracy > 0) {
        const circle = L.circle(latlng, {
            radius: accuracy,
            color: 'rgba(59, 130, 246, 0.5)',
            fillColor: 'rgba(59, 130, 246, 0.1)',
            fillOpacity: 0.5,
            weight: 2
        }).addTo(window.map);
        
        window.currentAccuracyCircle = circle;
    }
    
    // Update follow mode button state
    updateFollowModeButton();
}

function toggleFollowMode() {
    window.followMode = !window.followMode;
    updateFollowModeButton();
    
    const statusText = document.getElementById('location-status-text');
    if (statusText) {
        statusText.innerText = window.followMode ? 'Follow mode: ON' : 'Follow mode: OFF';
    }
    
    // If follow mode is enabled and we have a current location, center on it
    if (window.followMode && window.currentLocationMarker) {
        const latlng = window.currentLocationMarker.getLatLng();
        map.setView(latlng, map.getZoom());
    }
}

function updateFollowModeButton() {
    const followBtn = document.getElementById('follow-btn');
    if (followBtn) {
        if (window.followMode) {
            followBtn.classList.add('active');
            followBtn.querySelector('span').innerText = 'Following';
        } else {
            followBtn.classList.remove('active');
            followBtn.querySelector('span').innerText = 'Follow';
        }
    }
}

// Handle map move events for follow mode
function setupMapMoveHandler() {
    if (typeof window !== 'undefined' && window.map) {
        map.on('move', function() {
            if (window.followMode && window.currentLocationMarker) {
                // If user manually moves the map, temporarily disable follow mode
                // but keep the button active so they can re-enable it
                const latlng = window.currentLocationMarker.getLatLng();
                map.setView(latlng, map.getZoom());
            }
        });
    }
}

// Initialize location functionality
function initLocationTracking() {
    setupMapMoveHandler();
    
    // Set up event listeners for location updates
    if (typeof window !== 'undefined' && window.map) {
        map.on('locationfound', function(e) {
            createOrUpdateCurrentLocationMarker(e.latlng, e.accuracy);
        });
        
        map.on('locationerror', function(e) {
            console.error('Location error:', e);
        });
    }
    
    // Initialize page visibility handler to refresh distances
    setupPageVisibilityHandler();
    
    // Initialize global variables
    window.currentLocationMarker = null;
    window.currentAccuracyCircle = null;
    window.followMode = false;
    window.locationWatchId = null;
}

// Enhanced GPS accuracy visualization
function updateAccuracyVisualization(latlng, accuracy) {
    if (!window.currentAccuracyCircle || !latlng || !accuracy) return;
    
    // Update the accuracy circle position and radius
    window.currentAccuracyCircle.setLatLng(latlng);
    window.currentAccuracyCircle.setRadius(accuracy);
    
    // Visual feedback based on accuracy
    const accuracyLevel = getAccuracyLevel(accuracy);
    const circle = window.currentAccuracyCircle;
    
    switch (accuracyLevel) {
        case 'excellent':
            circle.setStyle({
                color: 'rgba(34, 197, 94, 0.8)',      // Green
                fillColor: 'rgba(34, 197, 94, 0.2)',  // Light green
                weight: 2
            });
            break;
        case 'good':
            circle.setStyle({
                color: 'rgba(59, 130, 246, 0.8)',      // Blue
                fillColor: 'rgba(59, 130, 246, 0.2)',  // Light blue
                weight: 2
            });
            break;
        case 'fair':
            circle.setStyle({
                color: 'rgba(245, 158, 11, 0.8)',      // Orange
                fillColor: 'rgba(245, 158, 11, 0.2)',  // Light orange
                weight: 2
            });
            break;
        case 'poor':
            circle.setStyle({
                color: 'rgba(239, 68, 68, 0.8)',       // Red
                fillColor: 'rgba(239, 68, 68, 0.2)',   // Light red
                weight: 2
            });
            break;
    }
    
    // Update status text with accuracy info
    const statusText = document.getElementById('location-status-text');
    if (statusText) {
        statusText.innerText = `Location found (${accuracyLevel} accuracy: ${Math.round(accuracy)}m)`;
    }
}

function getAccuracyLevel(accuracy) {
    if (accuracy <= 10) return 'excellent';
    if (accuracy <= 30) return 'good';
    if (accuracy <= 50) return 'fair';
    return 'poor';
}

// Stop continuous tracking
function stopContinuousTracking() {
    if (window.locationWatchId) {
        navigator.geolocation.clearWatch(window.locationWatchId);
        window.locationWatchId = null;
    }
}

// Enhanced useGPS function with continuous tracking
function useGPS() {
    hideModal();
    
    if (typeof window !== 'undefined' && window.map) {
        // Update button state and status
        const locateBtn = document.getElementById('locate-btn');
        const statusText = document.getElementById('location-status-text');
        const statusDiv = document.getElementById('location-status');
        
        if (locateBtn) {
            locateBtn.disabled = true;
            locateBtn.classList.add('active');
        }
        
        if (statusText) statusText.innerText = 'Locating...';
        if (statusDiv) statusDiv.classList.add('show');
        
        // Stop any existing tracking
        stopContinuousTracking();
        
        // Start location tracking
        map.locate({
            setView: true, 
            maxZoom: 15,
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
        
        // Handle location found
        map.on('locationfound', function(e) {
            if (locateBtn) {
                locateBtn.disabled = false;
                locateBtn.classList.add('active');
            }
            if (statusText) statusText.innerText = 'Location found';
            
            // Store user location globally
            window.userLocation = {
                lat: e.latlng.lat,
                lng: e.latlng.lng,
                accuracy: e.accuracy
            };
            
            // Create or update current location marker
            createOrUpdateCurrentLocationMarker(e.latlng, e.accuracy);
            
            // Start continuous tracking for better accuracy
            startContinuousTracking();
            
            // Calculate distances to all stations
            calculateAllStationDistances();
            
            // If follow mode is enabled, center on location
            if (window.followMode) {
                map.setView(e.latlng, map.getZoom());
            }
        });
        
        // Handle location error
        map.on('locationerror', function(e) {
            if (locateBtn) {
                locateBtn.disabled = false;
                locateBtn.classList.remove('active');
            }
            if (statusText) {
                if (e.code === 1) {
                    statusText.innerText = 'Location denied';
                } else if (e.code === 2) {
                    statusText.innerText = 'Location unavailable';
                } else if (e.code === 3) {
                    statusText.innerText = 'Location timeout';
                } else {
                    statusText.innerText = 'Location error';
                }
            }
            
            console.error('Location error:', e);
        });
    }
}

// Function to get user's current location
function getCurrentUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                
                // Store globally
                window.userLocation = userLocation;
                
                // Create or update current location marker
                createOrUpdateCurrentLocationMarker([userLocation.lat, userLocation.lng], userLocation.accuracy);
                
                resolve(userLocation);
            },
            (error) => {
                console.error('Error getting user location:', error);
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

// Function to calculate distances from user location to all stations
function calculateAllStationDistances() {
    if (!window.userLocation || !window.markerGroup) {
        return;
    }
    
    // Update all markers with distance information
    window.markerGroup.eachLayer(function(marker) {
        const stationLatLng = marker.getLatLng();
        const distance = calculateDistance(
            window.userLocation.lat,
            window.userLocation.lng,
            stationLatLng.lat,
            stationLatLng.lng
        );
        
        // Store distance on the marker for later use
        marker.distance = parseFloat(distance);
        
        // Update marker popup with distance if it's open
        if (marker.isPopupOpen()) {
            updatePopupWithDistance(marker, distance);
        }
    });
    
    // Update info panel if a station is currently selected
    if (window.currentStation && window.currentStation.lat && window.currentStation.lng) {
        const distance = calculateDistance(
            window.userLocation.lat,
            window.userLocation.lng,
            window.currentStation.lat,
            window.currentStation.lng
        );
        
        updateInfoPanelDistance(distance);
    }
}

// Function to update popup with distance information
function updatePopupWithDistance(marker, distance) {
    const popup = marker.getPopup();
    if (popup) {
        let content = popup.getContent();
        
        // Remove existing distance info if present
        content = content.replace(/<div class="distance-info">[\s\S]*?<\/div>/, '');
        
        // Add distance info
        const distanceHtml = `<div class="distance-info mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
            <div class="text-xs font-bold text-blue-500 uppercase tracking-widest">Distance</div>
            <div class="text-lg font-black text-gray-900">${distance} km</div>
        </div>`;
        
        // Insert distance info before the buttons
        content = content.replace(
            /(<div class="flex gap-2 mt-4">)/,
            distanceHtml + '$1'
        );
        
        popup.setContent(content);
    }
}

// Function to update info panel distance display
function updateInfoPanelDistance(distance) {
    const distanceValue = document.getElementById('distance-value');
    const distanceIndicator = document.getElementById('distance-indicator');
    
    if (distanceValue) {
        distanceValue.innerText = `${distance} km`;
    }
    
    if (distanceIndicator) {
        distanceIndicator.style.display = 'block';
    }
}

// Enhanced continuous tracking to update distances in real-time
function startContinuousTracking() {
    if (typeof window === 'undefined' || !window.map) return;
    
    // Start continuous tracking with high accuracy
    const watchId = navigator.geolocation.watchPosition(
        function(position) {
            const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
            const accuracy = position.coords.accuracy;
            
            // Update user location globally
            window.userLocation = {
                lat: latlng.lat,
                lng: latlng.lng,
                accuracy: accuracy
            };
            
            // Update marker position
            if (window.currentLocationMarker) {
                window.currentLocationMarker.setLatLng(latlng);
            }
            
            // Update accuracy visualization
            updateAccuracyVisualization(latlng, accuracy);
            
            // Recalculate distances to all stations
            calculateAllStationDistances();
            
            // If follow mode is enabled, center map
            if (window.followMode) {
                map.panTo(latlng);
            }
        },
        function(error) {
            console.error('Continuous tracking error:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
    
    // Store watch ID for cleanup
    window.locationWatchId = watchId;
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
    
    let lat, lng;
    if (typeof window !== 'undefined' && window.currentStation) {
        lat = window.currentStation.lat;
        lng = window.currentStation.lng;
    } else if (typeof window !== 'undefined' && window.map) {
        lat = map.getCenter().lat;
        lng = map.getCenter().lng;
    } else {
        lat = 8.9475;
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
            closePanel();
            fetchGasStations();
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
            if (now - timestamp < 3 * 86400000) {
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
            return data.elements;
        } catch (err) {
            console.error('OSM fetch failed:', err);
            return [];
        } finally {
            loader.classList.add('hidden');
        }
    } else {
        try {
            const query = `[out:json][timeout:25];\n(node[\"amenity\"=\"fuel\"](8.78833,125.37694,9.10833,125.69694);\n way[\"amenity\"=\"fuel\"](8.78833,125.37694,9.10833,125.69694););\nout center;`;
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('OSM API timeout')), 10000);
            });
            
            let osmData;
            try {
                const res = await Promise.race([
                    fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(query)}),
                    timeoutPromise
                ]);
                
                // Check if response is OK and has proper content type
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                
                // Check if response is JSON (not XML error response)
                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Received non-JSON response from OSM API');
                }
                
                osmData = await res.json();
            } catch (error) {
                console.warn('OSM API failed, using cached data or mock stations:', error);
                const cachedStations = localStorage.getItem('index_stations_cache');
                if (cachedStations) {
                    try {
                        const cached = JSON.parse(cachedStations);
                        const cacheAge = Date.now() - cached.timestamp;
                        if (cacheAge < 3600000) {
                            console.log('Using cached station data');
                            return cached.stations;
                        }
                    } catch (e) {
                        console.warn('Invalid cached data:', e);
                    }
                }
                console.log('Using mock stations due to OSM API issues');
                return [
                    { stationName: 'Petron Butuan', brand: 'Petron', lat: 8.9475, lng: 125.5406, prices: { diesel: null, u91: null, u95: null } },
                    { stationName: 'Shell Butuan', brand: 'Shell', lat: 8.9500, lng: 125.5350, prices: { diesel: null, u91: null, u95: null } },
                    { stationName: 'Caltex Butuan', brand: 'Caltex', lat: 8.9450, lng: 125.5450, prices: { diesel: null, u91: null, u95: null } }
                ];
            }
            
            let submittedPrices = [];
            try {
                const priceRes = await fetch(`${config.API_BASE_URL}/api/prices?approved=true`);
                submittedPrices = await priceRes.json();
            } catch (err) {
                console.error('Failed to fetch submitted prices:', err);
            }
            
            const stations = [];
            
            osmData.elements.forEach(s => {
                const lat = s.lat || s.center?.lat;
                const lon = s.lon || s.center?.lon;
                if (!lat || !lon) return;
                if (!isInButuan(lat, lon)) return;
                
                const name = s.tags.name || "Gas Station";
                const brand = s.tags.brand || s.tags.operator || "Independent";
                const address = [
                    s.tags['addr:street'] || '',
                    s.tags['addr:city'] || '',
                    s.tags['addr:postcode'] || ''
                ].filter(Boolean).join(', ');
                
                let closestSubmission = null;
                let minDistance = Infinity;
                submittedPrices.forEach(sub => {
                    if (isInButuan(sub.lat, sub.lng) && sub.stationName.toLowerCase().trim() === name.toLowerCase().trim()) {
                        const distance = Math.sqrt((sub.lat - lat) ** 2 + (sub.lng - lon) ** 2) * 111;
                        if (distance < 1 && distance < minDistance) {
                            minDistance = distance;
                            closestSubmission = sub;
                        }
                    }
                });
                
                const stationSubmissions = submittedPrices
                    .filter(sub =>
                        isInButuan(sub.lat, sub.lng) &&
                        sub.stationName.toLowerCase().trim() === name.toLowerCase().trim() &&
                        Math.sqrt((sub.lat - lat) ** 2 + (sub.lng - lon) ** 2) * 111 < 1 &&
                        sub.approved === true
                    )
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                const latestSubmission = stationSubmissions
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
                
                const prices = latestSubmission ? latestSubmission.prices : {
                    diesel: null,
                    u91: null,
                    u95: null
                };
                
                stations.push({
                    stationName: name,
                    brand: brand,
                    lat: lat,
                    lng: lon,
                    address: address,
                    prices: prices,
                    submitted: latestSubmission,
                    username: latestSubmission ? latestSubmission.username : null
                });
            });
            
            localStorage.setItem('index_stations_cache', JSON.stringify({
                stations: stations,
                timestamp: Date.now()
            }));
            
            if (stations.length === 0) {
                console.log('No stations found in Butuan, using mock data');
                const mockStations = [
                    { stationName: 'Petron Butuan', brand: 'Petron', lat: 8.9475, lng: 125.5406, prices: { diesel: null, u91: null, u95: null } },
                    { stationName: 'Shell Butuan', brand: 'Shell', lat: 8.9500, lng: 125.5350, prices: { diesel: null, u91: null, u95: null } },
                    { stationName: 'Caltex Butuan', brand: 'Caltex', lat: 8.9450, lng: 125.5450, prices: { diesel: null, u91: null, u95: null } }
                ];
                return mockStations;
            }
            
            return stations;
        } catch (error) {
            console.error('Error fetching gas stations:', error);
            const cachedStations = localStorage.getItem('index_stations_cache');
            if (cachedStations) {
                try {
                    const cached = JSON.parse(cachedStations);
                    console.log('Using cached station data as final fallback');
                    return cached.stations;
                } catch (e) {
                    console.warn('Invalid cached data:', e);
                }
            }
            return [
                { stationName: 'Petron Butuan', brand: 'Petron', lat: 8.9475, lng: 125.5406, prices: { diesel: null, u91: null, u95: null } },
                { stationName: 'Shell Butuan', brand: 'Shell', lat: 8.9500, lng: 125.5350, prices: { diesel: null, u91: null, u95: null } },
                { stationName: 'Caltex Butuan', brand: 'Caltex', lat: 8.9450, lng: 125.5450, prices: { diesel: null, u91: null, u95: null } }
            ];
        }
    }
}

window.focusStationOnMap = function(stationName, lat, lng) {
    if (typeof window !== 'undefined' && window.map) {
        map.flyTo([lat, lng], 15, { duration: 1.5 });
        
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
    if (typeof window !== 'undefined' && window.map) {
        const currentLocation = map.getCenter();
        const googleMapsUrl = `https://www.google.com/maps/dir/${currentLocation.lat},${currentLocation.lng}/${lat},${lng}/data=!3m1!4b1!4m2!4m1!3e0`;
        
        window.open(googleMapsUrl, '_blank');
    } else {
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(googleMapsUrl, '_blank');
    }
};

// Function to automatically get user location on page load
function autoGetUserLocation() {
    if (!navigator.geolocation) {
        console.log('Geolocation is not supported by this browser');
        return;
    }
    
    // Try to get user location automatically when page loads
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            
            // Store globally
            window.userLocation = userLocation;
            
            // Create current location marker
            createOrUpdateCurrentLocationMarker([userLocation.lat, userLocation.lng], userLocation.accuracy);
            
            // Calculate distances to all stations
            calculateAllStationDistances();
            
            console.log('Auto location found:', userLocation);
        },
        (error) => {
            console.log('Auto location failed:', error.message);
            // Don't show error to user for auto location, they can manually trigger it
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 600000 // 10 minutes cache
        }
    );
}

// Function to refresh distances when map is loaded or user returns to page
function refreshStationDistances() {
    if (typeof window !== 'undefined' && window.map) {
        // Try to get current user location if not available
        if (!window.userLocation) {
            autoGetUserLocation();
        } else {
            // If we have user location, recalculate all distances
            calculateAllStationDistances();
        }
    }
}

// Function to handle page visibility changes to refresh distances
function setupPageVisibilityHandler() {
    if (typeof window !== 'undefined') {
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                // Page became visible, refresh distances
                setTimeout(refreshStationDistances, 1000);
            }
        });
        
        // Also handle page focus events
        window.addEventListener('focus', function() {
            setTimeout(refreshStationDistances, 500);
        });
    }
}

// Expose functions globally for HTML onclick handlers
window.selectCity = selectCity;
window.handleSearch = handleSearch;
window.useGPS = useGPS;
window.fetchGasStations = fetchGasStations;
window.renderMarkers = renderMarkers;
window.initLocationTracking = initLocationTracking;
window.autoGetUserLocation = autoGetUserLocation;

export { handleSearch, selectCity, useGPS, showModal, hideModal, fetchGasStations, initLocationTracking, autoGetUserLocation };
