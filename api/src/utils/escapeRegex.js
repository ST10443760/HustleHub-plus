/**
 * Escapes every regex special character so user input is matched as plain
 * text. Without this, a search like ".*" would match everything and a
 * crafted pattern could make the database do expensive backtracking (ReDoS).
 */
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
}

module.exports = escapeRegex;
