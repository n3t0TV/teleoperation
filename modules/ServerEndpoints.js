const express = require('express');
const app = express.Router();
const path = require('path');
const vehicleBridge = require('./VehicleBridge.js');
const cookieParser = require('cookie-parser');
const Cryptr = require('cryptr');
const session = require('express-session');
const SessionFileStore = require('session-file-store');

const textAnalytics = require('./textAnalytics.js');
vehicleBridge.updateCallback = textAnalytics.mqttCallback;
const cryptr = new Cryptr(process.env.CRYPTR_SEED);
//const tortopsBrdige = require('../../modules/TortopsBridge');
const mysqlJson = require('./Database.js');
//const argv = require('../../modules/Arguments.js')

const PUBLIC_HTML_PATH = ['../monitor/public_html'];
const PUBLIC_HTML_ABSOLUTE_PATH = path.join(__dirname, ...PUBLIC_HTML_PATH);
const isNullOrUndefined = value => value === null || value === undefined;
const twilioVideo = require('./twilioVideo.js');
const https = require('https');


const DEV_VEHICLE_SERVER = process.env.DEV_VEHICLE_SERVER;
const VEHICLE_SERVER = process.env.VEHICLE_SERVER;
const VEHICLE_MQTT_PORT = process.env.VEHICLE_MQTT_PORT
const TOKEN = process.env.TOKEN;

process.env.GOOGLE_APPLICATION_CREDENTIALS = '../config/google_api.json'

console.log('public_html_path:' + PUBLIC_HTML_PATH);
console.log('public_html_absolute_path:' + PUBLIC_HTML_ABSOLUTE_PATH);
const jwt = require('jsonwebtoken');

const FileStore = SessionFileStore(session);
const sessionFileStore = new FileStore();
const sessionMiddleware = session({
  name: process.env.INTERNAL_SESSION_NAME,
  secret: process.env.INTERNAL_SESSION_SECRET,
  store: sessionFileStore,
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: true,
    httpOnly: true,
    expires: true,
    maxAge: 12 * 3600000
  }
});

app.use(sessionMiddleware);
app.use(cookieParser());

function request(data) {
  return new Promise((resolve, reject) => {
    data.token = TOKEN;
    const jsondata = JSON.stringify(data); console.log('data', jsondata)
    const req = https.request({
      hostname: VEHICLE_SERVER,
      port: 443,
      path: '/api',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': jsondata.length
      }
    }, (res) => {
      const chunks = []
      res.setEncoding('utf8')
      res.on('data', chunk => {
        // console.log(chunk);
        chunks.push(chunk)
      })
      res.on('end', () => {
        const body = JSON.parse(chunks.join(''))
        resolve(body)
      })
    })
    req.on('error', err => {
      reject(err)
    })
    req.write(jsondata)
    req.end()
  })
}

app.post('/getVehicleToken', (req, res) => {
  request({ request: 'GET_FRONTEND_TOKEN' }).then(response => {

    console.log(response);
    res.json(response);
  }).catch(console.log);
});


app.get('/monitor', (req, res) => {
  var pathFile = path.join(PUBLIC_HTML_ABSOLUTE_PATH, 'monitor.html');
  res.sendFile(pathFile);
});

//Enable js client side files
app.use('/', express.static(PUBLIC_HTML_ABSOLUTE_PATH));


//Redirect to index file
app.get("/", function (req, res) {
  var pathFile = path.join(PUBLIC_HTML_ABSOLUTE_PATH, 'index.html');
  res.sendFile(pathFile);
});

app.get("/groupbroadcast", function (req, res) {

  var pathFile = path.join(PUBLIC_HTML_ABSOLUTE_PATH, 'groupbroadcast.html');
  res.sendFile(pathFile);
});

app.get("/groupwatch", function (req, res) {
  var pathFile = path.join(PUBLIC_HTML_ABSOLUTE_PATH, 'groupwatch.html');
  res.sendFile(pathFile);
});


app.get("/tokenBroadcaster", function (req, res) {
  console.log('Getting access token broadcaster');
  const tokenString = twilioVideo.getTwilioToken('broadcaster-' + req.query.id, req.query.roomName);
  res.send(tokenString);
});

app.get("/tokenWatcher", function (req, res) {
  console.log('Getting access token watcher')
  const tokenString = twilioVideo.getTwilioToken('watcher-' + req.query.id, req.query.roomName);
  res.send(tokenString);
});

app.get('/user/data', async (req, res) => {
  const base64 = req.cookies.TortoiseMonitor;

  if (!base64) {
    if (!req.session.userData) return res.send({});
    return res.send(req.session.userData);
  }
  const hexString = Buffer.from(base64, 'base64').toString('hex');
  const jsonString = cryptr.decrypt(hexString);
  const data = JSON.parse(jsonString);
  req.session.userData = data;
  req.session.save(() => {
    res.send(data);
  });
});

app.post('/set-status', async (req, res) => {

  console.log(req.body.uid, req.body.imei, req.body.status, req.body.teleopsesion);
  const result = await mysqlJson.call('VEHICLE_SET_STATUS', req.body.uid, req.body.status)
  console.log(result);
  vehicleBridge.sendStatus(req.body.imei)
  res.send(result);
});

app.post('/start-monitor-teleop', async (req, res) => {

  console.log('START-MONITOR-TELEOP!');
  console.log(req.body.uid, req.body.imei, req.body.teleopsesion, req.body.idTeleop);
  const teleop_result = await mysqlJson.call('SET_MONITOR_TELEOP_ID', req.body.uid, 5, req.body.idTeleop);
  console.log(teleop_result);
  const lines_result = await mysqlJson.call('UI_GET_CALIBRATION', req.body.uid);
  console.log(lines_result);

  var result = [Object.assign({}, teleop_result[0], lines_result[0])];

  console.log(result);
  vehicleBridge.sendStatusMonitorTeleop(req.body.imei, req.body.idTeleop);
  res.send(result);
});

app.post('/end-monitor-teleop', async (req, res) => {

  console.log('END-MONITOR-TELEOP!');
  console.log(req.body.uid, req.body.imei, req.body.status, req.body.teleopsesion);
  const result = await mysqlJson.call('SET_MONITOR_TELEOP_ID', req.body.uid, 3, 0)
  console.log(result);
  vehicleBridge.sendStatus(req.body.imei);
  res.send(result);
});

app.get('/restart-robot', async (req, res) => {

  console.log('Restarting robot', req.query.imei);
  vehicleBridge.sendRestartRobot(req.query.imei);
  res.send("Restart sent!");
});

app.get('/power-off-robot', async (req, res) => {

  console.log('Turn off robot', req.query.imei);
  vehicleBridge.turnOffRobot(req.query.imei);
  res.send("Restart sent!");
});

app.get('/change-environment', async (req, res) => {
  console.log('changing environment, ', req.query.imei);
  vehicleBridge.changeEnvironment(req.query.imei);
  res.send("change environment sent!");
});


app.get("/translate", function (req, res) {
  console.log('Translate!!');
  var result = Fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS);

  $.ajax({
    type: "GET",
    url: "https://translation.googleapis.com/language/translate/v2",
    dataType: 'jsonp',
    cache: false,
    contentType: "application/x-www-form-urlencoded; charset=UTF-8",
    data: "v=1.0&q=" + text + "&langpair=en|es",
    success: function (iData) {
      //update the value
      console.log(iData["responseData"]["translatedText"]);
    },
    error: function (xhr, ajaxOptions, thrownError) { }
  });
  console.log(result);
  res.send('Result');
});

module.exports = app;
