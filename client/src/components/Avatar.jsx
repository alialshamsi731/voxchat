/**
 * Avatar — displays user initials or avatar image
 */
const Avatar = ({ username = '?', avatarUrl = null, size = 'md', className = '' }) => {
  const sizeMap = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg',
  }

  const initial = username?.[0]?.toUpperCase() || '?'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`avatar ${sizeMap[size]} object-cover ${className}`}
      />
    )
  }

  return (
    <div className={`avatar ${sizeMap[size]} ${className}`}>
      {initial}
    </div>
  )
}

export default Avatar
