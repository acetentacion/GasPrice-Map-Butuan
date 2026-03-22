import config from './config.js';

function showRankings() {
    document.getElementById('user-rankings-modal').classList.remove('hidden');
    fetch(`${config.API_BASE_URL}/api/prices?approved=true`)
        .then(res => res.json())
        .then(submissions => {
            const scores = {};
            submissions.forEach(sub => {
                if (!scores[sub.username]) scores[sub.username] = 0;
                scores[sub.username] += 1;
            });
            Promise.all(Object.keys(scores).map(username =>
                fetch(`${config.API_BASE_URL}/api/user-score?username=${encodeURIComponent(username)}`)
                    .then(res => res.json())
                    .then(({ score, isAdmin }) => ({ username, score, isAdmin }))
            )).then(users => {
                users.sort((a, b) => b.score - a.score);
                document.getElementById('user-rankings-list').innerHTML = users.map(u => {
    const { badge, color } = getBadge(u.score, u.isAdmin);
    return `
        <div class="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <div class="flex items-center space-x-3">
                <span class="font-bold text-gray-800">${u.username}</span>
                <span class="inline-block px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full text-white bg-${color}-500 min-w-[70px] text-center shadow-sm">
                    ${badge}
                </span>
            </div>
            
            <div class="text-right">
                <span class="text-xs font-medium text-gray-400 uppercase">Score</span>
                <span class="block text-sm font-black text-blue-600">${u.score}</span>
            </div>
        </div>`;
}).join('');
            });
        });
}

function closeRankings() {
    document.getElementById('user-rankings-modal').classList.add('hidden');
}

export function showStationRankings() {
    document.getElementById('station-rankings-modal').classList.remove('hidden');
    loadStationRankings('diesel');
}

export function closeStationRankings() {
    document.getElementById('station-rankings-modal').classList.add('hidden');
}

