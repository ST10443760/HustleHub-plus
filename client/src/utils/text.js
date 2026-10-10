/**
 * The API HTML-escapes free text before saving it (validator's escape()),
 * so "Tom & Jerry" comes back as "Tom &amp; Jerry". decodeEntities turns
 * exactly those entities back into characters for display.
 *
 * It runs in a single pass, so "&amp;lt;" becomes "&lt;" (the text the
 * user actually typed), not "<". The result is only ever rendered by React
 * as a text node - never as HTML - so decoded "<img ...>" shows up as the
 * literal characters, not an element.
 */
const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#x2F;': '/',
  '&#x5C;': '\\',
  '&#96;': '`',
};

const ENTITY_PATTERN = /&(?:amp|lt|gt|quot|#x27|#x2F|#x5C|#96);/g;

export function decodeEntities(value) {
  if (typeof value !== 'string') return '';
  return value.replace(ENTITY_PATTERN, (entity) => ENTITIES[entity]);
}
