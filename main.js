/* global __dirname */
/*const performance = require('./performance.js'); //Para medir el tiempo de arranque*/
const colors = require('colors');
const argv = require('./modules/Arguments');
const Versions = require('./modules/Versions');
const {User, Profile} = require('./model/User');
const jwt = require('jsonwebtoken');
const sessions =require ('express-session');
const SessionFileStore = require ('session-file-store');

(async function () {
    const backendVersion = await Versions.backendVersion;
    const labelLines = backendVersion.label.match(/(.{1,19}\S)(?:\s+|$)|(.{20})", @"$1$2\r\n/g);
    console.info('*********************************'.bgBrightYellow.brightGreen);
    console.info('***'.bgBrightYellow.brightGreen, ' Tortoise teleop monitor server  '.magenta, '***'.bgBrightYellow.brightGreen);
    console.info('***'.bgBrightYellow.brightGreen, ' ( ( _ ) )       __      ', '***'.bgBrightYellow.brightGreen);
    console.info('***'.bgBrightYellow.brightGreen, "     |.,-;-;-,. /O_\\     ", '***'.bgBrightYellow.brightGreen);
    console.info('***'.bgBrightYellow.brightGreen, '    _|_/_/_|_\\_\\) /      ', '***'.bgBrightYellow.brightGreen);
    console.info('***'.bgBrightYellow.brightGreen, "  '-<_,-.><_><,-./       ", '***'.bgBrightYellow.brightGreen);
    console.info('***'.bgBrightYellow.brightGreen, "     ( o )===( o )       ", '***'.bgBrightYellow.brightGreen);
    console.info('***'.bgBrightYellow.brightGreen, '      `-\´     `-\´        ', '***'.bgBrightYellow.brightGreen);
    console.info('***'.bgBrightYellow.brightGreen, '          2022           '.green, '***'.bgBrightYellow.brightGreen);
    console.info('***'.bgBrightYellow.brightGreen, ''.green, backendVersion.name.padEnd(24, ' ').gray, '***'.bgBrightYellow.brightGreen);
    console.info('***'.bgBrightYellow.brightGreen, ''.green, backendVersion.commit.padEnd(24, ' ').gray.underline, '***'.bgBrightYellow.brightGreen);
    for (const line of labelLines) {
        console.info('***'.bgBrightYellow.brightGreen, ''.green, line.padEnd(24, ' ').gray, '***'.bgBrightYellow.brightGreen);
    }

    console.info('*********************************'.bgBrightYellow.brightGreen);
})();

console.log("Cargando dependencias...");
const isNullOrUndefined = value => value === null || value === undefined;


const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
var url = require('url');

const vehicleBridge = require('./modules/VehicleBridge.js');
console.log('Iniciando express...');

const app = express();

app.use(cookieParser());
var bodyParser = require('body-parser');

app.use(bodyParser.json({ limit: '512mb' }));       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({// to support URL-encoded bodies
    extended: true,
    limit: '512mb'
}));

const HTTPS_PORT = argv.https || 443;
//const HTTPS_PORT = 4200;

console.log('Https port: ', HTTPS_PORT);

const httpsServer = require('./modules/HttpsServer.js')(app, HTTPS_PORT);

const PUBLIC_HTML_PATH = ['../monitor/public_html'];
const PUBLIC_HTML_ABSOLUTE_PATH = path.join(__dirname, ...PUBLIC_HTML_PATH);

/* Socket general */

//****************BLOQUE PARA ACTIVAR PUERTOS DE WEBSOCKETS PARA TELEOPERACIONES******************
// Servidor de teleoperaciones
const teleopServerMultiple = require('./modules/TeleopServerMultiple.js');
// Listar sesiones de teleoperación
//mysqlJson=teleopServerMultiple.mysqlJson;
const mysqlJson = require('./modules/Database.js');
app.get('/ports', (req, res) => {
    const ports = {
        PUERTO_IMAGENES_UI: teleopServerMultiple.UIVideoPort,
        PUERTO_JOYSTICK_UI: teleopServerMultiple.UIJoystickPort,
        PUERTO_LATENCY_UI: teleopServerMultiple.UILatencyPort,
        PUERTO_SENSOR_UI: teleopServerMultiple.UISensorPort
    };
    res.send(ports);
});

app.get('/', (req, res) => {
    var pathFile = path.join(__dirname , "./monitor/public_html/login.html");
    console.log("PATHFILE: ", pathFile);
    res.sendFile(pathFile);
});

