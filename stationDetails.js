let currentStation = null;

import config from './config.js';

function showSuccessMessage(message) {
    const successModal = document.getElementById('success-modal');
    if (successModal) {
        const messageEl = successModal.querySelector('p');
        if (messageEl) messageEl.innerText = message;
        successModal.classList.remove('hidden');
    }
}

function showErrorMessage(message) {
    const errorModal = document.getElementById('error-modal');
    if (errorModal) {
        const messageEl = errorModal.querySelector('#error-message');
        if (messageEl) messageEl.innerText = message;
        errorModal.classList.remove('hidden');
    }
}

function showNetworkErrorModal() {
    const networkErrorModal = document.getElementById('network-error-modal');
    if (networkErrorModal) {
        networkErrorModal.classList.remove('hidden');
    }
}

function showLoginRequiredModal() {
    const loginRequiredModal = document.getElementById('login-required-modal');
    if (loginRequiredModal) {
        loginRequiredModal.classList.remove('hidden');
    }
}

function closeSuccessModal() {
    const successModal = document.getElementById('success-modal');
    if (successModal) {
        successModal.classList.add('hidden');
    }
}

function closeErrorModal() {
    const errorModal = document.getElementById('error-modal');
    if (errorModal) {
        errorModal.classList.add('hidden');
    }
}

function closeNetworkErrorModal() {
    const networkErrorModal = document.getElementById('network-error-modal');
    if (networkErrorModal) {
        networkErrorModal.classList.add('hidden');
    }
}

function closeLoginRequiredModal() {
    const loginRequiredModal = document.getElementById('login-required-modal');
    if (loginRequiredModal) {
        loginRequiredModal.classList.add('hidden');
    }
}

function openStationDetails(name, brand, lat, lon, address, diesel, u91, u95, hasSubmission) {
    const prices = {
        diesel: diesel || 0,
        u91: u91 || 0,
        u95: u95 || 0
    };
    
    const stationData = {
        name: name,
        brand: brand,
        lat: lat,
        lng: lon,
        address: address,
        prices: prices,
        submitted: hasSubmission ? null : null
    };
    
    showStationDetails(stationData);
}

