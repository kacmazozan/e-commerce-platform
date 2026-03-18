const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoint - çalışıyor mu diye kontrol
app.get('/', (req, res) => {
  res.json({ message: 'Backend çalışıyor!' });
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});