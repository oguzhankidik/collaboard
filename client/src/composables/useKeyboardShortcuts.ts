import { ref, onMounted, onUnmounted } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import type { ToolType } from '@/types'
import { ZOOM_STEP } from '@/constants'

interface ShortcutOptions {
  onDeleteSelected?: () => void
  onDuplicateSelected?: () => void
  onEscape?: () => void
}

const TOOL_KEYS: Record<string, ToolType> = {
  v: 'select',
  p: 'pen',
  e: 'eraser',
  h: 'hand',
  r: 'rect',
  c: 'circle',
  l: 'line',
  a: 'arrow',
  t: 'text',
  f: 'fill',
}

function isTypingTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  )
}

export function useKeyboardShortcuts(options: ShortcutOptions = {}) {
  const canvasStore = useCanvasStore()

  const isSpaceDown = ref(false)

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space' && !isTypingTarget(e)) {
      isSpaceDown.value = true
      e.preventDefault()
      return
    }

    if (isTypingTarget(e)) return

    const ctrl = e.ctrlKey || e.metaKey

    if (ctrl) {
      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault()
          if (e.shiftKey) canvasStore.redo()
          else canvasStore.undo()
          return
        case 'y':
          e.preventDefault()
          canvasStore.redo()
          return
        case 'd':
          e.preventDefault()
          options.onDuplicateSelected?.()
          return
      }
      return
    }

    if (e.key in TOOL_KEYS) {
      canvasStore.setActiveTool(TOOL_KEYS[e.key])
      return
    }

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        options.onDeleteSelected?.()
        return
      case 'Escape':
        options.onEscape?.()
        return
      case '+':
      case '=':
        canvasStore.setZoom(canvasStore.zoom + ZOOM_STEP)
        return
      case '-':
        canvasStore.setZoom(canvasStore.zoom - ZOOM_STEP)
        return
      case '0':
        canvasStore.resetView()
        return
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      isSpaceDown.value = false
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
  })

  return { isSpaceDown }
}
