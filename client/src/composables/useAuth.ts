import { ref } from 'vue'
import { signInWithPopup, signInAnonymously, signOut, updateProfile } from 'firebase/auth'
import { useRouter, useRoute } from 'vue-router'
import { auth, googleProvider } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const authStore = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  function redirectAfterLogin() {
    const redirect = route.query.redirect
    return router.push(typeof redirect === 'string' ? redirect : { name: 'home' })
  }

  async function signInWithGoogle() {
    loading.value = true
    error.value = null
    try {
      const result = await signInWithPopup(auth, googleProvider)
      authStore.setUser(result.user)
      await redirectAfterLogin()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sign in failed'
    } finally {
      loading.value = false
    }
  }

  async function signInAsGuest(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    loading.value = true
    error.value = null
    try {
      const result = await signInAnonymously(auth)
      await updateProfile(result.user, { displayName: trimmed })
      await result.user.getIdToken(true)
      authStore.setUser(result.user)
      await redirectAfterLogin()
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

  return { loading, error, signInWithGoogle, signInAsGuest, logout }
}