function showStationDetails(data) {
    currentStation = data;
    
    const stationNameEl = document.getElementById('station-name');
    const stationBrandEl = document.getElementById('station-brand');
    const stationAddressEl = document.getElementById('station-address');
    
    // Always try to use the info panel first - only fall back to map popup if explicitly requested
    if (!stationNameEl || !stationBrandEl || !stationAddressEl) {
        console.log('Info panel elements not found - showing map-focused details.');
        
        if (window.map && data.lat && data.lng) {
            window.map.setView([data.lat, data.lng], 16, { animate: true });
            
            const popupContent = `
                <div class="text-sm">
                    <div class="font-bold text-gray-800">${data.stationName || data.name}</div>
                    <div class="text-blue-600 font-bold uppercase text-xs tracking-wider mb-2">${data.brand}</div>
                    <div class="text-gray-600 mb-2">${data.address || 'Address not available'}</div>
                    <div class="grid grid-cols-3 gap-2 text-xs">
                        <div class="bg-blue-50 p-2 rounded">
                            <div class="text-xs text-blue-500 font-bold uppercase tracking-wider">Diesel</div>
                            <div class="font-black text-gray-900">₱${data.prices?.diesel?.toFixed(2) || '--'}</div>
                        </div>
                        <div class="bg-green-50 p-2 rounded">
                            <div class="text-xs text-green-500 font-bold uppercase tracking-wider">91</div>
                            <div class="font-black text-gray-900">₱${data.prices?.u91?.toFixed(2) || '--'}</div>
                        </div>
                        <div class="bg-red-50 p-2 rounded">
                            <div class="text-xs text-red-500 font-bold uppercase tracking-wider">95</div>
                            <div class="font-black text-gray-900">₱${data.prices?.u95?.toFixed(2) || '--'}</div>
                        </div>
                    </div>
                    ${data.submitted ? `
                        <div class="mt-2 text-xs text-gray-500">
                            Status: ${data.submitted.confirmScore - data.submitted.disputeScore >= 5 ? 'Verified' : 'Pending'}
                        </div>
                    ` : ''}
                </div>
            `;
            
            const marker = L.marker([data.lat, data.lng]).addTo(window.map);
            marker.bindPopup(popupContent).openPopup();
            
            setTimeout(() => {
                if (marker) {
                    marker.remove();
                }
            }, 5000);
        }
        return;
    }
    
    stationNameEl.innerText = data.stationName || data.name;
    stationBrandEl.innerText = data.brand;
    stationAddressEl.innerText = data.address || 'Address not available';
    if (!window.map || !window.map.getCenter) {
        console.error('Map not initialized');
        return;
    }
    
    // Use user's current tracked location if available, otherwise fall back to map center
    let userLat, userLng;
    if (window.currentLocationMarker) {
        const currentLatLng = window.currentLocationMarker.getLatLng();
        userLat = currentLatLng.lat;
        userLng = currentLatLng.lng;
    } else if (window.map && window.map.getCenter) {
        userLat = window.map.getCenter().lat;
        userLng = window.map.getCenter().lng;
    } else {
        // Fallback to Butuan City center
        userLat = 8.9475;
        userLng = 125.5406;
    }
    
    const distance = calculateDistance(userLat, userLng, data.lat, data.lng);
    
    const distanceValueEl = document.getElementById('distance-value');
    if (!distanceValueEl) {
        console.error('Distance value element not found');
        return;
    }
    distanceValueEl.innerText = `${distance} km`;
    const fuels = [
        { label: 'Diesel', price: data.prices.diesel, color: 'nozzle-diesel' },
        { label: 'Unleaded 91', price: data.prices.u91, color: 'nozzle-u91' },
        { label: 'Premium 95', price: data.prices.u95, color: 'nozzle-u95' }
    ];
    
    const priceListEl = document.getElementById('price-list');
    if (!priceListEl) {
        console.error('Price list element not found');
        return;
    }
    
    priceListEl.innerHTML = fuels.map(f => `
        <div class="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div class="flex items-center gap-3">
                <div class="w-1.5 h-10 ${f.color} rounded-full"></div>
                <span class="font-black text-gray-700 text-sm tracking-tight">${f.label}</span>
            </div>
            <span class="text-2xl font-black text-gray-900">₱${f.price !== null && f.price !== undefined ? f.price.toFixed(2) : '--'}</span>
        </div>
    `).join('');
    fetch(`${config.API_BASE_URL}/api/prices`)
        .then(res => res.json())
        .then(submittedPrices => {
            const name = data.stationName || data.name;
            const lat = data.lat;
            const lon = data.lng;
            
            if (!Array.isArray(submittedPrices) || submittedPrices.length === 0) {
                const historyListEl = document.getElementById('history-list');
                const priceHistoryEl = document.getElementById('price-history');
                if (historyListEl && priceHistoryEl) {
                    priceHistoryEl.style.display = 'none';
                }
                return;
            }
            
            const stationSubmissions = submittedPrices
                .filter(sub =>
                    sub.stationName && 
                    sub.lat && 
                    sub.lng &&
                    isInButuan(sub.lat, sub.lng) &&
                    sub.stationName.toLowerCase().trim() === name.toLowerCase().trim() &&
                    Math.sqrt((sub.lat - lat) ** 2 + (sub.lng - lon) ** 2) * 111 < 1
                )
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            const historyListEl = document.getElementById('history-list');
            const priceHistoryEl = document.getElementById('price-history');
            
            if (historyListEl && priceHistoryEl) {
                if (stationSubmissions.length > 1) {
                    historyListEl.innerHTML = stationSubmissions.slice(1, 4).map(h => `
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
                    priceHistoryEl.style.display = 'block';
                } else {
                    priceHistoryEl.style.display = 'none';
                }
            }
        })
        .catch(err => {
            console.error('Error fetching price history:', err);
        });
    const statusText = document.getElementById('status-text');
    const lastUpdate = document.getElementById('last-update');
    const voteButtons = document.getElementById('vote-buttons');
    
    if (!statusText || !lastUpdate || !voteButtons) {
        console.error('Status elements not found');
        return;
    }
    
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
                    statusText.innerText += ` | Submitter Trust Score: ${userData.score || 1}`;
                });
        }
        if (data.submitted && data.submitted.flagged) {
            statusText.innerText += ' | ⚠️ Flagged as Fake by Admin';
        }
    } else {
        statusText.innerText = 'Status: No data';
        lastUpdate.innerText = 'Updated --';
        voteButtons.style.display = 'none';
    }
    if (window.isAdmin) {
        const adminToolsEl = document.getElementById('admin-tools');
        const flagBtnEl = document.getElementById('flag-btn');
        const removeBtnEl = document.getElementById('remove-btn');
        
        if (adminToolsEl && flagBtnEl && removeBtnEl) {
            adminToolsEl.style.display = 'block';
            flagBtnEl.onclick = () => {
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
                    showSuccessMessage(result.message || 'Submission flagged successfully');
                    fetchGasStations();
                });
            };
            removeBtnEl.onclick = () => {
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
                    showSuccessMessage(result.message || 'Submission removed successfully');
                    fetchGasStations();
                });
            };
        }
    } else {
        const adminToolsEl = document.getElementById('admin-tools');
        if (adminToolsEl) {
            adminToolsEl.style.display = 'none';
        }
    }
    if (data.submitted && data.submitted.photoUrl) {
        const stationAddressEl = document.getElementById('station-address');
        if (stationAddressEl) {
            stationAddressEl.innerHTML += `<br><img src="${data.submitted.photoUrl}" alt="Price Photo" style="max-width:200px; border-radius:12px; margin-top:8px;">`;
        }
    }
    
    const panel = document.getElementById('info-panel');
    
    if (!panel) {
        console.error('Info panel element not found');
        return;
    }
    
    // Close any existing info panel before opening new one
    if (window.closePanel) {
        window.closePanel();
    }
    
    panel.classList.remove('hidden');
    
    setTimeout(() => {
        panel.classList.remove('translate-x-full');
    }, 10);
}

export async function vote(type) {
    const username = window.username || localStorage.getItem('username');
    
    if (!username) {
        showLoginRequiredModal();
        return;
    }

    const stationNameEl = document.getElementById('station-name');
    if (!stationNameEl) {
        console.error('Station name element not found for voting');
        return;
    }
    
    const stationName = stationNameEl.innerText.toLowerCase().trim();
    
    const lat = window.currentStation ? window.currentStation.lat : (window.map ? window.map.getCenter().lat : 8.9475);
    const lng = window.currentStation ? window.currentStation.lng : (window.map ? window.map.getCenter().lng : 125.5406);

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
            
            showSuccessMessage("Vote recorded!");
        } else {
            console.log('Vote error status:', response.status);
            if (data.error === 'Already voted') {
                showErrorMessage('You have already voted on this submission.');
            } else {
                showErrorMessage(data.error || "Error recording vote.");
            }
        }
    } catch (err) {
        console.error('Catch error:', err);
        showNetworkErrorModal();
    }
}

function submitPrices() {
    const username = localStorage.getItem('username');
    if (!username) {
        showLoginRequiredModal();
        return;
    }
    const diesel = parseFloat(document.getElementById('new-diesel').value);
    const u91 = parseFloat(document.getElementById('new-u91').value);
    const u95 = parseFloat(document.getElementById('new-u95').value);
    if (isNaN(diesel) || isNaN(u91) || isNaN(u95)) {
        showErrorMessage('Please enter valid prices.');
        return;
    }
    const photoInput = document.getElementById('price-photo');
    const formData = new FormData();
    formData.append('stationName', String(currentStation.stationName || currentStation.name));
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
            document.getElementById('update-form').classList.add('hidden');
            
            const successModal = document.getElementById('success-modal');
            if (successModal) {
                successModal.classList.remove('hidden');
            }

            document.getElementById('new-diesel').value = '';
            document.getElementById('new-u91').value = '';
            document.getElementById('new-u95').value = '';
            const photoInput = document.getElementById('price-photo');
            if (photoInput) photoInput.value = '';
            
            const preview = document.getElementById('image-preview');
            const placeholder = document.getElementById('photo-placeholder');
            if (preview) preview.classList.add('hidden');
            if (placeholder) placeholder.classList.remove('hidden');

            if (window.fetchGasStations) window.fetchGasStations();
            
        } else {
            showErrorMessage(result.error || 'Submission failed.');
        }
    })
    .catch(err => {
        console.error('Submit prices error:', err);
        showNetworkErrorModal();
    });
}

if (typeof window !== 'undefined') {
    window.openStationDetails = openStationDetails;
    window.showStationDetails = showStationDetails;
    window.submitPrices = submitPrices;
    window.showSuccessMessage = showSuccessMessage;
    window.showErrorMessage = showErrorMessage;
    window.showNetworkErrorModal = showNetworkErrorModal;
    window.showLoginRequiredModal = showLoginRequiredModal;
    window.closeSuccessModal = closeSuccessModal;
    window.closeErrorModal = closeErrorModal;
    window.closeNetworkErrorModal = closeNetworkErrorModal;
    window.closeLoginRequiredModal = closeLoginRequiredModal;
}

export { showStationDetails, submitPrices, showSuccessMessage, showErrorMessage, showNetworkErrorModal, showLoginRequiredModal, closeSuccessModal, closeErrorModal, closeNetworkErrorModal, closeLoginRequiredModal };
