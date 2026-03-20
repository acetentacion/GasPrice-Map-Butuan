const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// MongoDB connection
mongoose.connect('mongodb+srv://edgieace_db_user:Wildflowers-01@cluster0.w6ycdks.mongodb.net/gasprice?retryWrites=true&w=majority')
    .then(() => {
        console.log('MongoDB connected!');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            'https://gasfinderbxu.netlify.app',
            'https://gasfinderbxu.onrender.com'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files from current directory

// MongoDB Schemas
const PriceSchema = new mongoose.Schema({
    stationName: String,
    prices: {
        diesel: Number,
        u91: Number,
        u95: Number
    },
    timestamp: String,
    username: String,
    lat: Number,
    lng: Number,
    confirmScore: Number,
    disputeScore: Number,
    voters: [String],
    approved: Boolean,
    photoUrl: String,
    flagged: Boolean
});
const Price = mongoose.model('Price', PriceSchema);

const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    score: Number,
    isAdmin: Boolean
});
const User = mongoose.model('User', UserSchema);

const StationSchema = new mongoose.Schema({
    name: String,
    lat: Number,
    lng: Number,
    brand: String
});
const Station = mongoose.model('Station', StationSchema);

// POST /api/register - Register a new user
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    const existing = await User.findOne({ username });
    if (existing) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashedPassword, score: 1 });
    res.json({ message: 'Registration successful' });
});

// POST /api/login - Login user
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ message: 'Login successful', username });
});

// POST /api/prices - Store submitted prices
app.post('/api/prices', upload.single('photo'), async (req, res) => {
    const { stationName, diesel, u91, u95, timestamp, username, lat, lng } = req.body;
    if (!stationName || !diesel || !u91 || !u95 || !timestamp || !username || lat == null || lng == null) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    let photoUrl = null;
    if (req.file) {
        photoUrl = '/uploads/' + req.file.filename;
    }
    const price = new Price({
        stationName,
        prices: { diesel: parseFloat(diesel), u91: parseFloat(u91), u95: parseFloat(u95) },
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
    await price.save();
    res.json({ message: 'Price submitted successfully, pending admin approval.' });
});

// Serve uploaded photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve logo folder
app.use('/logos', express.static(path.join(__dirname, 'logos')));

// POST /api/vote - Handle confirm/dispute votes with weighted scores
app.post('/api/vote', async (req, res) => {
    const { stationName, type, username, lat, lng } = req.body;
    if (!stationName || !['confirm', 'dispute'].includes(type) || !username || lat == null || lng == null) {
        return res.status(400).json({ error: 'Invalid request' });
    }
    const user = await User.findOne({ username });
    const voterScore = user?.score || 1;

    // Find the closest matching submission within ~1 km
    const submissions = await Price.find({ stationName: new RegExp(`^${stationName}$`, 'i') });
    let closest = null;
    let minDistance = Infinity;
    submissions.forEach(sub => {
        const distance = Math.sqrt((sub.lat - lat) ** 2 + (sub.lng - lng) ** 2) * 111;
        if (distance < 1 && distance < minDistance) {
            minDistance = distance;
            closest = sub;
        }
    });

    if (closest) {
        if (!closest.voters) closest.voters = [];
        if (!closest.confirmScore) closest.confirmScore = 0;
        if (!closest.disputeScore) closest.disputeScore = 0;

        if (!closest.voters.includes(username)) {
            closest.voters.push(username);
            if (type === 'confirm') {
                closest.confirmScore += voterScore;
                await User.updateOne({ username: closest.username }, { $inc: { score: 1 } });
            } else {
                closest.disputeScore += voterScore;
                await User.updateOne({ username: closest.username }, { $inc: { score: -1 } });
            }
            await closest.save();
            res.json({ message: 'Vote recorded' });
        } else {
            res.status(400).json({ error: 'Already voted' });
        }
    } else {
        res.status(404).json({ error: 'Station not found' });
    }
});

// POST /api/flag-price - Admin flags a price as fake/disputed
app.post('/api/flag-price', async (req, res) => {
    const { stationName, lat, lng, adminUsername } = req.body;
    const admin = await User.findOne({ username: adminUsername });
    if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: 'Admin privileges required' });
    }
    const price = await Price.findOne({
        stationName: new RegExp(`^${stationName}$`, 'i'),
        lat: parseFloat(lat),
        lng: parseFloat(lng)
    });
    if (price) {
        price.flagged = true;
        await price.save();
        res.json({ message: 'Price flagged as fake/disputed.' });
    } else {
        res.status(404).json({ error: 'Submission not found.' });
    }
});

