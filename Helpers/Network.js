const find = require('local-devices');
const nmap = require('libnmap')

let devices = [];

const findNetwork = function () {
    find().then(devicesFound => {
        devicesFound.forEach(function (device) {
            nmap.scan({
                range: [
                    device.ip
                ]
            }, function (err, report) {
                if (err) throw new Error(err);

                for (const item in report) {
                    const host = report[item].host;
                    for (const indHost in host) {
                        const item = host[indHost]
                        for (const indAddress in item.address) {

                            const address = item.address[indAddress]
                            if (address.item.addrtype === 'ipv4') {
                                device.ip = address.item.addr
                            }
                            if (address.item.addrtype === 'mac') {
                                device.mac = address.item.addr
                                device.name = address.item.vendor
                            }
                        }
                        if (item.hostnames[0] !== "\n") {
                            device.name = item.hostnames[0].hostname[0].item.name
                        }
                        devices.push(device)
                    }

                }
            })
        })
    })
}

async function getDevices() {
    // Do the magic
    await findNetwork();

    await new Promise((resolve) => {
        setTimeout(resolve, 20000);
    });

    return devices
}

module.exports.getDevices = getDevices