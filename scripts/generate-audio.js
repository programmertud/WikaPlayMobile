const fs = require('fs');
const path = require('path');

function createWav(filePath, frequencies, duration = 0.8) {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 for Mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // PCM Samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (const freq of frequencies) {
      const envelope = Math.exp(-t * 3.5);
      sample += Math.sin(2 * Math.PI * freq * t) * envelope;
    }
    sample = sample / Math.max(1, frequencies.length);
    const intVal = Math.max(-32768, Math.min(32767, Math.floor(sample * 24000)));
    buffer.writeInt16LE(intVal, offset);
    offset += 2;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

const mobileAudioDir = path.join(__dirname, '..', 'assets', 'audio');
const backendAudioDir = path.join(__dirname, '..', 'wikaplay-api', 'public', 'audio');

// Streak audio files
const streakSounds = {
  'tama.mp3': [523.25, 659.25], // C5, E5
  'magaling.mp3': [523.25, 659.25, 783.99], // C5, E5, G5
  'anggalingmo.mp3': [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6
  'mali.mp3': [311.13, 293.66], // Low dissonance
  'oopsmali.mp3': [261.63, 246.94], // Low wobble
};

for (const [filename, freqs] of Object.entries(streakSounds)) {
  createWav(path.join(mobileAudioDir, filename), freqs, 0.7);
  createWav(path.join(backendAudioDir, filename), freqs, 0.7);
}

// Flashcard audio items
const flashcardItems = [
  'hayop_aso', 'hayop_pusa', 'hayop_ibon', 'hayop_kalabaw',
  'prutas_mangga', 'prutas_saging', 'prutas_pakwan', 'prutas_mansanas',
  'gulay_talong', 'gulay_kalabasa', 'gulay_sitaw', 'gulay_kamatis',
  'bilang_isa', 'bilang_dalawa', 'bilang_tatlo', 'bilang_apat',
  'hugis_bilog', 'hugis_parisukat', 'hugis_tatsulok', 'hugis_parihaba',
  'kulay_pula', 'kulay_asul', 'kulay_dilaw', 'kulay_berde',
  'katawan_mata', 'katawan_ilong', 'katawan_bibig', 'katawan_kamay',
  'pagbati_umaga', 'pagbati_salamat', 'pagbati_kamusta', 'pagbati_paalam',
];

flashcardItems.forEach((item, idx) => {
  const baseFreq = 440 + (idx * 15);
  createWav(path.join(mobileAudioDir, `${item}.mp3`), [baseFreq, baseFreq * 1.25], 0.9);
  createWav(path.join(backendAudioDir, `${item}.mp3`), [baseFreq, baseFreq * 1.25], 0.9);
});

console.log('GENERATED_AUDIO_SUCCESS');
