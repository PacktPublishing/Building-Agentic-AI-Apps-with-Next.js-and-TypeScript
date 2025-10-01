export interface User {
  id: string
  name: string
  email: string
}

interface UserState {
  user: User | null
  isLoading: boolean
  setUser: (user: User) => void
  clearUser: () => void
  setLoading: (loading: boolean) => void
}

// Simple store implementation without external dependencies
const userState: UserState = {
  user: null,
  isLoading: false,
  setUser: (user: User) => {
    userState.user = user
    // Trigger re-renders for components using this store
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("userStoreUpdate"))
    }
  },
  clearUser: () => {
    userState.user = null
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("userStoreUpdate"))
    }
  },
  setLoading: (isLoading: boolean) => {
    userState.isLoading = isLoading
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("userStoreUpdate"))
    }
  },
}

export const useUserStore = () => userState
