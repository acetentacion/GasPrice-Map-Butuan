// stationDetails.js
// Station details and price submission functions
// Global variable to store the currently selected station
let currentStation = null;

// Import config for API URLs
import config from './config.js';

function showStationDetails(data) {
    currentStation = data;
    document.getElementById('station-name').innerText = data.name;
    document.getElementById('station-brand').innerText = data.brand;
    document.getElementById('station-address').innerText = data.address || 'Address not available';
    const userLat = window.map.getCenter().lat;
    const userLng = window.map.getCenter().lng;
    const distance = calculateDistance(userLat, userLng, data.lat, data.lng);
    document.getElementById('distance-value').innerText = `${distance} km`;
    const fuels = [
        { label: 'Diesel', price: data.prices.diesel, color: 'nozzle-diesel' },
        { label: 'Unleaded 91', price: data.prices.u91, color: 'nozzle-u91' },
        { label: 'Premium 95', price: data.prices.u95, color: 'nozzle-u95' }
    ];
    document.getElementById('price-list').innerHTML = fuels.map(f => `
        <div class="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div class="flex items-center gap-3">
                <div class="w-1.5 h-10 ${f.color} rounded-full"></div>
                <span class="font-black text-gray-700 text-sm tracking-tight">${f.label}</span>
            </div>
            <span class="text-2xl font-black text-gray-900">₱${f.price.toFixed(2)}</span>
        </div>
    `).join('');
    fetch(`${config.API_BASE_URL}/api/prices`)
        .then(res => res.json())
        .then(submittedPrices => {
            const name = data.name;
            const lat = data.lat;
            const lon = data.lng;
            const stationSubmissions = submittedPrices
                .filter(sub =>
                    isInButuan(sub.lat, sub.lng) &&
                    sub.stationName.toLowerCase().trim() === name.toLowerCase().trim() &&
                    Math.sqrt((sub.lat - lat) ** 2 + (sub.lng - lon) ** 2) * 111 < 1
                )
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            if (stationSubmissions.length > 1) {
                document.getElementById('history-list').innerHTML = stationSubmissions.slice(1, 4).map(h => `
                    <div class="p-3 bg-gray-50 rounded-xl">
                        <p class="text-xs text-gray-500 mb-1">
                            ${getTimeAgo(new Date(h.timestamp))}
                            ${h.flagged ? '<span class="text-red-600 font-bold ml-2">⚠️ Flagged as Fake</span>' : ''}
                        </p>
                        <p class="text-sm font-bold">
                            Diesel: ₱${h.prices.diesel.toFixed(2)} | 91: ₱${h.prices.u91.toFixed(2)} | 95: ₱${h.prices.u95.toFixed(2)}
                        </p>
                    </div>
                `).join('');
                document.getElementById('price-history').style.display = 'block';
            } else {
                document.getElementById('price-history').style.display = 'none';
            }
        });
    const statusText = document.getElementById('status-text');
    const lastUpdate = document.getElementById('last-update');
    const voteButtons = document.getElementById('vote-buttons');
    if (data.submitted) {
        const { confirmScore, disputeScore, timestamp } = data.submitted;
        const score = confirmScore - disputeScore;
        let status = 'Pending';
        if (score >= 5) status = `Verified (trust score: ${score})`;
        else if (disputeScore > confirmScore) status = `Flagged (trust score: ${score})`;
        else status = `Pending (trust score: ${score})`;
        statusText.innerText = `Status: ${status}`;
        const timeAgo = getTimeAgo(new Date(timestamp));
        lastUpdate.innerText = `Updated ${timeAgo}`;
        voteButtons.style.display = 'flex';
        if (data.submitted && data.submitted.username) {
            fetch(`${config.API_BASE_URL}/api/user-score?username=` + encodeURIComponent(data.submitted.username))
                .then(res => res.json())
                .then(userData => {
                    document.getElementById('status-text').innerText += ` | Submitter Trust Score: ${userData.score || 1}`;
                });
        }
        if (data.submitted && data.submitted.flagged) {
            document.getElementById('status-text').innerText += ' | ⚠️ Flagged as Fake by Admin';
        }
    } else {
        statusText.innerText = 'Status: No data';
        lastUpdate.innerText = 'Updated --';
        voteButtons.style.display = 'none';
    }
    if (window.isAdmin) {
        document.getElementById('admin-tools').style.display = 'block';
        document.getElementById('flag-btn').onclick = () => {
            fetch(`${config.API_BASE_URL}/api/flag-price`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stationName: data.name,
                    lat: data.lat,
                    lng: data.lng,
                    adminUsername: username
                })
            }).then(res => res.json()).then(result => {
                alert(result.message || result.error);
                fetchGasStations();
            });
        };
        document.getElementById('remove-btn').onclick = () => {
            fetch(`${config.API_BASE_URL}/api/remove-price`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stationName: data.name,
                    lat: data.lat,
                    lng: data.lng,
                    adminUsername: username
                })
            }).then(res => res.json()).then(result => {
                alert(result.message || result.error);
                fetchGasStations();
            });
        };
    } else {
        document.getElementById('admin-tools').style.display = 'none';
    }
    if (data.submitted && data.submitted.photoUrl) {
        document.getElementById('station-address').innerHTML += `<br><img src="${data.submitted.photoUrl}" alt="Price Photo" style="max-width:200px; border-radius:12px; margin-top:8px;">`;
    }
    
    // Mobile-first panel behavior
    const panel = document.getElementById('info-panel');
    const mapContainer = document.getElementById('map');
    const isMobile = window.innerWidth < 768;
    
    panel.classList.remove('hidden');
    
    if (isMobile) {
        // On mobile, slide in the full-screen panel and hide the map
        setTimeout(() => {
            panel.classList.add('active');
            // Add class to map to hide it when panel is open on mobile
            mapContainer.classList.add('map-with-panel-open');
        }, 10);
    } else {
        // On desktop, use the original sliding up behavior
        setTimeout(() => panel.classList.add('active'), 10);
    }
}