// POST /api/remove-price - Admin removes a price submission
app.post('/api/remove-price', async (req, res) => {
    const { stationName, lat, lng, adminUsername } = req.body;
    const admin = await User.findOne({ username: adminUsername });
    if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: 'Admin privileges required' });
    }
    const result = await Price.deleteOne({
        stationName: new RegExp(`^${stationName}$`, 'i'),
        lat: parseFloat(lat),
        lng: parseFloat(lng)
    });
    if (result.deletedCount > 0) {
        res.json({ message: 'Price submission removed.' });
    } else {
        res.status(404).json({ error: 'Submission not found.' });
    }
});

// POST /api/approve-price - Approve a submission
app.post('/api/approve-price', async (req, res) => {
    const { stationName, lat, lng, adminUsername } = req.body;
    const admin = await User.findOne({ username: adminUsername });
    if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: 'Admin privileges required' });
    }
    const price = await Price.findOne({
        stationName: new RegExp(`^${stationName}$`, 'i'),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        approved: false
    });
    if (price) {
        price.approved = true;
        await price.save();
        res.json({ message: 'Submission approved.' });
    } else {
        res.status(404).json({ error: 'Pending submission not found.' });
    }
});

// POST /api/reject-price - Reject (delete) a submission
app.post('/api/reject-price', async (req, res) => {
    const { stationName, lat, lng, adminUsername } = req.body;
    const admin = await User.findOne({ username: adminUsername });
    if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: 'Admin privileges required' });
    }
    const result = await Price.deleteOne({
        stationName: new RegExp(`^${stationName}$`, 'i'),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        approved: false
    });
    if (result.deletedCount > 0) {
        res.json({ message: 'Submission rejected and removed.' });
    } else {
        res.status(404).json({ error: 'Pending submission not found.' });
    }
});

// GET /api/prices - Retrieve all submissions
app.get('/api/prices', async (req, res) => {
    const { stationName, minPrice, maxPrice, fuelType, approved } = req.query;
    const filter = {};

    // Filter by station name (partial, case-insensitive)
    if (stationName) {
        filter.stationName = { $regex: stationName, $options: 'i' };
    }

    // By default, only show approved submissions unless explicitly requesting pending or all
    if (typeof approved === 'undefined') {
        filter.approved = true;
    } else if (approved === 'true') {
        filter.approved = true;
    } else if (approved === 'false') {
        filter.approved = false;
    }

    // Filter by price range for a specific fuel type
    if (fuelType && (minPrice || maxPrice)) {
        filter[`prices.${fuelType}`] = {};
        if (minPrice) filter[`prices.${fuelType}`].$gte = parseFloat(minPrice);
        if (maxPrice) filter[`prices.${fuelType}`].$lte = parseFloat(maxPrice);
    }

    // Get all matching submissions
    const all = await Price.find(filter).sort({ timestamp: -1 });

    // Only keep the latest per station (by name+lat+lng)
    const unique = [];
    const seen = new Set();
    for (const sub of all) {
        const key = `${sub.stationName.toLowerCase().trim()}_${sub.lat}_${sub.lng}`;
        if (!seen.has(key)) {
            unique.push(sub);
            seen.add(key);
        }
    }

    res.json(unique);
});