app.post('/login', async (req, res) => {
    console.log("=======================LOGIN=======================");
    console.log(req.body);
    console.log("==============================================");

    // Clearing session
    let session = new sessions({
        secret: '1597dd8bee9ecfa7456',
        resave: true,
        saveUninitialized: true,
    });
    session.user = null;
    session.teleopId = null;
    session.profile = null;
   
    // Login
    const user = await User.getUserByEmail(req.body.email);
    if (!user) return false;

    if (!user.checkPassword(req.body.password)) 
    {

        res.send({success: false, message: "Wrong Credentials"});
        return;
    }
    const profile = await Profile.getProfile(user.profileId);
    if (!profile) throw new Error({ error: 'WRONG_PROFILE', user: user.id, profile: user.profileId });
    const loginResult = {
        teleopId: user.teleopId,
        user: { id: user.id, name: user.name, isLogged: user.IS_LOGGED },
        profile: { id: profile.profileId, name: profile.name, permissions: profile.permissions }
    }
    const result = await User.callGetCredentialsByEmail(req.body.email);
    //const secretKey = config.secret;
    const secretKey = "7b2742dcea63161a9d3539f671bc3d2bd016d374368ea2166198a7a6ee5ec93d";
    let token
    let payloadNanoid = Math.random().toString().replace(".", "");
    // Setting up session
    if (result) {
        const payload = {
        id: result.id,
        client: result.client,
        client_id: result.client_id,
        timestamp: result.timestamp,
        nanoid: payloadNanoid
        }
        token = jwt.sign(payload, secretKey, {
        expiresIn: '12h'
        })
        session.token = token;
    } else {
        const payload = {
        email: req.body.email,
        teleopId: user.teleopId,
        user: loginResult.user,
        profile: loginResult.profile,
        nanoid: payloadNanoid
        }
        token = jwt.sign(payload, secretKey, {
        expiresIn: '12h'
        })
        session.token = token;
    }

    loginResult.apiKey = 'VVBTK15ZqJBWUM0ijXmk2eiJMLzEqmmf';
    loginResult.session = session;
    loginResult.token = token;

    session.user = loginResult.user;
    session.teleopId = loginResult.teleopId;
    session.profile = loginResult.profile;

    //const prof = loginResult.profile.name.toLowerCase();
    //loginResult.profile.sidebar = checkProfile[prof];
    loginResult.success = true;

    //update login status in DB
    User.updateLoginStatus(user.id, 1);

    const data = await monitor_start(session);
    console.log("DATA SESSION: ", data);
    res.cookie('TortoiseMonitor', data.cookie);

    let valueToReturn = {success : true};
    res.send(JSON.stringify(valueToReturn));
});

async function monitor_start(session) {
    if (!session.teleopId) return false;
    const sessionData = {
      user: session.user,
      teleopId: session.teleopId,
      profile: session.profile,
      token: session.token
    }
    const hexString = cryptr.encrypt(JSON.stringify(sessionData));
    const base64 = Buffer.from(hexString, 'hex').toString('base64');
    return { cookie: base64 };
}


app.get('/monitorteleop', async (req, res) => {

    console.log(req.query);
    if(isNullOrUndefined(req.query.idteleopsession) || isNullOrUndefined(req.query.uid) || isNullOrUndefined(req.query.imei))
    {
        console.log('Missing parameters!');
        res.status(401).send();
    }
    else
    {
      console.log('Creating teleop session!');
      const session = teleopServerMultiple.createSession(req.query.idteleopsession, req.query.uid, req.query.imei);

      const ports = {
          PUERTO_IMAGENES_UI: teleopServerMultiple.UIVideoPort,
          PUERTO_JOYSTICK_UI: teleopServerMultiple.UIJoystickPort,
          PUERTO_LATENCY_UI: teleopServerMultiple.UILatencyPort,
          PUERTO_SENSOR_UI: teleopServerMultiple.UISensorPort
      };

       res.send(ports);
    }
    //  console.log('Session created:', session)
});



const tortopsBrdige = require('./modules/TortopsBridge');
const Cryptr = require('cryptr');
const cryptr = new Cryptr('YJrgt7deZDtVnVqp');


app.get('/version', async (req, res) => {
    const backendVersion = await Versions.backendVersion;
    res.send(backendVersion);
});


app.get('/teleop/data', async (req, res) => {
    const base64 = req.cookies.TortoiseTeleoperation;
    if (!base64) return res.send({});
    const hexString = Buffer.from(base64, 'base64').toString('hex');
    const jsonString = cryptr.decrypt(hexString);
    const data = JSON.parse(jsonString);
    res.cookie('TortoiseTeleoperation', '', {
        maxAge: 0,
        secure: true,
        domain: '.tortops.com',
        httpOnly: false,
    });
    res.send(data);
    const session = teleopServerMultiple.createSession(data.request.uid, data.vehicle.uid, data.vehicle.imei);
    //  console.log('Session created:', session)
});



app.post('/getVehicleToken', async (req, res) => {
    const response = await vehicleBridge.requestClientToken();
    res.json(response);
});

app.get('/', async (req, res) => {
    const response = await vehicleBridge.requestClientToken();
    res.json(response);
});


/*
 API HTTP BACKEND VEHICLE
 */
app.post('/api', (req, res) => {
    const data = req.body;

    console.log(data.toString());
    const response = {};
    res.setHeader('Content-Type', 'application/json');

    switch (data.request) {
        case 'TELEOPERATION_START':
            teleopServerMultiple.createSession(data.session_id, data.vehicle_id, data.imei);
            res.send({ 'STATUS': 'success' });
            break;
        case 'TELEOPERATION_END':
            teleopServerMultiple.destroySession(data.uid_vehiculo);
            res.send({ 'STATUS': 'success' });
            break;
    }

});

app.get('/update-quantity', async (req, res) => {

  console.log('*****Updating container products!*****');
  console.log(req.query.sku);
  console.log(req.query.quantity);
  const result = await mysqlJson.call('SET_CONTAINER_QUANTITY',req.query.sku,req.query.quantity)
  vehicleBridge.updateContainerQuantity(req.query.sku,req.query.quantity);
  console.log(result);
  res.send(result);
});

const dashRouter = require('./modules/ServerEndpoints.js');
const { response } = require('express');
//const { response } = require('express');

app.use('/dashboard', dashRouter);
