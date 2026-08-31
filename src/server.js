const https = require('https');
const fs = require('fs');
const path = require('path');

const app = require('./app');

const PORT = process.env.PORT || 5000;

const sslOptions = {
    key: fs.readFileSync(
        path.join(__dirname, '../cert/server.key')
    ),
    cert: fs.readFileSync(
        path.join(__dirname, '../cert/server.crt')
    )
};

https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`HustleHub+ API running on https://localhost:${PORT}`);
});