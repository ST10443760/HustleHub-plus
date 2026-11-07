# syntax=docker/dockerfile:1
#
# One-shot helper that generates the shared self-signed certificate into
# the "certs" volume (see generate-certs.sh). OpenSSL is installed at build
# time so the container needs no network access when it runs.

FROM alpine:3.24.4

# uid/gid 1000 matches the api image's "node" user, which must read the key.
RUN apk add --no-cache openssl \
 && addgroup -g 1000 certs \
 && adduser -D -H -u 1000 -G certs certs \
 && mkdir /certs \
 && chown certs:certs /certs

COPY generate-certs.sh /usr/local/bin/generate-certs
# Strip any CR in case the script was checked out with Windows line endings.
RUN sed -i 's/\r$//' /usr/local/bin/generate-certs && chmod 0555 /usr/local/bin/generate-certs

USER certs
ENTRYPOINT ["/usr/local/bin/generate-certs"]
