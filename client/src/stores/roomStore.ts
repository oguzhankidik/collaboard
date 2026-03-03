import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Room, Participant, RoomStatus, ChatMessage } from '@/types'

export const useRoomStore = defineStore('room', () => {
  const rooms = ref<Room[]>([])
  const currentRoom = ref<Room | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const lobbyParticipants = ref<Participant[]>([])
  const roomOwnerId = ref<string>('')
  const roomStatus = ref<RoomStatus>('waiting')
  const chatMessages = ref<ChatMessage[]>([])

  function setRooms(list: Room[]) {
    rooms.value = list
  }

  function setCurrentRoom(room: Room | null) {
    currentRoom.value = room
  }

  function addRoom(room: Room) {
    rooms.value.unshift(room)
  }

  function setLobbyState(ownerId: string, status: RoomStatus, participants: Participant[]) {
    roomOwnerId.value = ownerId
    roomStatus.value = status
    lobbyParticipants.value = participants
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
    loading,
    error,
    lobbyParticipants,
    roomOwnerId,
    roomStatus,
    chatMessages,
    setRooms,
    setCurrentRoom,
    addRoom,
    setLobbyState,
    addLobbyParticipant,
    removeLobbyParticipant,
    setRoomStatus,
    addChatMessage,
    setChatHistory,
    clearChat,
  }
})
