import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Room } from '@/types'

export const useRoomStore = defineStore('room', () => {
  const rooms = ref<Room[]>([])
  const currentRoom = ref<Room | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function setRooms(list: Room[]) {
    rooms.value = list
  }

  function setCurrentRoom(room: Room | null) {
    currentRoom.value = room
  }

  function addRoom(room: Room) {
    rooms.value.unshift(room)
  }

  return { rooms, currentRoom, loading, error, setRooms, setCurrentRoom, addRoom }
})
