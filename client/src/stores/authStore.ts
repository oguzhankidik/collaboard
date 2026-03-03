import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import type { GuestUser } from '@/types'

function isGuestUser(u: User | GuestUser | null): u is GuestUser {
  return u !== null && 'isGuest' in u
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | GuestUser | null>(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => user.value !== null)

  function init(): Promise<void> {
    const gid = localStorage.getItem('guest_id')
    const gname = localStorage.getItem('guest_name')
    if (gid && gname) {
      user.value = { uid: gid, displayName: gname, isGuest: true }
    }

    return new Promise((resolve) => {
      onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          user.value = firebaseUser
          localStorage.removeItem('guest_id')
          localStorage.removeItem('guest_name')
        } else if (!isGuestUser(user.value)) {
          user.value = null
        }
        loading.value = false
        resolve()
      })
    })
  }

  function setUser(u: User | GuestUser | null) {
    user.value = u
  }

  return { user, loading, isAuthenticated, init, setUser }
})
