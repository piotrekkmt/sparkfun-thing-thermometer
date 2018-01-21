'use strict';

const http = require('http'),
    fs = require('fs'),
    pathUtils = require('path'),
    express = require('express'),
    app = express(),
    PORT = process.env.PORT || 5000,
    appDir = pathUtils.resolve(__dirname, 'client');
let tempFilePath = 'tempFile.txt';

app.use(express.static(appDir));

app.post('/temperature/:temp', function(req, res) {
    let temperatura = req.params.temp;
    if (temperatura && !isNaN(temperatura)) {
        let now = new Date().toISOString();
        let dataLine = now + ' ' + temperatura + '\n';
        fs.appendFile(tempFilePath, dataLine, (err) => {
            if (err) throw err;
            console.log(now + ': Temperature ' + temperatura  + ' recorded.');
            res.status(200).json({status: 'OK', message: 'Saved temp ' + temperatura + ' to file at ' + now});
        });
    } else {
        console.error('ERR: Error missing or wrong parameter recording [temp]!');
        res.status(422).json({error: 'Missing required parameter [temp]'});
    }
});

app.get('/temperature/view', function(req, res) {
    fs.readFile(tempFilePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({error: 'Error opening temperature file.'});
            console.error('ERR: Error opening temperature file!');
        }
        data = data.replace(/\n/g, '<br>');
        res.status(200).send(data);
    });
});

app.get('/temperature', function(req, res) {
    fs.readFile(tempFilePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({error: 'Error opening temperature file.'});
            console.error('ERR: Error opening temperature file!');
        }
        res.status(200).send(data.toString());
    });
});


app.get('/', function(req, res) {
    res.sendfile(pathUtils.resolve(appDir, 'index.html'));
});

http.createServer(app).listen(PORT, function() {
    console.log('Thermometer server listening on port ' + PORT);
    console.log('http://localhost:' + PORT);
});