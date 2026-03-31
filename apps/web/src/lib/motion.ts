export const duration = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  stagger: 0.06,
} as const

export const ease = {
  out: [0.16, 1, 0.3, 1],
  in: [0.4, 0, 1, 0.68],
  inOut: [0.4, 0, 0.2, 1],
  spring: { type: 'spring' as const, stiffness: 300, damping: 30 },
  bounce: { type: 'spring' as const, stiffness: 400, damping: 25 },
} as const

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.out } },
  exit: { opacity: 0, y: -8, transition: { duration: duration.normal, ease: ease.in } },
}

export const staggerContainer = {
  animate: { transition: { staggerChildren: duration.stagger } },
}

export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.normal, ease: ease.out } },
}

export const cardHover = {
  whileHover: { y: -2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', transition: { duration: duration.fast, ease: ease.out } },
  whileTap: { scale: 0.98 },
}

export const scrollReveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: duration.slow, ease: ease.out },
}

export const searchEntrance = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: duration.slow, ease: ease.out, delay: 0.2 } },
}

export const dropdownVariants = {
  hidden: { opacity: 0, y: -4, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: duration.normal, ease: ease.out } },
}
