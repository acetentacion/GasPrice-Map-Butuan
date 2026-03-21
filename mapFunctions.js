import config from './config.js';
import { isInButuan } from './utilFunctions.js';
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

function useGPS() {
    hideModal();
    
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
                osmData = await res.json();
            } catch (timeoutErr) {
                console.warn('OSM API timeout, using cached data or mock stations:', timeoutErr);
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

export { handleSearch, selectCity, useGPS, showModal, hideModal, fetchGasStations };
