const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'prices.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

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
app.post('/api/prices', upload.single('photo'), (req, res) => {
    const { stationName, diesel, u91, u95, timestamp, username, lat, lng } = req.body;
    if (!stationName || !diesel || !u91 || !u95 || !timestamp || !username || lat == null || lng == null) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    const prices = { diesel: parseFloat(diesel), u91: parseFloat(u91), u95: parseFloat(u95) };
    let photoUrl = null;
    if (req.file) {
        photoUrl = '/uploads/' + req.file.filename;
    }
    data.push({
        stationName,
        prices,
        timestamp,
        username,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        confirmScore: 0,
        disputeScore: 0,
        voters: [],
        approved: false,
        photoUrl
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ message: 'Price submitted successfully, pending admin approval.' });
});

// Serve uploaded photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// When a price is confirmed/disputed, update the user's score
function updateUserScore(username, delta) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    if (!users[username]) users[username] = { password: '', score: 1 };
    users[username].score = (users[username].score || 1) + delta;
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

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
            if (type === 'confirm') {
                closest.confirmScore += voterScore;
                updateUserScore(closest.username, 1); // Increase score for submitter
            } else {
                closest.disputeScore += voterScore;
                updateUserScore(closest.username, -1); // Decrease score for submitter
            }
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
            res.json({ message: 'Vote recorded' });
        } else {
            res.status(400).json({ error: 'Already voted' });
        }
    } else {
        res.status(404).json({ error: 'Station not found' });
    }
});

// POST /api/flag-price - Admin flags a price as fake/disputed
app.post('/api/flag-price', (req, res) => {
    const { stationName, lat, lng, adminUsername } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    if (!users[adminUsername] || !users[adminUsername].isAdmin) {
        return res.status(403).json({ error: 'Admin privileges required' });
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    let flagged = false;
    data.forEach(sub => {
        if (
            sub.stationName.toLowerCase().trim() === stationName.toLowerCase().trim() &&
            Math.abs(sub.lat - lat) < 0.001 &&
            Math.abs(sub.lng - lng) < 0.001
        ) {
            sub.flagged = true;
            flagged = true;
        }
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    if (flagged) {
        res.json({ message: 'Price flagged as fake/disputed.' });
    } else {
        res.status(404).json({ error: 'Submission not found.' });
    }
});

// POST /api/remove-price - Admin removes a price submission
app.post('/api/remove-price', (req, res) => {
    const { stationName, lat, lng, adminUsername } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    if (!users[adminUsername] || !users[adminUsername].isAdmin) {
        return res.status(403).json({ error: 'Admin privileges required' });
    }

    let data = JSON.parse(fs.readFileSync(DATA_FILE));
    const initialLength = data.length;
    data = data.filter(sub =>
        !(
            sub.stationName.toLowerCase().trim() === stationName.toLowerCase().trim() &&
            Math.abs(sub.lat - lat) < 0.001 &&
            Math.abs(sub.lng - lng) < 0.001
        )
    );
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    if (data.length < initialLength) {
        res.json({ message: 'Price submission removed.' });
    } else {
        res.status(404).json({ error: 'Submission not found.' });
    }
});

// Approve a submission
app.post('/api/approve-price', (req, res) => {
    const { stationName, lat, lng, adminUsername } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    if (!users[adminUsername] || !users[adminUsername].isAdmin) {
        return res.status(403).json({ error: 'Admin privileges required' });
    }
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    let found = false;
    data.forEach(sub => {
        if (
            sub.stationName.toLowerCase().trim() === stationName.toLowerCase().trim() &&
            Math.abs(sub.lat - lat) < 0.001 &&
            Math.abs(sub.lng - lng) < 0.001 &&
            !sub.approved
        ) {
            sub.approved = true;
            found = true;
        }
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    if (found) {
        res.json({ message: 'Submission approved.' });
    } else {
        res.status(404).json({ error: 'Pending submission not found.' });
    }
});

// Reject (delete) a submission
app.post('/api/reject-price', (req, res) => {
    const { stationName, lat, lng, adminUsername } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    if (!users[adminUsername] || !users[adminUsername].isAdmin) {
        return res.status(403).json({ error: 'Admin privileges required' });
    }
    let data = JSON.parse(fs.readFileSync(DATA_FILE));
    const initialLength = data.length;
    data = data.filter(sub =>
        !(
            sub.stationName.toLowerCase().trim() === stationName.toLowerCase().trim() &&
            Math.abs(sub.lat - lat) < 0.001 &&
            Math.abs(sub.lng - lng) < 0.001 &&
            !sub.approved
        )
    );
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    if (data.length < initialLength) {
        res.json({ message: 'Submission rejected and removed.' });
    } else {
        res.status(404).json({ error: 'Pending submission not found.' });
    }
});

// GET /api/prices - Retrieve all submissions
app.get('/api/prices', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json(data);
});

// GET /api/user-score - Retrieve user score
app.get('/api/user-score', (req, res) => {
    const username = req.query.username;
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    res.json({ score: users[username]?.score || 1, isAdmin: !!users[username]?.isAdmin });
});

// GET /api/user-submissions - Retrieve submissions by a specific user
app.get('/api/user-submissions', (req, res) => {
    const username = req.query.username;
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    const submissions = data.filter(sub => sub.username === username);
    res.json(submissions);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

