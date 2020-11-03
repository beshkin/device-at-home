const port = 9838,
    devices = [],
    socket = require('socket.io-client')('http://localhost:' + port);
btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();

const onFinishedFoundDevice = function (message) {
    // Add new device to object array
    if (typeof message.address !== 'undefined' && typeof message.name !== 'undefined')
        devices[message.address] = {'address': message.address, 'name': message.name};

    console.log("Sent new device", message);
};

const sendMessage = function (type, message, callback) {
    this.message = message;
    socket.emit(type, message);

    if (callback)
        callback(message);
};


const findBluetooths =function() {
    // Scan for BT devices in range
    btSerial.on('found', function (address, name) {
        if (typeof devices[address] === 'undefined') {
            const message = {'address': address, 'name': name}; // prepare message
            // sendMessage('add-device', message, onFinishedFoundDevice); // actually send message to server
            if (typeof message.address !== 'undefined' && typeof message.name !== 'undefined')
                devices.push({'address': message.address, 'name': message.name});
            console.log("Device Found: " + address + " which is named: " + name);
        }
    });

    // Keep searching
    btSerial.on('finished', function () {
        console.log("Received Finished.");
        setTimeout(function () {
            // btSerial.inquire();
            btSerial.close()
        }, 3000);
    });

    // Scan for devices
    console.log("Begin scanning");
    btSerial.inquire();
}

async function getDevices() {
    // Do the magic
    await findBluetooths();

    await new Promise((resolve) => {
        setTimeout(resolve, 20000);
    });

    return devices
}

module.exports.getDevices = getDevices