export async function vote(type) {
    // 1. Get username from localStorage (Fixes the ReferenceError)
    const username = localStorage.getItem('username');
    
    if (!username) {
        alert('Please log in to vote.');
        // Optional: window.showLoginModal();
        return;
    }

    // 2. Get the station details
    const stationName = document.getElementById('station-name').innerText.toLowerCase().trim();
    
    // Ensure currentStation or map context is available
    const lat = window.currentStation ? window.currentStation.lat : window.map.getCenter().lat;
    const lng = window.currentStation ? window.currentStation.lng : window.map.getCenter().lng;

    try {
        const response = await fetch(`${config.API_BASE_URL}/api/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stationName, type, username, lat, lng })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Vote success');
            if (window.closePanel) window.closePanel();
            if (window.fetchGasStations) window.fetchGasStations();
            
            // Note: Ensure showSuccessModal is defined or use alert
            alert("Vote recorded!"); 
        } else {
            console.log('Vote error status:', response.status);
            if (data.error === 'Already voted') {
                alert('You have already voted on this submission.');
            } else {
                alert(data.error || "Error recording vote.");
            }
        }
    } catch (err) {
        console.error('Catch error:', err);
        alert("Network error.");
    }
}

function submitPrices() {
    const username = localStorage.getItem('username');
    if (!username) {
        alert('Please log in to submit prices.');
        return;
    }
    const diesel = parseFloat(document.getElementById('new-diesel').value);
    const u91 = parseFloat(document.getElementById('new-u91').value);
    const u95 = parseFloat(document.getElementById('new-u95').value);
    if (isNaN(diesel) || isNaN(u91) || isNaN(u95)) {
        alert('Please enter valid prices.');
        return;
    }
    const photoInput = document.getElementById('price-photo');
    const formData = new FormData();
    formData.append('stationName', String(currentStation.name));
    formData.append('lat', String(currentStation.lat));
    formData.append('lng', String(currentStation.lng));
    formData.append('username', String(username));
    formData.append('diesel', String(diesel));
    formData.append('u91', String(u91));
    formData.append('u95', String(u95));
    formData.append('timestamp', new Date().toISOString());
    if (photoInput.files && photoInput.files[0]) {
        formData.append('photo', photoInput.files[0]);
    }
    fetch(`${config.API_BASE_URL}/api/prices`, {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(result => {
        if (result.message) {
            // 1. Hide the input form
            document.getElementById('update-form').classList.add('hidden');
            
            // 2. Show the custom success modal
            const successModal = document.getElementById('success-modal');
            if (successModal) {
                successModal.classList.remove('hidden');
            }

            // 3. Reset the form fields
            document.getElementById('new-diesel').value = '';
            document.getElementById('new-u91').value = '';
            document.getElementById('new-u95').value = '';
            const photoInput = document.getElementById('price-photo');
            if (photoInput) photoInput.value = '';
            
            // Clear the preview image if you have one
            const preview = document.getElementById('image-preview');
            const placeholder = document.getElementById('photo-placeholder');
            if (preview) preview.classList.add('hidden');
            if (placeholder) placeholder.classList.remove('hidden');

            // 4. Refresh the map markers
            if (window.fetchGasStations) window.fetchGasStations();
            
        } else {
            alert(result.error || 'Submission failed.');
        }
    });
}

export { showStationDetails, submitPrices };