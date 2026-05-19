export function getInitial(name, email) {
  const trimmedName = (name || '').trim()
  if (trimmedName) return trimmedName[0].toUpperCase()
  if (email) return email[0].toUpperCase()
  return '?'
}
