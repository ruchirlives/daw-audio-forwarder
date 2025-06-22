// Replace hardcoded values with environment variables or defaults
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const ANNOUNCED_IP = process.env.ANNOUNCED_IP || '192.168.0.3';

const INSTRUMENT_PATH = process.env.INSTRUMENT_PATH || path.join(__dirname, '..', 'instruments');

const express = require('express');
const http = require('http');

const { SQLiteHandler } = require('./server/sqliteHandler'); // <-- Add this line here
const { setupMediasoup } = require('./server/mediasoupHandler'); // <-- Already present

const app = express();
const server = http.createServer(app);

app.use(express.static('public'));
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

// Initialize Mediasoup
(async () => {(await setupMediasoup({ANNOUNCED_IP, server, app,}));})();

