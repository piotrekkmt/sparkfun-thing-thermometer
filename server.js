'use strict';

const http = require('http'),
    fs = require('fs'),
    config = require('./config.json'),
    request = require('request'),
    pathUtils = require('path'),
    express = require('express'),
    app = express(),
    PORT = process.env.PORT || 5000,
    appDir = pathUtils.resolve(__dirname, 'client');
let tempFilePath = '';
let stashedTempOutside = null;

function refreshTodaysFileName() {
    tempFilePath = 'temperature/' + new Date().toISOString().split('T')[0] + '.txt';
}

function refreshTempOutside() {
    getTempFromAPI().then((temp) => {
        stashedTempOutside = temp;
    }).catch((err) => {
        console.error('ERROR on getTempOutside:', err);
        stashedTempOutside = null;
    });
}

function getTempOutside() {
    const callMins = ['7', '15', '22', '30', '37', '45', '52', '59'];
    let currentMin = new Date().getMinutes().toString();
    if (!stashedTempOutside || callMins.indexOf(currentMin) > -1) {
        refreshTempOutside();
    }
    return stashedTempOutside;
}

function getTempFromAPI() {
    return new Promise((resolve, reject) => {
        const weatherPath = 'https://api.darksky.net/forecast/' +
        config.WEATHER_API_TOKEN + '/' + config.WEATHER_LAT_LONG + '?units=si&exclude=flags,hourly,minutely,daily';
        request(weatherPath, {json: true}, (error, response, body) => {
            if (error) {
                reject(error);
            } else {
                let currentTemp = body && body.currently && body.currently.temperature ?
                body.currently.temperature : null;
                console.log('currentTemp from API is:', currentTemp);
                stashedTempOutside = currentTemp;
                resolve(currentTemp);
            }
        });
    });
}

app.use(express.static(appDir));

app.post('/temperature/:temp', function(req, res) {
    refreshTodaysFileName();
    let outside = getTempOutside();
    let temperatura = req.params.temp;
    if (temperatura && !isNaN(temperatura)) {
        let now = new Date().toISOString();
        let dataLine = now + ' ' + temperatura + ' ' + outside + '\n';
        fs.appendFile(tempFilePath, dataLine, (err) => {
            if (err) throw err;
            console.log(now + ': Temperature ' + temperatura  + ' recorded. ' + 'Outside: ' + outside);
            res.status(200).json({status: 'OK', message: 'Saved temp ' + temperatura + ' to file at ' + now});
        });
    } else {
        console.error('ERR: Error missing or wrong parameter recording [temp]!');
        res.status(422).json({error: 'Missing required parameter [temp]'});
    }
});

app.get('/temperature/view', function(req, res) {
    refreshTodaysFileName();
    fs.readFile(tempFilePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({error: 'Error opening temperature file.'});
            console.error('ERR: Error opening temperature file!');
        } else {
            data = data.replace(/\n/g, '<br>');
            res.status(200).send(data);
        }
    });
});

app.get('/temperature/:day', function(req, res) {
    fs.readFile('temperature/' + req.params.day, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({error: 'Error opening temperature file. Files does not exist.'});
            console.error('ERR: Error opening temperature file!');
        } else {
            res.status(200).send(data.toString());
        }
    });
});

app.get('/temperature', function(req, res) {
    refreshTodaysFileName();
    fs.readFile(tempFilePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({error: 'Error opening temperature file. Recreating. Please refresh page.'});
            console.error('ERR: Error opening temperature file!');
            fs.closeSync(fs.openSync(tempFilePath, 'w'));
        } else {
            res.status(200).send(data.toString());
        }
    });
});

app.get('/days', function(req, res) {
    fs.readdir('temperature/', (err, files) => {
        if (err) {
            res.status(500).json({error: 'Error opening temperature folder.'});
            console.error('ERR: Error opening temperature folder!');
        } else {
            res.status(200).send(files);
        }
    });
});

app.get('/', function(req, res) {
    res.sendfile(pathUtils.resolve(appDir, 'index.html'));
});

http.createServer(app).listen(PORT, function() {
    console.log('Thermometer server listening on port ' + PORT);
    console.log('http://localhost:' + PORT);
    refreshTodaysFileName();
    getTempOutside();
});
