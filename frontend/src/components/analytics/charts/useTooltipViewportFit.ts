import { useCallback, useEffect, useRef } from 'react'

/** Keeps Recharts' in-chart tooltip inside the visible browser viewport. */
export function useTooltipViewportFit<T extends HTMLElement>() {
  const containerRef = useRef<T>(null)
  const activeRef = useRef(false)
  const frameRef = useRef<number | null>(null)

  const fitTooltip = useCallback(() => {
    if (!activeRef.current) return
    const tooltip = containerRef.current?.querySelector<HTMLElement>('.recharts-tooltip-wrapper')
    if (!tooltip || getComputedStyle(tooltip).visibility === 'hidden') return

    // Clear the previous correction first so each measurement uses Recharts' natural position.
    tooltip.style.translate = ''
    const bounds = tooltip.getBoundingClientRect()
    const viewport = window.visualViewport
    const margin = 8
    const left = (viewport?.offsetLeft ?? 0) + margin
    const top = (viewport?.offsetTop ?? 0) + margin
    const right = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth) - margin
    const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - margin
    const shiftX = bounds.right > right ? right - bounds.right : bounds.left < left ? left - bounds.left : 0
    const shiftY = bounds.bottom > bottom ? bottom - bounds.bottom : bounds.top < top ? top - bounds.top : 0

    tooltip.style.translate = `${shiftX}px ${shiftY}px`
  }, [])

  const scheduleFit = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      fitTooltip()
    })
  }, [fitTooltip])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let observedTooltip: HTMLElement | null = null
    const tooltipSizeObserver = new ResizeObserver(scheduleFit)
    const observeTooltip = () => {
      const tooltip = container.querySelector<HTMLElement>('.recharts-tooltip-wrapper')
      if (tooltip === observedTooltip) return
      tooltipSizeObserver.disconnect()
      observedTooltip = tooltip
      if (tooltip) tooltipSizeObserver.observe(tooltip)
      scheduleFit()
    }
    const mutationObserver = new MutationObserver(observeTooltip)
    mutationObserver.observe(container, { childList: true, subtree: true })
    const containerSizeObserver = new ResizeObserver(scheduleFit)
    containerSizeObserver.observe(container)
    window.addEventListener('resize', scheduleFit)
    window.visualViewport?.addEventListener('resize', scheduleFit)

    return () => {
      mutationObserver.disconnect()
      tooltipSizeObserver.disconnect()
      containerSizeObserver.disconnect()
      window.removeEventListener('resize', scheduleFit)
      window.visualViewport?.removeEventListener('resize', scheduleFit)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [scheduleFit])

  const onPointerEnter = () => {
    activeRef.current = true
    scheduleFit()
  }
  const onPointerMove = scheduleFit
  const onPointerLeave = () => {
    activeRef.current = false
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    const tooltip = containerRef.current?.querySelector<HTMLElement>('.recharts-tooltip-wrapper')
    if (tooltip) tooltip.style.translate = ''
  }

  return { containerRef, onPointerEnter, onPointerMove, onPointerLeave }
}
