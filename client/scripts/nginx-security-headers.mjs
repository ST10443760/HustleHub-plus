// Prints the nginx add_header lines for the client's security headers,
// generated from securityHeaders.js so nginx and `npm run preview` always
// send exactly the same policy. Run during the Docker image build:
//   node scripts/nginx-security-headers.mjs > security-headers.conf
import { toNginxHeaders } from '../securityHeaders.js';

process.stdout.write(toNginxHeaders());
