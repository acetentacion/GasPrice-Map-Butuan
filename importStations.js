const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://edgieace_db_user:Wildflowers-01@cluster0.w6ycdks.mongodb.net/gasprice?retryWrites=true&w=majority'); // Adjust as needed

const Station = mongoose.model('Station', new mongoose.Schema({
    name: String,
    lat: Number,
    lng: Number,
    brand: String
}));

const query = `
[out:json][timeout:120];
node["amenity"="fuel"](8.78833,125.37694,9.10833,125.69694);
out body;
`;

fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'text/plain' }
})
.then(async res => {
    const text = await res.text();
    try {
        const data = JSON.parse(text);
        for (const s of data.elements) {
            const name = s.tags && s.tags.name ? s.tags.name : "Gas Station";
            const brand = s.tags && (s.tags.brand || s.tags.operator) ? (s.tags.brand || s.tags.operator) : "";
            const exists = await Station.findOne({ name, lat: s.lat, lng: s.lon });
            if (!exists) {
                await Station.create({
                    name,
                    lat: s.lat,
                    lng: s.lon,
                    brand
                });
            }
        }
        console.log('Import complete!');
    } catch (e) {
        console.error('Overpass API did not return JSON:', text);
    }
    mongoose.disconnect();
});