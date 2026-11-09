const https = require('https');

function timestamp() {
    return new Date().toISOString();
}

function format(level, message, meta = {}) {
    const base = `[${timestamp()}] [${level}] ${message}`;

    if (meta && Object.keys(meta).length > 0) {
        return `${base} ${JSON.stringify(meta)}`;
    }

    return base;
}

// Send a log entry to Grafana Cloud Loki.
function sendToGrafana(level, message, meta = {}) {
    const lokiUrl = process.env.GRAFANA_LOKI_URL;
    const username = process.env.GRAFANA_LOKI_USERNAME;
    const token = process.env.GRAFANA_LOKI_TOKEN;

    // Diagnostic: show whether configuration is loaded.
    console.log('Grafana configuration:', {
        urlConfigured: Boolean(lokiUrl),
        usernameConfigured: Boolean(username),
        tokenConfigured: Boolean(token)
    });

    if (!lokiUrl || !username || !token) {
        console.warn(
            'Grafana logging skipped: one or more environment variables are missing.'
        );
        return;
    }

    try {
        const url = new URL(lokiUrl);

        if (url.protocol !== 'https:') {
            console.error('Grafana Loki URL must use HTTPS.');
            return;
        }

        const logLine = format(level, message, meta);

        const payload = JSON.stringify({
            streams: [
                {
                    stream: {
                        app: 'hustlehub-plus',
                        level: level.toLowerCase()
                    },
                    values: [
                        [
                            `${Date.now()}000000`,
                            logLine
                        ]
                    ]
                }
            ]
        });

        const request = https.request(
            {
                hostname: url.hostname,
                port: url.port || 443,
                path: `${url.pathname}${url.search}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                    'Authorization':
                        'Basic ' +
                        Buffer.from(`${username}:${token}`).toString('base64')
                },
                timeout: 10000
            },
            (response) => {
                response.resume();

                if (response.statusCode >= 200 && response.statusCode < 300) {
                    console.log(
                        `Grafana Loki accepted log. HTTP ${response.statusCode}`
                    );
                } else {
                    console.error(
                        `Grafana log delivery failed. HTTP status: ${response.statusCode}`
                    );
                }
            }
        );

        request.on('timeout', () => {
            console.error('Grafana log delivery timed out.');
            request.destroy();
        });

        request.on('error', (error) => {
            console.error(
                'Grafana log delivery error:',
                error.message
            );
        });

        request.write(payload);
        request.end();

    } catch (error) {
        console.error(
            'Could not send log to Grafana:',
            error.message
        );
    }
}

function writeLog(level, message, meta = {}, consoleMethod = 'log') {
    const formattedMessage = format(level, message, meta);

    console[consoleMethod](formattedMessage);

    sendToGrafana(level, message, meta);
}

const logger = {
    info(message, meta = {}) {
        writeLog('INFO', message, meta, 'log');
    },

    warn(message, meta = {}) {
        writeLog('WARN', message, meta, 'warn');
    },

    error(message, meta = {}) {
        writeLog('ERROR', message, meta, 'error');
    },

    event(eventType, message, meta = {}) {
        writeLog(`EVENT:${eventType}`, message, meta, 'log');
    }
};

module.exports = logger;