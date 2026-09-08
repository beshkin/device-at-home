const find = require('local-devices');
const nmap = require('libnmap');
const { promisify } = require('util');

const scan = promisify(nmap.scan);

// Limit how many nmap child processes run at once so repeated calls
// don't pile up and starve the host.
const MAX_CONCURRENCY = 4;
const SCAN_TIMEOUT = 15; // seconds, per host

async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let next = 0;

    async function run() {
        while (next < items.length) {
            const current = next++;
            results[current] = await worker(items[current]);
        }
    }

    const runners = [];
    for (let i = 0; i < Math.min(limit, items.length); i++) {
        runners.push(run());
    }
    await Promise.all(runners);
    return results;
}

// Enrich a device discovered via ARP with details from an nmap scan.
// Never throws: on any failure the base device info is returned unchanged.
async function enrich(device) {
    const enriched = { ip: device.ip, mac: device.mac, name: device.name };

    let report;
    try {
        report = await scan({ range: [device.ip], timeout: SCAN_TIMEOUT });
    } catch (err) {
        console.error('nmap scan failed for ' + device.ip + ': ' + err.message);
        return enriched;
    }

    for (const item in report) {
        const hosts = report[item].host;
        for (const indHost in hosts) {
            const host = hosts[indHost];

            for (const indAddress in host.address) {
                const address = host.address[indAddress];
                if (address.item.addrtype === 'ipv4') {
                    enriched.ip = address.item.addr;
                }
                if (address.item.addrtype === 'mac') {
                    enriched.mac = address.item.addr;
                    enriched.name = address.item.vendor || enriched.name;
                }
            }

            if (host.hostnames && host.hostnames[0] && host.hostnames[0] !== '\n') {
                try {
                    enriched.name = host.hostnames[0].hostname[0].item.name;
                } catch (_) {
                    // no hostname in report, keep what we have
                }
            }
        }
    }

    return enriched;
}

async function getDevices() {
    // local-devices pings the whole subnet and reads the ARP table itself,
    // so this repopulates on every call without any shared module state.
    let found;
    try {
        found = await find();
    } catch (err) {
        console.error('local-devices discovery failed: ' + err.message);
        return [];
    }

    return mapWithConcurrency(found, MAX_CONCURRENCY, enrich);
}

module.exports.getDevices = getDevices;
