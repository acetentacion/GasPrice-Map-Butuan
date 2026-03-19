// markerFunctions.js
// Contains marker rendering and related functions

async function renderMarkers(stations) {
    markerGroup.clearLayers();
    let submittedPrices = [];
    try {
        const res = await fetch('http://localhost:3000/api/prices');
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
        marker.on('click', () => {
            showStationDetails({
                name: name,
                brand: brand,
                lat: lat,
                lng: lon,
                address: address,
                prices: prices,
                submitted: latestSubmission
            });
        });
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
            marker.on('click', () => {
                showStationDetails({
                    name: s.tags.name,
                    brand: s.tags.brand,
                    lat: s.lat,
                    lng: s.lon,
                    prices: prices,
                    submitted: null
                });
            });
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
        marker.on('click', () => {
            showStationDetails({
                name: sub.stationName,
                brand: sub.brand,
                lat: sub.lat,
                lng: sub.lng,
                prices: sub.prices,
                submitted: sub
            });
        });
    });
}

export { renderMarkers, renderMarkersFromBackend };