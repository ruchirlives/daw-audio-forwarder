// Replace hardcoded values with environment variables or defaults
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const ANNOUNCED_IP = process.env.ANNOUNCED_IP || '192.168.0.3';
const INPUT_PORT = process.env.INPUT_PORT || 10000;
const INSTRUMENT_PATH = process.env.INSTRUMENT_PATH || path.join(__dirname, '..', 'instruments');

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mediasoup = require('mediasoup');
const dgram = require('dgram');
const { AudioAccumulator } = require('./server/AudioAccumulator');
const { OpusEncoder } = require('@discordjs/opus');
const { initializeWebRTC } = require('./server/initializeWebRTC');
const { SQLiteHandler } = require('./server/sqliteHandler'); // <-- Add this line here
const { setupMediasoup } = require('./server/mediasoupHandler'); // <-- Already present

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

let worker, router, transport, producer;

// Move all mediasoup-related async logic into the new handler:
(async () => {
    ({ worker, router, transport, producer } = await setupMediasoup({
        ANNOUNCED_IP,
        AudioAccumulator,
        OpusEncoder,
        INPUT_PORT,
        app,
        io,
        initializeWebRTC,
        dgram
    }));
})();
