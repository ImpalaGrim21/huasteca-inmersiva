/** Resolve a public asset for local development or a nested static deployment. */
export function assetUrl(path: string): string {
  // Preserve external, data and blob URLs, including values restored from storage.
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path)) return path

  const configuredBase = import.meta.env.BASE_URL
  const base = configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`
  // Stored packages may already contain the current deployment prefix.
  if (base !== '/' && path.startsWith(base)) return path

  return `${base}${path.replace(/^\/+/, '')}`
}
