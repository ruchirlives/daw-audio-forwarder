# DAW Audio Forwarder

## Overview

**DAW Audio Forwarder** is a Node.js application that forwards real-time audio streams using [mediasoup](https://mediasoup.org/) for WebRTC-based media transport. It allows low-latency audio streaming from a server (e.g., DAW or JUCE app) to browser clients, ideal for collaborative music production, remote listening, or audio sharing scenarios.

## Features

- Real-time audio forwarding using mediasoup
- WebRTC signaling and transport
- Simple web client for connecting and streaming audio
- Express-based server with Socket.IO for signaling
- Cross-platform support

## Project Structure

```
.
├── package.json
├── README
├── server.js
├── start-server.bat
├── server
    ├── AudioAccumulator.js
    ├── initializeWebRTC.js
└── public/
    ├── client.html
    └── mediasoup-client.umd.js # Custom-built UMD bundle of mediasoup-client
```

- `server.js`: Main server entry point, sets up mediasoup and signaling.
- `AudioAccumulator.js`: Handles audio data accumulation.
- `initializeWebRTC.js`: WebRTC setup logic.
- `public/client.html`: Web client for connecting and streaming audio.
- `public/mediasoup-client.umd.js`: Mediasoup client library (browser).
- `build/Orch/`: (Purpose depends on your build process.)
- `mediasoup-server.exe`, `MediaSoupServer.lnk`, `start-server.bat`: Windows-specific server launchers/utilities.

## Installation

1. Clone the repository.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the server:
   ```sh
   node server.js
   ```
   Or use `start-server.bat` on Windows.

4. Open `public/client.html` in your browser to connect.

## Dependencies

- mediasoup
- mediasoup-client
- express
- socket.io
- @discordjs/opus
- wrtc

## Usage

1. Start the server.
2. Open the client in a browser.
3. Follow on-screen instructions to join or forward audio streams.

## License

This project is licensed under the ISC License.

🔐 mediasoup-client.umd.js
The UMD bundle of mediasoup-client in public/mediasoup-client.umd.js was built using Rollup for browser use. It includes the required license header and complies with the ISC license of the original mediasoup-client project.

---
