import { ref } from 'vue'
import { signInWithPopup, signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'
import { auth, googleProvider } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const authStore = useAuthStore()
  const router = useRouter()

  async function signInWithGoogle() {
    loading.value = true
    error.value = null
    try {
      const result = await signInWithPopup(auth, googleProvider)
      authStore.setUser(result.user)
      await router.push({ name: 'home' })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sign in failed'
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    error.value = null
    try {
      await signOut(auth)
      authStore.setUser(null)
      await router.push({ name: 'login' })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sign out failed'
    } finally {
      loading.value = false
    }
  }

  return { loading, error, signInWithGoogle, logout }
}
