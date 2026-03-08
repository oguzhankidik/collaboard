export function cancelRoomTimer(
  roomId: string,
  roomTimers: Map<string, ReturnType<typeof setTimeout>>,
): void {
  const h = roomTimers.get(roomId)
  if (h !== undefined) {
    clearTimeout(h)
    roomTimers.delete(roomId)
  }
}

export function startRoomTimer(
  roomId: string,
  durationMs: number,
  roomTimers: Map<string, ReturnType<typeof setTimeout>>,
  onExpiry: () => void | Promise<void>,
): void {
  cancelRoomTimer(roomId, roomTimers)
  const handle = setTimeout(async () => {
    roomTimers.delete(roomId)
    await onExpiry()
  }, durationMs)
  roomTimers.set(roomId, handle)
}
