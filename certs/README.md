# Local SSL certificate

This folder holds a **self-signed** SSL certificate used to run the API over
HTTPS locally, as required by the Part 1 rubric. Self-signed certs are not
trusted by browsers/tools by default (you'll see a warning) - that's normal
and expected for local development; it's not something you'd use in
production.

These files are intentionally excluded from git (see `.gitignore`) since
certs/keys should never be committed - if you clone this repo fresh, you
need to generate your own.

## Regenerating the certificate

Run this from the project root (requires OpenSSL - already installed on
Mac/Linux; on Windows, Git Bash includes it):

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=NullDevs/OU=INSY7314/CN=localhost"
```

This creates `certs/key.pem` (private key) and `certs/cert.pem`
(certificate), valid for 365 days.

## Testing it

```bash
npm run dev
```

Visit `https://localhost:5000/api/health` - your browser will warn that the
certificate isn't trusted ("Your connection is not private" or similar).
That's expected for a self-signed cert - click through the warning
(Advanced → Proceed) to confirm the API is genuinely serving over HTTPS.

For Postman: Settings → General → turn OFF "SSL certificate verification"
so it doesn't reject the self-signed cert either.
