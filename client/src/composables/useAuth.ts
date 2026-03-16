import { ref } from 'vue'
import { signInWithPopup, signInAnonymously, signOut, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useRouter, useRoute } from 'vue-router'
import { auth, googleProvider, db } from '@/lib/firebase'
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
      await setDoc(doc(db, 'users', result.user.uid), {
        displayName: trimmed,
        isAnonymous: true,
        createdAt: serverTimestamp(),
      })
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
