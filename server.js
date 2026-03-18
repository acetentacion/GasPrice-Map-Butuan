const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'prices.json');
const USERS_FILE = path.join(__dirname, 'users.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files from current directory

// Ensure files exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}));
}

// POST /api/register - Register a new user
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    if (users[username]) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = { password: hashedPassword, score: 1 };
    fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    
    res.json({ message: 'Registration successful' });
});

// POST /api/login - Login user
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    const user = users[username];
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({ message: 'Login successful', username });
});

// POST /api/prices - Store submitted prices
app.post('/api/prices', (req, res) => {
    const { stationName, prices, timestamp, username, lat, lng } = req.body;
    if (!stationName || !prices || !timestamp || !username || lat == null || lng == null) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    data.push({ stationName, prices, timestamp, username, lat, lng, confirmScore: 0, disputeScore: 0, voters: [] });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    
    res.json({ message: 'Price submitted successfully' });
});

// POST /api/vote - Handle confirm/dispute votes with weighted scores
app.post('/api/vote', (req, res) => {
    const { stationName, type, username, lat, lng } = req.body;
    if (!stationName || !['confirm', 'dispute'].includes(type) || !username || lat == null || lng == null) {
        return res.status(400).json({ error: 'Invalid request' });
    }
    
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    const voterScore = users[username]?.score || 1;
    
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    // Find the closest matching submission within ~1 km
    let closest = null;
    let minDistance = Infinity;
    data.forEach(sub => {
        if (sub.stationName.toLowerCase().trim() === stationName.toLowerCase().trim()) {
            const distance = Math.sqrt((sub.lat - lat) ** 2 + (sub.lng - lng) ** 2) * 111; // Rough km conversion
            if (distance < 1 && distance < minDistance) { // Within 1 km
                minDistance = distance;
                closest = sub;
            }
        }
    });
    
    if (closest) {
        // Initialize missing fields
        if (typeof closest.confirmScore !== 'number') closest.confirmScore = 0;
        if (typeof closest.disputeScore !== 'number') closest.disputeScore = 0;
        if (!closest.voters || !Array.isArray(closest.voters)) closest.voters = [];
        
        if (!closest.voters.includes(username)) {
            closest.voters.push(username);
            if (type === 'confirm') closest.confirmScore += voterScore;
            else closest.disputeScore += voterScore;
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
            res.json({ message: 'Vote recorded' });
        } else {
            res.status(400).json({ error: 'Already voted' });
        }
    } else {
        res.status(404).json({ error: 'Station not found' });
    }
});

// GET /api/prices - Retrieve all submissions
app.get('/api/prices', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json(data);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});