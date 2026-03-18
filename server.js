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
    const { stationName, prices, timestamp, username } = req.body;
    if (!stationName || !prices || !timestamp || !username) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    data.push({ stationName, prices, timestamp, username, confirmScore: 0, disputeScore: 0, voters: [] });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    
    res.json({ message: 'Price submitted successfully' });
});

// POST /api/vote - Handle confirm/dispute votes with weighted scores
app.post('/api/vote', (req, res) => {
    console.log('Vote request:', req.body);
    const { stationName, type, username } = req.body;
    if (!stationName || !['confirm', 'dispute'].includes(type) || !username) {
        return res.status(400).json({ error: 'Invalid request' });
    }
    
    let users;
    try {
        users = JSON.parse(fs.readFileSync(USERS_FILE));
    } catch (e) {
        console.error('Error parsing users file:', e);
        return res.status(500).json({ error: 'Server error' });
    }
    
    const voterScore = users[username]?.score || 1;
    
    let data;
    try {
        data = JSON.parse(fs.readFileSync(DATA_FILE));
    } catch (e) {
        console.error('Error parsing data file:', e);
        return res.status(500).json({ error: 'Server error' });
    }
    
    const latest = data.filter(sub => typeof sub === 'object' && sub && sub.stationName && sub.stationName.toLowerCase().trim() === stationName.toLowerCase().trim()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    console.log('Latest submission found:', !!latest);
    console.log('Latest type:', typeof latest, 'Latest:', latest);
    
    if (latest) {
        // Initialize missing fields for backward compatibility
        if (typeof latest.confirmScore !== 'number') latest.confirmScore = 0;
        if (typeof latest.disputeScore !== 'number') latest.disputeScore = 0;
        if (!latest.voters || !Array.isArray(latest.voters)) latest.voters = [];
        
        console.log('Voters array:', latest.voters);
        console.log('Username in voters:', latest.voters.includes(username));
        
        if (!latest.voters.includes(username)) {
            latest.voters.push(username);
            if (type === 'confirm') latest.confirmScore += voterScore;
            else latest.disputeScore += voterScore;
            
            try {
                fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
                res.json({ message: 'Vote recorded' });
            } catch (e) {
                console.error('Error writing data file:', e);
                res.status(500).json({ error: 'Server error' });
            }
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