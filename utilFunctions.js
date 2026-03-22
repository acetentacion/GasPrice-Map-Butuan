function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(1);
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
}

function isInButuan(lat, lng) {
    return lat >= 8.78833 && lat <= 9.10833 && lng >= 125.37694 && lng <= 125.69694;
}

// Unified function to get current user location for distance calculations
// This ensures consistent location source priority across all pages
function getCurrentUserLocationForDistanceCalculation() {
    // Priority 1: Real-time location tracking (most accurate)
    if (window.userLocation && window.userLocation.lat && window.userLocation.lng) {
        console.log('Using real-time location tracking:', window.userLocation);
        return { lat: window.userLocation.lat, lng: window.userLocation.lng };
    }
    
    // Priority 2: localStorage location (persistent)
    if (window.userCurrentLat && window.userCurrentLng) {
        console.log('Using localStorage location:', { lat: window.userCurrentLat, lng: window.userCurrentLng });
        return { lat: window.userCurrentLat, lng: window.userCurrentLng };
    }
    
    // Priority 3: Map marker location (visual reference)
    if (window.currentLocationMarker) {
        const latlng = window.currentLocationMarker.getLatLng();
        console.log('Using map marker location:', latlng);
        return { lat: latlng.lat, lng: latlng.lng };
    }
    
    // Priority 4: City coordinates (regional)
    if (window.currentCityLat && window.currentCityLng) {
        console.log('Using city coordinates:', { lat: window.currentCityLat, lng: window.currentCityLng });
        return { lat: window.currentCityLat, lng: window.currentCityLng };
    }
    
    // Priority 5: Butuan City center (default fallback)
    const fallback = { lat: 8.9475, lng: 125.5406 };
    console.log('Using fallback location (Butuan City center):', fallback);
    return fallback;
}

// Enhanced distance calculation function that uses unified location source
function calculateDistanceEnhanced(lat1, lon1, lat2, lon2) {
    // If lat1/lon1 are not provided, use the unified location function
    if (lat1 === undefined || lon1 === undefined) {
        const userLocation = getCurrentUserLocationForDistanceCalculation();
        lat1 = userLocation.lat;
        lon1 = userLocation.lng;
    }
    
    // Use the original haversine formula
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

export { calculateDistance, getTimeAgo, isInButuan, getCurrentUserLocationForDistanceCalculation, calculateDistanceEnhanced };
