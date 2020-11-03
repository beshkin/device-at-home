const express = require('express');
const app = express();
const helperBluetooth = require('./Helpers/Bluetooth')
const helperNetwork = require('./Helpers/Network')
app.use(express.json());

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.get('/bluetooth', function (req, res) {
    (async () => {
        const devices = await helperBluetooth.getDevices();
        res.send({'devices': devices});
    })();
})

app.get('/network', function (req, res) {

    (async () => {
        const devices = await helperNetwork.getDevices();
        res.send({'devices': devices});
    })();

})

app.listen(8002, function () {
    console.log('Listening to Port 8002');
});

