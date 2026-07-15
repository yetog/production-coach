/**
 * Audiotool Device Reference
 *
 * All devices available via NEXUS SDK with their
 * primary parameters and use cases.
 */

export const DEVICE_CATEGORIES = {
  drums: ['beatbox8', 'beatbox9', 'machiniste'],
  synths: ['heisenberg', 'pulverisateur', 'gakki', 'space'],
  bass: ['bassline'],
  sequencers: ['tonematrix', 'rasselbock'],
  effects: {
    delay: ['stompboxDelay'],
    reverb: ['quasar', 'space'],
    distortion: ['waveshaper'],
    eq: ['curve', 'parametricEq'],
    dynamics: ['gravity', 'quantum'],
  },
  routing: ['centroid', 'kobolt', 'minimixer', 'splitter', 'merger', 'bandSplitter'],
};

export const DEVICE_INFO: Record<string, { name: string; category: string; description: string }> = {
  // Drum Machines
  beatbox8: {
    name: 'Beatbox 8',
    category: 'drums',
    description: 'Classic 8-pad drum machine',
  },
  beatbox9: {
    name: 'Beatbox 9',
    category: 'drums',
    description: 'Analog-style 9-pad drum machine',
  },
  machiniste: {
    name: 'Machiniste',
    category: 'drums',
    description: 'Full-featured multi-channel sampler',
  },

  // Synthesizers
  heisenberg: {
    name: 'Heisenberg',
    category: 'synth',
    description: 'Main synth with filter and envelopes',
  },
  pulverisateur: {
    name: 'Pulverisateur',
    category: 'synth',
    description: 'Aggressive synth with LFO',
  },
  bassline: {
    name: 'Bassline',
    category: 'bass',
    description: 'Dedicated bass synthesizer',
  },
  gakki: {
    name: 'Gakki',
    category: 'synth',
    description: 'Multi-instrument synth/sampler',
  },
  space: {
    name: 'Space',
    category: 'synth',
    description: 'Pad synth with reverb/delay',
  },
  tonematrix: {
    name: 'Tonematrix',
    category: 'sequencer',
    description: 'Visual grid sequencer/synth',
  },

  // Effects
  stompboxDelay: {
    name: 'Stompbox Delay',
    category: 'effect',
    description: 'Delay with feedback and mix controls',
  },
  quasar: {
    name: 'Quasar',
    category: 'effect',
    description: 'Plate reverb with decay control',
  },
  waveshaper: {
    name: 'Waveshaper',
    category: 'effect',
    description: 'Distortion/saturation effect',
  },
  gravity: {
    name: 'Gravity',
    category: 'effect',
    description: 'Compressor for dynamics control',
  },

  // Mixers
  centroid: {
    name: 'Centroid',
    category: 'mixer',
    description: 'Main mixer with channel management',
  },
};

export function getDevicesByCategory(category: keyof typeof DEVICE_CATEGORIES): string[] {
  const devices = DEVICE_CATEGORIES[category];
  if (Array.isArray(devices)) {
    return devices;
  }
  // For nested categories like effects
  return Object.values(devices).flat();
}

export function isDrumMachine(deviceType: string): boolean {
  return DEVICE_CATEGORIES.drums.includes(deviceType);
}

export function isSynth(deviceType: string): boolean {
  return DEVICE_CATEGORIES.synths.includes(deviceType);
}

export function isBass(deviceType: string): boolean {
  return DEVICE_CATEGORIES.bass.includes(deviceType);
}
