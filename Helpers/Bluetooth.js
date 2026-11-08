const { BluetoothSerialPort } = require('bluetooth-serial-port');

// On Linux the native inquiry runs for ~10s and then resolves each device's
// name one by one (each unreachable device can stall it for several seconds).
// All 'found' events are only emitted once that whole process is done, so we
// wait for 'finished' instead of guessing with a fixed sleep. This timeout is
// only a safety net in case the native side never reports back.
const SCAN_TIMEOUT_MS = 60000;

// The adapter can only run one inquiry at a time; a second concurrent one
// fails silently with zero results. Overlapping requests share this scan.
let inFlight = null;

function runInquiry() {
    return new Promise((resolve) => {
        // Fresh instance per scan so listeners never accumulate across calls.
        const bt = new BluetoothSerialPort();
        const found = new Map();

        bt.on('found', (address, name) => {
            if (address && !found.has(address)) {
                found.set(address, { mac: address, name: name || address });
                console.log('Device Found: ' + address + ' which is named: ' + name);
            }
        });

        bt.once('finished', () => {
            bt.removeAllListeners();
            resolve(Array.from(found.values()));
        });

        console.log('Begin scanning');
        try {
            bt.inquire();
        } catch (err) {
            console.error('Bluetooth inquiry failed: ' + err.message);
            bt.removeAllListeners();
            resolve([]);
        }
    });
}

function scan() {
    if (!inFlight) {
        inFlight = runInquiry().finally(() => {
            inFlight = null;
        });
    }
    return inFlight;
}

async function getDevices() {
    let timer;
    const timeout = new Promise((resolve) => {
        timer = setTimeout(() => {
            console.error('Bluetooth scan timed out after ' + SCAN_TIMEOUT_MS + 'ms');
            resolve([]);
        }, SCAN_TIMEOUT_MS);
    });

    try {
        return await Promise.race([scan(), timeout]);
    } finally {
        clearTimeout(timer);
    }
}

module.exports.getDevices = getDevices;
