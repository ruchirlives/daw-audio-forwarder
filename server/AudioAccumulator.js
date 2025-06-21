class AudioAccumulator {
    constructor(frameSize = 960, channels = 2) {
        this.frameSize = frameSize;
        this.channels = channels;
        this.targetSamples = frameSize * channels;
        this.buffer = new Float32Array(this.targetSamples * 2); // double-size scratch
        this.offset = 0;
    }

    addSamples(samples) {
        const toCopy = Math.min(samples.length, this.buffer.length - this.offset);
        this.buffer.set(samples.subarray(0, toCopy), this.offset);
        this.offset += toCopy;

        const frames = [];

        while (this.offset >= this.targetSamples) {
            const frame = this.buffer.slice(0, this.targetSamples);
            frames.push(frame);

            // Shift remainder
            const leftover = this.buffer.slice(this.targetSamples, this.offset);
            this.buffer.set(leftover, 0);
            this.offset -= this.targetSamples;
        }

        return frames;
    }
}
exports.AudioAccumulator = AudioAccumulator;
