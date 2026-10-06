export function resolveAsset(src) {
  if (!src) return '';
  if (/^(?:https?:)?\/\//.test(src) || src.startsWith('data:')) return src;
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : base + '/';
  const cleanSrc = src.startsWith('/') ? src.slice(1) : src;
  return cleanBase + cleanSrc;
}
