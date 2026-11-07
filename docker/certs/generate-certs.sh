#!/bin/sh
# Creates the self-signed TLS certificate shared by the api (serves HTTPS)
# and the client's nginx (verifies the api with it). Runs once as the
# "certs" service in docker-compose.yml and writes into the certs volume.
#
# Keeps an existing certificate unless it is missing, unreadable or expires
# within a day, so restarting the stack never changes the cert.
set -eu

DIR="${CERT_DIR:-/certs}"
KEY="$DIR/key.pem"
CERT="$DIR/cert.pem"

if [ -s "$KEY" ] && [ -s "$CERT" ] && openssl x509 -in "$CERT" -noout -checkend 86400 >/dev/null 2>&1; then
  echo "certs: existing certificate is still valid, nothing to do"
  exit 0
fi

echo "certs: generating a self-signed certificate (SAN: localhost, api, 127.0.0.1)"
umask 077
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout "$KEY.tmp" -out "$CERT.tmp" \
  -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=NullDevs/OU=INSY7314/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:api,IP:127.0.0.1" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign" \
  -addext "extendedKeyUsage=serverAuth" 2>/dev/null

# Key: owner only (uid 1000 = the api's "node" user). Cert: public, so the
# nginx user (uid 101) can read it to verify the api.
chmod 600 "$KEY.tmp"
chmod 644 "$CERT.tmp"
mv "$KEY.tmp" "$KEY"
mv "$CERT.tmp" "$CERT"
echo "certs: done"
