
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mediasoup = require('mediasoup');
const dgram = require('dgram');
const { AudioAccumulator } = require('./server/AudioAccumulator');
const { OpusEncoder } = require('@discordjs/opus');
const { initializeWebRTC } = require('./server/initializeWebRTC');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
const PORT = 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));



let worker, router, transport, producer;

(async () => {
    // 1) Setup mediasoup
    worker = await mediasoup.createWorker();
    router = await worker.createRouter({
        mediaCodecs: [{
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2,
            preferredPayloadType: 100
        }]
    });

    transport = await router.createPlainTransport({
        listenIp: { ip: '0.0.0.0', announcedIp: '192.168.0.3' }, // Replace with your actual LAN IP
        comedia: true,
        rtcpMux: false,
    });




    // 2) Setup UDP listener from JUCE
    const udpSocket = dgram.createSocket('udp4');
    const accumulator = new AudioAccumulator(960, 2);
    const encoder = new OpusEncoder(48000, 2);
    const inputPort = 10000;

    // Bind the UDP socket to the input port
    const rtpSocket = dgram.createSocket('udp4');
    const ssrc = 111111; // Match your Mediasoup producer SSRC
    let transportPort;


    // After transport is created
    producer = await transport.produce({
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
        traceEventTypes: ['rtp']  // ✅ MUST be here
    });

    producer.on('score', (score) => {
        console.log('📈 Producer score:', score);
    });

    console.log('✅ Producer created:', producer.id);
    // console.log('🧪 Producer dump:', await producer.dump());

    // Delay to let mediasoup populate transport.tuple
    setTimeout(() => {
        if (transport.tuple) {
            transportPort = transport.tuple.localPort;
            console.log('🎯 Mediasoup listening on port', transportPort);
        } else {
            console.warn('❌ transport.tuple is still undefined');
        }
    }, 500);



    // Ensure the UDP socket can be reused
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

                // console.log(`🔊 Sending RTP packet: Seq=${sequenceNumber - 1} TS=${timestamp} SSRC=${ssrc} Size=${rtpPacket.length}`);

                if (rtpSocket && transportPort) {
                    rtpSocket.send(rtpPacket, 0, rtpPacket.length, transportPort, '127.0.0.1');
                    // console.log(`📦 Sent RTP packet to Mediasoup on port ${transportPort}`);

                }

            } catch (err) {
                console.error('❌ Opus encode failed:', err);
            }
        }
    });

    udpSocket.bind(inputPort, () => {
        console.log(`🔊 Listening for PCM on UDP port ${inputPort}`);
    });

    // 3) Browser signalling
    initializeWebRTC(io, router, () => producer);

})();

function decodePCM(buffer) {
    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
    const float32 = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
        float32[i] = samples[i] / 32768;
    }
    return float32;
}

function createRtpPacket(payload, sequenceNumber, timestamp, ssrc) {
    const payloadType = 100; // match with mediasoup


    const packet = Buffer.alloc(12 + payload.length);

    // RTP header (12 bytes)
    packet[0] = 0x80; // Version 2
    packet[1] = 0x80 | payloadType;  // marker bit 0, payloadType = 100
    packet.writeUInt16BE(sequenceNumber % 65536, 2);
    packet.writeUInt32BE(timestamp, 4);
    packet.writeUInt32BE(ssrc, 8);

    // Payload
    payload.copy(packet, 12);

    return packet;
}

function float32ToInt16(float32) {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
        let s = float32[i];
        s = Math.max(-1, Math.min(1, s)); // Clamp between -1 and 1
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
}
