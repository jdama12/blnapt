type HomeIconName = 'park' | 'transport' | 'education' | 'medical'

interface HomeIconProps {
  name: HomeIconName
}

export default function HomeIcon({ name }: HomeIconProps) {
  const commonProps = {
    viewBox: '0 0 64 64',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  if (name === 'park') {
    return (
      <svg {...commonProps}>
        <path d="M32 54V30" />
        <path d="M32 38c-11 0-18-6-18-16 10 0 18 5 18 16Z" />
        <path d="M32 31c10 0 18-6 18-17-11 0-18 6-18 17Z" />
        <path d="M20 54h24" />
      </svg>
    )
  }

  if (name === 'transport') {
    return (
      <svg {...commonProps}>
        <rect x="14" y="11" width="36" height="39" rx="7" />
        <path d="M14 31h36M22 19h20M21 50l-4 5M43 50l4 5" />
        <circle cx="22" cy="40" r="2.5" />
        <circle cx="42" cy="40" r="2.5" />
      </svg>
    )
  }

  if (name === 'education') {
    return (
      <svg {...commonProps}>
        <path d="m8 25 24-12 24 12-24 12L8 25Z" />
        <path d="M18 31v13c8 7 20 7 28 0V31M54 27v16" />
        <circle cx="54" cy="47" r="2" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <path d="M32 54S12 42 12 25c0-8 5-14 13-14 4 0 7 2 9 6 2-4 5-6 9-6 8 0 13 6 13 14 0 17-20 29-24 29Z" />
      <path d="M20 31h8l3-7 5 15 4-8h8" />
    </svg>
  )
}
