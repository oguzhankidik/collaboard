import { ref, onUnmounted } from 'vue'
import type { Socket } from 'socket.io-client'
import { getSocket, disconnectSocket } from '@/lib/socket'

export function useSocket() {
  const socket = ref<Socket | null>(null)
  const connected = ref(false)
  const error = ref<string | null>(null)

  async function connect() {
    try {
      const s = await getSocket()
      socket.value = s
      connected.value = s.connected

      s.on('connect', () => { connected.value = true })
      s.on('disconnect', () => { connected.value = false })
      s.on('connect_error', (err) => { error.value = err.message })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Connection failed'
    }
  }

  function disconnect() {
    disconnectSocket()
    socket.value = null
    connected.value = false
  }

  onUnmounted(disconnect)

  return { socket, connected, error, connect, disconnect }
}
