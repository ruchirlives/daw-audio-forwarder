const socketIo = require('socket.io');
const mediasoup = require('mediasoup');
const dgram = require('dgram');
const { AudioAccumulator } = require('./AudioAccumulator');
const { OpusEncoder } = require('@discordjs/opus');
const { initializeWebRTC } = require('./initializeWebRTC');

async function setupMediasoup({
    ANNOUNCED_IP,
    INPUT_PORT,
    server,
    app,
}) {
    // 1) Setup mediasoup
    const io = socketIo(server);
    const worker = await mediasoup.createWorker();
    const router = await worker.createRouter({
        mediaCodecs: [{
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2,
            preferredPayloadType: 100
        }]
    });

    const transport = await router.createPlainTransport({
        listenIp: { ip: '0.0.0.0', announcedIp: ANNOUNCED_IP },
        comedia: true,
        rtcpMux: false,
    });

    // 2) Setup UDP listener from JUCE
    const udpSocket = dgram.createSocket('udp4');
    const accumulator = new AudioAccumulator(960, 2);
    const encoder = new OpusEncoder(48000, 2);

    // Bind the UDP socket to the input port
    const rtpSocket = dgram.createSocket('udp4');
    const ssrc = 111111; // Match your Mediasoup producer SSRC
    let transportPort;

    // After transport is created
    const producer = await transport.produce({
        kind: 'audio',
        rtpParameters: {
            codecs: [{
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2,
                payloadType: 100
            }],
            encodings: [{ ssrc }]
        },
        traceEventTypes: ['rtp']
    });

    producer.on('score', (score) => {
        console.log('📈 Producer score:', score);
    });

    console.log('✅ Producer created:', producer.id);

    setTimeout(() => {
        if (transport.tuple) {
            transportPort = transport.tuple.localPort;
            console.log('🎯 Mediasoup listening on port', transportPort);
        } else {
            console.warn('❌ transport.tuple is still undefined');
        }
    }, 500);

    let sequenceNumber = 0;
    let timestamp = 0;

    udpSocket.on('message', (msg, rinfo) => {
        const samples = decodePCM(msg);
        const frames = accumulator.addSamples(samples);

        for (const frame of frames) {
            try {
                const int16Frame = float32ToInt16(frame);
                const opus = encoder.encode(int16Frame, 960);

                const rtpPacket = createRtpPacket(opus, sequenceNumber++, timestamp, ssrc);
                timestamp += 960; // 20ms at 48kHz

                if (rtpSocket && transportPort) {
                    rtpSocket.send(rtpPacket, 0, rtpPacket.length, transportPort, '127.0.0.1');
                }
            } catch (err) {
                console.error('❌ Opus encode failed:', err);
            }
        }
    });

    udpSocket.bind(INPUT_PORT, () => {
        console.log(`🔊 Listening for PCM on UDP port ${INPUT_PORT}`);
    });

    // 3) Browser signalling
    initializeWebRTC(io, router, () => producer, ANNOUNCED_IP);

    return { worker, router, transport, producer };
}

// Helper functions moved from server.js
function decodePCM(buffer) {
    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
    const float32 = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
        float32[i] = samples[i] / 32768;
    }
    return float32;
}

function createRtpPacket(payload, sequenceNumber, timestamp, ssrc) {
    const payloadType = 100;
    const packet = Buffer.alloc(12 + payload.length);
    packet[0] = 0x80;
    packet[1] = 0x80 | payloadType;
    packet.writeUInt16BE(sequenceNumber % 65536, 2);
    packet.writeUInt32BE(timestamp, 4);
    packet.writeUInt32BE(ssrc, 8);
    payload.copy(packet, 12);
    return packet;
}

function float32ToInt16(float32) {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
        let s = float32[i];
        s = Math.max(-1, Math.min(1, s));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
}

module.exports = {
    setupMediasoup
};