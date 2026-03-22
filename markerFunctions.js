import { calculateDistance, isInButuan } from './utilFunctions.js';
import config from './config.js';

async function renderMarkers(stations) {
    markerGroup.clearLayers();
    let submittedPrices = [];
    try {
        const res = await fetch(`${config.API_BASE_URL}/api/prices`);
        submittedPrices = await res.json();
    } catch (err) {
        console.error('Failed to fetch submitted prices:', err);
    }
    stations.forEach(s => {
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
            diesel: 54.10 + Math.random() * 3,
            u91: 58.50 + Math.random() * 3,
            u95: 61.20 + Math.random() * 3
        };
        const brandKey = brand.toLowerCase();
        const logoUrl = brandLogos[brandKey] || '/logos/default.png';
        const icon = L.icon({
            iconUrl: logoUrl,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });
        const marker = L.marker([lat, lon], { icon }).addTo(markerGroup);
        
        // Calculate distance from user location if available
        let distance = null;
        if (window.userLocation) {
            distance = calculateDistance(
                window.userLocation.lat,
                window.userLocation.lng,
                lat,
                lon
            );
            // Store distance on the marker
            marker.distance = parseFloat(distance);
        }
        
        // Create popup content with distance if available
        let popupContent = `
            <div class="p-3">
                <h3 class="font-black text-lg">${name}</h3>
                <p class="text-blue-600 font-black uppercase text-xs tracking-widest">${brand}</p>
                <p class="text-sm text-gray-500 mb-3">${address}</p>
        `;
        
        // Add distance info if available
        if (distance !== null) {
            popupContent += `
                <div class="distance-info mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg mb-3">
                    <div class="text-xs font-bold text-blue-500 uppercase tracking-widest">Distance</div>
                    <div class="text-lg font-black text-gray-900">${distance} km</div>
                </div>
            `;
        }
        
        // Add price information
        if (prices.diesel || prices.u91 || prices.u95) {
            popupContent += `
                <div class="grid grid-cols-3 gap-2 mb-3">
                    ${prices.diesel ? `<div class="text-center"><div class="text-xs text-gray-500">Diesel</div><div class="font-black text-blue-600">₱${prices.diesel.toFixed(2)}</div></div>` : `<div class="text-center"><div class="text-xs text-gray-500">Diesel</div><div class="font-black text-gray-400">N/A</div></div>`}
                    ${prices.u91 ? `<div class="text-center"><div class="text-xs text-gray-500">Unleaded 91</div><div class="font-black text-green-600">₱${prices.u91.toFixed(2)}</div></div>` : `<div class="text-center"><div class="text-xs text-gray-500">Unleaded 91</div><div class="font-black text-gray-400">N/A</div></div>`}
                    ${prices.u95 ? `<div class="text-center"><div class="text-xs text-gray-500">Unleaded 95</div><div class="font-black text-red-600">₱${prices.u95.toFixed(2)}</div></div>` : `<div class="text-center"><div class="text-xs text-gray-500">Unleaded 95</div><div class="font-black text-gray-400">N/A</div></div>`}
                </div>
            `;
        } else {
            popupContent += `
                <div class="p-3 bg-gray-100 rounded-lg mb-3">
                    <div class="text-sm font-bold text-gray-600">No Price Data</div>
                    <div class="text-xs text-gray-500">Help the community by submitting prices</div>
                </div>
            `;
        }
        
        popupContent += `
                <div class="flex gap-2 mt-4">
                    <button onclick="openStationDetails('${name}', '${brand}', ${lat}, ${lon}, '${address}', ${prices.diesel || 0}, ${prices.u91 || 0}, ${prices.u95 || 0}, ${latestSubmission ? 1 : 0})" class="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors">View Details</button>
                    <button onclick="getDirections(${lat}, ${lon}, '${name}')" class="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors">Get Directions</button>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
    });
    if (stations.filter(s => isInButuan(s.lat || s.center?.lat, s.lon || s.center?.lon)).length === 0) {
        console.log('No stations found in Butuan, using mock data');
        const mockStations = [
            { lat: 8.9475, lon: 125.5406, tags: { name: 'Petron Butuan', brand: 'Petron' } },
            { lat: 8.9500, lon: 125.5350, tags: { name: 'Shell Butuan', brand: 'Shell' } },
            { lat: 8.9450, lon: 125.5450, tags: { name: 'Caltex Butuan', brand: 'Caltex' } }
        ];
        mockStations.forEach(s => {
            const prices = { 
                diesel: 54.10 + Math.random() * 3, 
                u91: 58.50 + Math.random() * 3, 
                u95: 61.20 + Math.random() * 3 
            };
            const marker = L.marker([s.lat, s.lon]).addTo(markerGroup);
            
            // Calculate distance from user location if available
            let distance = null;
            if (window.userLocation) {
                distance = calculateDistance(
                    window.userLocation.lat,
                    window.userLocation.lng,
                    s.lat,
                    s.lon
                );
                // Store distance on the marker
                marker.distance = parseFloat(distance);
            }
            
            // Create popup content with distance if available
            let popupContent = `
                <div class="p-3">
                    <h3 class="font-black text-lg">${s.tags.name}</h3>
                    <p class="text-blue-600 font-black uppercase text-xs tracking-widest">${s.tags.brand}</p>
                    <p class="text-sm text-gray-500 mb-3">Mock Station</p>
            `;
            
            // Add distance info if available
            if (distance !== null) {
                popupContent += `
                    <div class="distance-info mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg mb-3">
                        <div class="text-xs font-bold text-blue-500 uppercase tracking-widest">Distance</div>
                        <div class="text-lg font-black text-gray-900">${distance} km</div>
                    </div>
                `;
            }
            
            popupContent += `
                    <div class="grid grid-cols-3 gap-2 mb-3">
                        <div class="text-center"><div class="text-xs text-gray-500">Diesel</div><div class="font-black text-blue-600">₱${prices.diesel.toFixed(2)}</div></div>
                        <div class="text-center"><div class="text-xs text-gray-500">Unleaded 91</div><div class="font-black text-green-600">₱${prices.u91.toFixed(2)}</div></div>
                        <div class="text-center"><div class="text-xs text-gray-500">Unleaded 95</div><div class="font-black text-red-600">₱${prices.u95.toFixed(2)}</div></div>
                    </div>
                    <div class="flex gap-2 mt-4">
                        <button onclick="openStationDetails('${s.tags.name}', '${s.tags.brand}', ${s.lat}, ${s.lon}, 'Mock Station', ${prices.diesel}, ${prices.u91}, ${prices.u95}, 0)" class="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors">View Details</button>
                        <button onclick="getDirections(${s.lat}, ${s.lon}, '${s.tags.name}')" class="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors">Get Directions</button>
                    </div>
                </div>
            `;
            
            marker.bindPopup(popupContent);
        });
    }
}

function renderMarkersFromBackend(prices) {
    markerGroup.clearLayers();
    prices.forEach(sub => {
        if (!isInButuan(sub.lat, sub.lng)) return;
        const brand = (sub.brand || sub.stationName || '').toLowerCase();
        const logoUrl = brandLogos[brand] || '/logos/default.png';
        const icon = L.icon({
            iconUrl: logoUrl,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });
        const marker = L.marker([sub.lat, sub.lng], { icon }).addTo(markerGroup);
        marker.on('click touchend', () => {
            window.currentStation = {
                name: sub.stationName,
                brand: sub.brand,
                lat: sub.lat,
                lng: sub.lng,
                address: 'Address not available',
                prices: sub.prices,
                submitted: sub
            };
            
            if (typeof showStationDetails === 'function') {
                showStationDetails(window.currentStation);
            } else {
                console.error('showStationDetails function not available');
            }
        });
    });
}

export { renderMarkers, renderMarkersFromBackend };
