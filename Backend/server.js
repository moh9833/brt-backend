// Backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Routes import
const userRoutes = require('./src/routes/user');
const searchRoutes = require('./src/routes/search');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());

// 👈 यहाँ हमने cors() को खाली छोड़ दिया है, जिससे Blogger/Localhost सभी जगह से रिक्वेस्ट आ सकेगी और CORS का एरर कभी नहीं आएगा!
app.use(cors()); 

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'running' });
});

// API Routes
app.use('/api', userRoutes);
app.use('/api', searchRoutes);

// Server Start
app.listen(PORT, () => {
  console.log(`🚀 Brand Research Tool backend listening on port ${PORT}`);
});