export function loadStationRankings(fuelType) {
    const display = document.getElementById('current-fuel-display');
    const list = document.getElementById('station-rankings-list');
    
    const fuelNames = {
        'diesel': 'Diesel',
        'u91': 'Unleaded 91', 
        'u95': 'Unleaded 95'
    };
    
    if (display) {
        display.innerHTML = `<span class="text-sm font-bold text-blue-600 uppercase tracking-widest">Current: ${fuelNames[fuelType] || fuelType}</span>`;
    }
    
    document.querySelectorAll('.fuel-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-fuel') === fuelType;
        btn.style.borderColor = isActive ? '#3b82f6' : '#e5e7eb';
        btn.style.color = isActive ? '#2563eb' : '#6b7280';
        btn.style.backgroundColor = isActive ? '#eff6ff' : 'transparent';
    });
    
    if (list) {
        list.innerHTML = '<div class="flex justify-center p-4"><div class="loader"></div></div>';
    }
    
    fetch(`${config.API_BASE_URL}/api/station-rankings?fuelType=${encodeURIComponent(fuelType)}&limit=20`)
        .then(res => res.json())
        .then(data => {
            if (list && data.rankings) {
                list.innerHTML = data.rankings.map((station, index) => {
                    const brandLogo = getBrandLogo(station.brand);
                    const priceColor = getPriceColor(fuelType);
                    
                    return `
                        <div class="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer station-rank-item"
                             onclick="window.focusStationOnMap('${station.stationName}', ${station.lat}, ${station.lng}); window.closeStationRankings();">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center space-x-3">
                                    <div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                        ${brandLogo}
                                    </div>
                                    <div>
                                        <h3 class="font-black text-gray-800 text-lg">${station.stationName}</h3>
                                        <p class="text-xs text-gray-500 font-bold uppercase tracking-wider">${station.brand}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-4 text-sm">
                                    <span class="text-gray-600">📍 ${station.lat.toFixed(4)}, ${station.lng.toFixed(4)}</span>
                                    <span class="text-gray-600">👤 ${station.username}</span>
                                </div>
                                <div class="text-right">
                                    <div class="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Price</div>
                                    <div class="text-2xl font-black ${priceColor}">₱${station.price.toFixed(2)}</div>
                                </div>
                            </div>
                            <div class="mt-3 flex items-center justify-between text-xs text-gray-400">
                                <span>Updated ${getTimeAgo(new Date(station.timestamp))}</span>
                                <span class="px-2 py-1 bg-gray-100 rounded-full">Total Stations: ${data.totalStations}</span>
                            </div>
                            <div class="mt-4 flex gap-2">
                                <button onclick="window.focusStationOnMap('${station.stationName}', ${station.lat}, ${station.lng}); window.closeStationRankings();" class="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors">📍 View</button>
                                <button onclick="window.getDirections(${station.lat}, ${station.lng}, '${station.stationName}')" class="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors">🚗 GO</button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        })
        .catch(err => {
            console.error('Error loading station rankings:', err);
            if (list) {
                list.innerHTML = '<p class="text-red-500 text-center p-4">Error loading rankings. Please try again.</p>';
            }
        });
}

function getBrandLogo(brand) {
    const brandKey = (brand || '').toLowerCase();
    const logoMap = {
        'shell': '⛽',
        'petron': '⛽',
        'caltex': '⛽',
        'flyingv': '⛽',
        'jetti': '⛽'
    };
    return logoMap[brandKey] || '⛽';
}

function getPriceColor(fuelType) {
    const colorMap = {
        'diesel': 'text-blue-600',
        'u91': 'text-green-600',
        'u95': 'text-red-600'
    };
    return colorMap[fuelType] || 'text-gray-600';
}

function getBadge(score, isAdmin) {
    if (isAdmin) return { badge: 'Admin', color: 'red' };
    if (score >= 50) return { badge: 'Legend', color: 'yellow' };
    if (score >= 20) return { badge: 'Expert', color: 'blue' };
    if (score >= 10) return { badge: 'Contributor', color: 'green' };
    if (score >= 5) return { badge: 'Helper', color: 'purple' };
    return { badge: 'Newbie', color: 'gray' };
}

function showUserProfile() {
    const modal = document.getElementById('user-profile-modal');
    if (modal) modal.classList.remove('hidden');

    const userInfo = localStorage.getItem('username') || 'Guest';

    fetch(`${config.API_BASE_URL}/api/user-score?username=${encodeURIComponent(userInfo)}`)
        .then(res => res.json())
        .then(({ score, isAdmin }) => {
            const { badge, color } = getBadge(score, isAdmin);
            const infoContainer = document.getElementById('user-profile-info');
            
            if (infoContainer) {
                infoContainer.innerHTML = `
                    <div class="flex items-center justify-between">
                        <strong>User:</strong> ${userInfo} 
                        <span class="px-2 py-1 rounded text-white bg-${color}-500 text-xs font-bold">${badge}</span>
                    </div>`;
            }
        })
        .catch(err => console.error("Score fetch failed:", err));

    const historyContainer = document.getElementById('user-profile-history');
    if (historyContainer) {
        historyContainer.innerHTML = '<div class="p-4 text-center"><div class="loader mx-auto"></div></div>';
        
        fetch(`${config.API_BASE_URL}/api/user-submissions?username=${encodeURIComponent(userInfo)}`)
            .then(res => res.json())
            .then(userSubmissions => {
                if (!userSubmissions || userSubmissions.length === 0) {
                    historyContainer.innerHTML = '<p class="text-gray-500 text-center p-4">No submissions found yet.</p>';
                } else {
                    historyContainer.innerHTML = userSubmissions.map(sub => `
                        <div class="p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                            <div class="font-bold text-gray-800">${sub.stationName}</div>
                            <div class="text-sm text-gray-600">
                                D: ₱${sub.prices.diesel.toFixed(2)} | 
                                91: ₱${sub.prices.u91.toFixed(2)} | 
                                95: ₱${sub.prices.u95.toFixed(2)}
                            </div>
                            <div class="text-[10px] text-gray-400 mt-1 uppercase font-bold">
                                ${new Date(sub.timestamp).toLocaleString()}
                            </div>
                            ${sub.photoUrl ? `
                                <img src="${sub.photoUrl}" alt="Proof" class="mt-2 w-full h-32 object-cover rounded-xl border border-gray-200 cursor-pointer" onclick="window.open('${sub.photoUrl}')">
                            ` : ''}
                        </div>
                    `).join('');
                }
            })
            .catch(() => {
                historyContainer.innerHTML = '<p class="text-red-500 text-center p-4">Error loading history.</p>';
            });
    }
}

function closeUserProfile() {
    document.getElementById('user-profile-modal').classList.add('hidden');
}

export { showRankings, closeRankings, showUserProfile, closeUserProfile };
