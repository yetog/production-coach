/** Resolve an extension-provided project without accepting arbitrary URLs. */
export function projectFromLocation(search: string): string | undefined {
  const value = new URLSearchParams(search).get('project')?.trim()
  return value === undefined || value === '' ? undefined : value
}
