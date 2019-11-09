// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}
var pushKeyPath = path.resolve(__dirname, './certificate/AuthKey-<keyID>.p8')
console.log(pushKeyPath)
var pushConfig = { 
    android: {
        senderId: '',
        apiKey: ''
    },
    ios: {
      token: {
        key: pushKeyPath,
        keyId: "",
        teamId: "" // The Team ID for your developer account
      },
      topic: '', // The bundle identifier associated with your app
      production: true
    }
  };
var api = new ParseServer({
  databaseURI: databaseUri || '<MongodbConnectionString>',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || 'id-<ParseAppID>',
  masterKey: process.env.MASTER_KEY || 'key-<ParseMasterKey>', //Add your master key here. Keep it secret!
  serverURL: process.env.SERVER_URL || 'http://<heroku-AppName>.herokuapp.com/parse',  // Don't forget to change to https if needed
  push: pushConfig,
  liveQuery: {
    classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  }
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey



var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('<AppName> parse-server deployed successfully');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
