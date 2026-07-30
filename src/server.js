require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// NOTE for Lihle: this currently starts a plain HTTP server so the rest
// of the team can build/test against it immediately. Swap this out for
// an HTTPS server using the local SSL cert (https.createServer) as part
// of your HTTPS checklist item - the rest of the app doesn't need to
// change, just how the server is started here.
app.listen(PORT, () => {
  logger.info(`HustleHub+ API listening on port ${PORT}`);
});
