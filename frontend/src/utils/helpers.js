export const formatDate = (dateString) => {
  if (!dateString) return 'No due date'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export const formatPercentage = (value) => {
  if (value === undefined || value === null) return '0%'
  return `${parseFloat(value).toFixed(1)}%`
}

export const getInitials = (name) => {
  if (!name) return 'VS'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
