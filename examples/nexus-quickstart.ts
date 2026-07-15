/**
 * NEXUS SDK Quick Start Example
 *
 * Demonstrates basic NEXUS operations for Production Coach
 */

// Note: This is example code - won't run without full NEXUS setup
// See: https://developer.audiotool.com/js-package-documentation/

import { createOfflineDocument } from '@audiotool/nexus';

// Create an offline document for testing (no backend connection needed)
const doc = createOfflineDocument();

// Example: Create a synth
function createSynth(name: string) {
  doc.transact((t) => {
    t.create('heisenberg', {
      displayName: name,
      positionX: 200,
      positionY: 100,
    });
  });
}

// Example: Create drums and connect to mixer
function createDrums(name: string) {
  doc.transact((t) => {
    const drums = t.create('beatbox8', {
      displayName: name,
      positionX: 100,
      positionY: 200,
    });

    // Get mixer reference and connect
    // const mixer = doc.queryEntities.ofTypes('centroid').first();
    // if (mixer) {
    //   t.create('desktopAudioCable', {
    //     fromSocket: drums.outputSocket,
    //     toSocket: mixer.inputSocket,
    //   });
    // }
  });
}

// Example: Query all devices in session
function getDevices() {
  const devices = doc.nexus.queryEntities
    .ofTypes('beatbox8', 'beatbox9', 'machiniste', 'heisenberg', 'pulverisateur', 'bassline')
    .get();

  return devices.map((d) => ({
    type: d.type,
    name: d.displayName,
  }));
}

// Example: Create a note track for a device
function createNoteTrack(deviceId: string) {
  doc.transact((t) => {
    t.create('noteTrack', {
      device: deviceId,
      orderAmongTracks: 0,
    });
  });
}

// Run examples
console.log('NEXUS Quick Start Examples');
console.log('===========================');

createSynth('Lead Synth');
createDrums('Main Drums');

console.log('Devices:', getDevices());
