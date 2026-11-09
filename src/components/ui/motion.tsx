import { useEffect, useState, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from 'framer-motion'

export const springs = {
  snappy: { type: 'spring', stiffness: 420, damping: 32 } as const,
  gentle: { type: 'spring', stiffness: 260, damping: 26 } as const,
}

/** Fade and rise into view once, when scrolled to. */
export function Reveal({ children, delay = 0, className, y = 18 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ ...springs.gentle, delay }}
    >
      {children}
    </motion.div>
  )
}

interface AnimatedNumberProps {
  value: number
  format: (value: number) => string
  /** Exact text to show once the roll finishes, so rounding never changes the final figure. */
  finalText?: string
  className?: string
}

/**
 * Rolls to a new live value. Use only for values that really update from data.
 * Skips the roll for users who prefer reduced motion.
 */
export function AnimatedNumber({ value, format, finalText, className }: AnimatedNumberProps) {
  const reduce = useReducedMotion()
  const motionValue = useMotionValue(value)
  const [text, setText] = useState(finalText ?? format(value))

  useMotionValueEvent(motionValue, 'change', (latest) => setText(format(latest)))

  useEffect(() => {
    if (reduce) {
      motionValue.set(value)
      setText(finalText ?? format(value))
      return
    }
    const controls = animate(motionValue, value, {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
      onComplete: () => setText(finalText ?? format(value)),
    })
    return () => controls.stop()
    // format is a stable pure function at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, finalText, reduce])

  return <span className={className}>{text}</span>
}
