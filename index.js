const express = require('express');
const parseServerPkg = require('parse-server');
const fs = require('fs');
const http = require('http');
const path = require('path');

const { ParseServer } = parseServerPkg;

console.log('✅ Initierar Parse Server med push-stöd enligt Parse standard...');

const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

app.enable('trust proxy');

// ----- Kontrollera FCM -----
let fcmServiceAccount;
try {
  fcmServiceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT);
  console.log('✅ FCM_SERVICE_ACCOUNT parsed (type: service_account)');
} catch (err) {
  console.error('❌ FCM_SERVICE_ACCOUNT parsing misslyckades:', err);
  process.exit(1);
}

// ----- Kontrollera att APNS-filen finns -----
const apnsKeyPath = path.resolve(__dirname, './certificates/AuthKey_AT4486F4YN.p8');
if (!fs.existsSync(apnsKeyPath)) {
  console.error('❌ Hittar inte APNS .p8-filen på:', apnsKeyPath);
  process.exit(1);
}
console.log('✅ APNS .p8 hittades:', apnsKeyPath);

// ----- (Tillfällig) loggning av .p8-innehåll -----

// ----- Push-inställningar -----
const push = {
  ios: [
    {
      token: {
        key: fs.readFileSync(apnsKeyPath, 'utf8'),
        keyId: 'AT4486F4YN',
        teamId: '5S4Z656PBW',
      },
      topic: 'com.dagensvimmerbyab.DV',
      production: true,
      maxConnections: 1,
      connectionRetryLimit: 20,
      connectionTimeout: 120000,
      keepAlive: false,
      batchSize: 1,    // Throttle för stabilitet på Heroku
      batchWait: 6000, // Paus mellan små batchar
    },
  ],
};

console.log('✅ APNS push-adapter initieras med maxConnections = 1');

// ----- Middleware: CORS -----
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, X-Parse-Application-Id, X-Parse-Master-Key'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// ----- serverInfo endpoint -----
app.get(`${mountPath}/serverInfo`, (req, res) => {
  return res.json({
    parseServerVersion: ParseServer.version || 'unknown',
    features: {
      globalConfig: true,
      hooks: true,
      logs: true,
      push: true,
      schemas: true,
      cloudCode: true,
      logsViewer: true,
    },
  });
});

// ----- Health-check -----
app.get(`${mountPath}/health`, (_, res) => {
  res.status(200).json({ status: 'ok' });
});

// ----- Starta Parse Server -----
async function startServer() {
  const parseServer = new ParseServer({
    databaseURI: process.env.MONGODB_URI,
    cloud: path.resolve(__dirname, 'cloud/main.js'),
    appId: process.env.APP_ID,
    masterKey: process.env.MASTER_KEY,
    serverURL: process.env.SERVER_URL,
    publicServerURL: process.env.PUBLIC_SERVER_URL,
    javascriptKey: process.env.JAVASCRIPT_KEY || '',
    restAPIKey: process.env.REST_API_KEY || '',
    dotNetKey: process.env.DOTNET_KEY || '',
    clientKey: process.env.CLIENT_KEY || '',
    push,
    scheduledPush: true,
    allowClientClassCreation: true,
    liveQuery: {
      classNames: ['Posts', 'Comments'],
    },
    logLevel: 'info',
    verbose: true,
  });

  // await parseServer.start();

  app.use(mountPath, parseServer);

  // Lägg till cron-job för att bearbeta schemalagda pushar
  // Parse Server 4.10.7 behöver detta för scheduledPush
  const cron = require('node-cron');
  
  // Kör varje minut för att bearbeta schemalagda pushar
  cron.schedule('* * * * *', async () => {
    try {
      console.log('⏰ Kontrollerar schemalagda pushar...');
      // Hämta alla schemalagda pushar som ska skickas nu
      const query = new Parse.Query('_PushStatus');
      query.equalTo('pushType', 'scheduled');
      query.lessThanOrEqualTo('pushTime', new Date());
      query.equalTo('status', 'pending');
      
      const scheduledPushes = await query.find({ useMasterKey: true });
      
      if (scheduledPushes.length > 0) {
        console.log(`📤 Hittade ${scheduledPushes.length} schemalagda pushar att skicka`);
        
        for (const pushStatus of scheduledPushes) {
          try {
            // Skicka pushen
            await Parse.Push.send({
              where: pushStatus.get('where'),
              data: pushStatus.get('pushData'),
              pushTime: pushStatus.get('pushTime')
            }, { useMasterKey: true });
            
            // Uppdatera status
            pushStatus.set('status', 'sent');
            pushStatus.set('sentAt', new Date());
            await pushStatus.save(null, { useMasterKey: true });
            
            console.log(`✅ Schemalagd push skickad: ${pushStatus.id}`);
          } catch (pushErr) {
            console.error(`❌ Fel vid skickande av schemalagd push ${pushStatus.id}:`, pushErr);
            pushStatus.set('status', 'failed');
            pushStatus.set('error', pushErr.message);
            await pushStatus.save(null, { useMasterKey: true });
          }
        }
      }
    } catch (err) {
      console.error('❌ Fel vid bearbetning av schemalagda pushar:', err);
    }
  });

  const httpServer = http.createServer(app);
  // Sätt HTTP timeouts för att minska hängande anslutningar / H19-problem
  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout = 66000;
  httpServer.listen(port, () => {
    console.log(`🚀 Parse Server körs på http://localhost:${port}${mountPath}`);
  });

  ParseServer.createLiveQueryServer(httpServer);
}

startServer().catch((err) => {
  console.error('❌ Fel vid start av Parse Server:', err);
});

// ----- Global felhantering -----
process.on('unhandledRejection', (reason, promise) => {
  console.error('🧨 Ohanterat Promise-fel:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('🔥 Ohanterat fel:', err);
});
