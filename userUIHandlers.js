// UI handler for User Rankings modal
function showRankings() {
    document.getElementById('user-rankings-modal').classList.remove('hidden');
    fetch('http://localhost:3000/api/prices?approved=true')
        .then(res => res.json())
        .then(submissions => {
            const scores = {};
            submissions.forEach(sub => {
                if (!scores[sub.username]) scores[sub.username] = 0;
                scores[sub.username] += 1;
            });
            Promise.all(Object.keys(scores).map(username =>
                fetch(`http://localhost:3000/api/user-score?username=${encodeURIComponent(username)}`)
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
        // Optionally fetch and render rankings here
}

function closeRankings() {
    document.getElementById('user-rankings-modal').classList.add('hidden');
}

// Badge and rank rendering helpers
function getBadge(score, isAdmin) {
    if (isAdmin) return { badge: 'Admin', color: 'red' };
    if (score >= 50) return { badge: 'Legend', color: 'yellow' };
    if (score >= 20) return { badge: 'Expert', color: 'blue' };
    if (score >= 10) return { badge: 'Contributor', color: 'green' };
    if (score >= 5) return { badge: 'Helper', color: 'purple' };
    return { badge: 'Newbie', color: 'gray' };
}

// UI handler for User Profile modal
function showUserProfile() {
    // 1. Show the modal first
    const modal = document.getElementById('user-profile-modal');
    if (modal) modal.classList.remove('hidden');

    // 2. Get username from localStorage (Much safer than the DOM)
    const userInfo = localStorage.getItem('username') || 'Guest';

    // 3. Fetch User Score and Badge
    fetch(`http://localhost:3000/api/user-score?username=${encodeURIComponent(userInfo)}`)
        .then(res => res.json())
        .then(({ score, isAdmin }) => {
            // Ensure getBadge function exists in your scope
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

    // 4. Fetch Submissions
    const historyContainer = document.getElementById('user-profile-history');
    if (historyContainer) {
        historyContainer.innerHTML = '<div class="p-4 text-center"><div class="loader mx-auto"></div></div>'; // Loading state
        
        fetch(`http://localhost:3000/api/user-submissions?username=${encodeURIComponent(userInfo)}`)
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