import { useEffect, useState } from 'react'

export function useChartContainerWidth<T extends HTMLElement = HTMLDivElement>() {
  const [element, setElement] = useState<T | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!element) return
    const update = () => setWidth(Math.round(element.getBoundingClientRect().width))
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return { ref: setElement, width }
}

export function responsiveLabelWidth(width: number, requested: number, minimum = 104) {
  if (width <= 0) return requested
  const available = Math.max(minimum, Math.floor(width * 0.42))
  return Math.min(requested, available)
}