// GET /api/user-score - Retrieve user score
app.get('/api/user-score', async (req, res) => {
    const username = req.query.username;
    const user = await User.findOne({ username });
    res.json({ score: user?.score || 1, isAdmin: !!user?.isAdmin });
});

// GET /api/user-submissions - Retrieve submissions by a specific user
app.get('/api/user-submissions', async (req, res) => {
    const username = req.query.username;
    const submissions = await Price.find({ username });
    res.json(submissions);
});

// GET /api/station-names?query=sh
app.get('/api/station-names', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.json([]);
    // Find distinct station names that match the query (case-insensitive, partial)
    const names = await Price.distinct('stationName', { stationName: { $regex: query, $options: 'i' } });
    // Optionally, sort and limit results
    res.json(names.slice(0, 10));
});

// GET /api/station-suggestions?query=Sh
app.get('/api/station-suggestions', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.json([]);
    const centerLat = 8.9475;
    const centerLng = 125.5406;
    const radiusKm = 15;

    const stations = await Station.aggregate([
        { $match: { 
            name: { $regex: query, $options: 'i' },
            lat: { $exists: true },
            lng: { $exists: true }
        }},
        { $addFields: {
            distance: {
                $multiply: [
                    { $sqrt: { $add: [
                        { $pow: [{ $subtract: ["$lat", centerLat] }, 2] },
                        { $pow: [{ $subtract: ["$lng", centerLng] }, 2] }
                    ]}},
                    111
                ]
            }
        }},
        { $match: { distance: { $lte: radiusKm } } },
        { $limit: 10 }
    ]);
    res.json(stations.map(s => ({
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        brand: s.brand
    })));
});

// GET /api/user-rankings
app.get('/api/user-rankings', async (req, res) => {
    const users = await User.find({}, { username: 1, score: 1, isAdmin: 1, _id: 0 }).sort({ score: -1 });
    // Assign badge/rank based on score
    const ranked = users.map(u => {
        let badge = 'Newbie';
        if (u.score >= 100) badge = 'Legend';
        else if (u.score >= 50) badge = 'Expert';
        else if (u.score >= 20) badge = 'Trusted';
        else if (u.score >= 5) badge = 'Contributor';
        return { ...u.toObject(), badge };
    });
    res.json(ranked);
});

// GET /api/station-rankings - Get stations ranked by lowest prices
app.get('/api/station-rankings', async (req, res) => {
    const { fuelType = 'diesel', limit = 10 } = req.query;
    
    try {
        // Get all approved submissions
        const submissions = await Price.find({ approved: true })
            .sort({ timestamp: -1 });
        
        // Group by station name and get the latest submission for each station
        const stationMap = new Map();
        submissions.forEach(sub => {
            const key = sub.stationName.toLowerCase().trim();
            if (!stationMap.has(key) || new Date(sub.timestamp) > new Date(stationMap.get(key).timestamp)) {
                stationMap.set(key, sub);
            }
        });
        
        // Convert to array and filter out stations without the requested fuel type
        const stations = Array.from(stationMap.values())
            .filter(sub => sub.prices && typeof sub.prices[fuelType] === 'number')
            .map(sub => ({
                stationName: sub.stationName,
                brand: sub.brand || 'Unknown',
                prices: sub.prices,
                lat: sub.lat,
                lng: sub.lng,
                price: sub.prices[fuelType],
                timestamp: sub.timestamp,
                username: sub.username
            }));
        
        // Sort by price (lowest first) and limit results
        const rankedStations = stations
            .sort((a, b) => a.price - b.price)
            .slice(0, parseInt(limit));
        
        res.json({
            fuelType,
            rankings: rankedStations,
            totalStations: stations.length
        });
    } catch (error) {
        console.error('Error fetching station rankings:', error);
        res.status(500).json({ error: 'Failed to fetch station rankings' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

