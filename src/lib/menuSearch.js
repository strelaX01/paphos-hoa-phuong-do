export function normalizeMenuSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
}

export function menuItemMatchesQuery(item, category, query) {
  const normalizedQuery = normalizeMenuSearch(query)
  if (!normalizedQuery) return true

  const searchableText = normalizeMenuSearch([
    item?.name,
    item?.nameEn,
    item?.category,
    category,
  ].filter(Boolean).join(' '))

  return searchableText.includes(normalizedQuery)
}
