// initializeWebRTC.js
function initializeWebRTC(io, router, getProducer, ANNOUNCED_IP) {
    io.on('connection', async (socket) => {
        console.log("📡 Browser connected");

        // 1) Send router RTP capabilities
        socket.on('getRtpCapabilities', () => {
            socket.emit('rtpCapabilities', router.rtpCapabilities);
        });

        // 2) Create a WebRTC transport for this client
        socket.on('createClientTransport', async () => {
            const transport = await router.createWebRtcTransport({
                listenIps: [{ ip: '0.0.0.0', announcedIp: ANNOUNCED_IP }], // <-- your PC's LAN IP
                enableUdp: true,
                enableTcp: true,
                preferUdp: true,
                portRange: { min: 40000, max: 41000 }
            });

            socket.emit('clientTransportCreated', {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters
            });

            // 3) Connect it when client supplies DTLS params
            socket.on('connectWebRtcTransport', async ({ dtlsParameters }) => {
                try {
                    await transport.connect({ dtlsParameters });
                    console.log("✅ WebRTC transport connected");
                } catch (err) {
                    console.error("❌ WebRTC transport connect failed:", err);
                }
            });

            // 4) Handle client’s consume request
            socket.on('consume', async ({ rtpCapabilities }) => {
                const producer = getProducer();
                if (!producer) {
                    console.warn("⏳ No producer available yet");
                    return;
                }

                if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
                    console.warn("❌ Client can't consume this stream");
                    return;
                }

                try {
                    const consumer = await transport.consume({
                        producerId: producer.id,
                        rtpCapabilities,
                        paused: false
                    });

                    socket.emit('consumed', {
                        id: consumer.id,
                        kind: consumer.kind,
                        rtpParameters: consumer.rtpParameters
                    });
                } catch (err) {
                    console.error("❌ Failed to consume:", err);
                }
            });
        });
    });
}

module.exports = { initializeWebRTC };
