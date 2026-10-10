# Local SSL certificate

This folder holds a **self-signed** SSL certificate used to run the API over
HTTPS locally. Self-signed certs are not trusted by browsers/tools by default
(you'll see a warning) - that's normal and expected for local development;
it's not something you'd use in production.

`key.pem` and `cert.pem` are intentionally excluded from git (see
`.gitignore`), since certs and keys should never be committed. After a fresh
clone you need to generate your own **before starting the API**.

## Generating the certificate

From the `api/` folder, on any OS:

```bash
npm run certs
```

This creates `certs/key.pem` (private key) and `certs/cert.pem` (certificate,
`CN=localhost`, valid for 365 days). It needs OpenSSL: it's preinstalled on
macOS and most Linux distributions, and on Windows it comes with Git for
Windows - the script finds Git's copy even when `openssl` isn't on the PATH
(as in PowerShell). Existing certs are left alone; use
`npm run certs -- --force` to replace them.

### Doing it by hand

Linux / macOS (bash or zsh), from `api/`:

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=NullDevs/OU=INSY7314/CN=localhost"
```

Windows **Git Bash**: the same command fails, because Git Bash rewrites the
`"/C=ZA/..."` argument into a Windows path (`C:/Program Files/Git/C=ZA/...`)
and OpenSSL rejects it. Turn that off for the one command:

```bash
mkdir -p certs
MSYS_NO_PATHCONV=1 openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=NullDevs/OU=INSY7314/CN=localhost"
```

Windows **PowerShell**: `openssl` usually isn't on the PATH, so use
`npm run certs`.

## If the certificate is missing

The API still starts, but on plain **HTTP** and with a warning
(`No SSL certificate found ... falling back to plain HTTP`). Nothing else in
the project expects that: the client's dev/preview proxy and both Postman
collections talk to `https://localhost:5000`, so the client gets `502` errors
(Vite logs `EPROTO ... wrong version number`) and Newman fails. Generate the
certificate and restart the API.

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
