interface AppState {
  sidebarOpen: boolean
  theme: "light" | "dark" | "system"
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setTheme: (theme: "light" | "dark" | "system") => void
}

const appState: AppState = {
  sidebarOpen: true,
  theme: "system",
  setSidebarOpen: (sidebarOpen: boolean) => {
    appState.sidebarOpen = sidebarOpen
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("appStoreUpdate"))
    }
  },
  toggleSidebar: () => {
    appState.sidebarOpen = !appState.sidebarOpen
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("appStoreUpdate"))
    }
  },
  setTheme: (theme: "light" | "dark" | "system") => {
    appState.theme = theme
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("appStoreUpdate"))
    }
  },
}

export const useAppStore = () => appState
