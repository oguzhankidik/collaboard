import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Room, Participant, RoomStatus, ChatMessage, RoomSettings } from '@/types'

export const useRoomStore = defineStore('room', () => {
  const rooms = ref<Room[]>([])
  const currentRoom = ref<Room | null>(null)
  const currentRoomId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const lobbyParticipants = ref<Participant[]>([])
  const roomOwnerId = ref<string>('')
  const roomStatus = ref<RoomStatus>('waiting')
  const chatMessages = ref<ChatMessage[]>([])
  const roomSettings = ref<RoomSettings>({ timerDurationMs: 0 })
  const sessionStartedAt = ref<number | null>(null)

  function setRooms(list: Room[]) {
    rooms.value = list
  }

  function setCurrentRoom(room: Room | null) {
    currentRoom.value = room
  }

  function setCurrentRoomId(id: string | null) {
    currentRoomId.value = id
  }

  function addRoom(room: Room) {
    rooms.value.unshift(room)
  }

  function setLobbyState(ownerId: string, status: RoomStatus, participants: Participant[], settings?: RoomSettings, startedAt?: number) {
    roomOwnerId.value = ownerId
    roomStatus.value = status
    lobbyParticipants.value = participants
    if (settings !== undefined) roomSettings.value = settings
    sessionStartedAt.value = startedAt ?? null
  }

  function setRoomSettings(s: RoomSettings) {
    roomSettings.value = s
  }

  function setSessionStartedAt(ts: number | null) {
    sessionStartedAt.value = ts
  }

  function addLobbyParticipant(p: Participant) {
    if (!lobbyParticipants.value.find((x) => x.id === p.id)) {
      lobbyParticipants.value.push(p)
    }
  }

  function removeLobbyParticipant(userId: string) {
    lobbyParticipants.value = lobbyParticipants.value.filter((p) => p.id !== userId)
  }

  function setRoomStatus(s: RoomStatus) {
    roomStatus.value = s
  }

  function setRoomOwnerId(id: string) {
    roomOwnerId.value = id
  }

  function addChatMessage(msg: ChatMessage) {
    chatMessages.value.push(msg)
  }

  function setChatHistory(msgs: ChatMessage[]) {
    chatMessages.value = msgs
  }

  function clearChat() {
    chatMessages.value = []
  }

  return {
    rooms,
    currentRoom,
    currentRoomId,
    loading,
    error,
    lobbyParticipants,
    roomOwnerId,
    roomStatus,
    chatMessages,
    roomSettings,
    sessionStartedAt,
    setRooms,
    setCurrentRoom,
    setCurrentRoomId,
    addRoom,
    setLobbyState,
    addLobbyParticipant,
    removeLobbyParticipant,
    setRoomStatus,
    setRoomOwnerId,
    addChatMessage,
    setChatHistory,
    clearChat,
    setRoomSettings,
    setSessionStartedAt,
  }
})
