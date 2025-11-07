import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: ThemeProviderProps) {
  const [theme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement
      const body = window.document.body
      
      // Set dark theme
      root.classList.remove("light")
      root.classList.add("dark")
      body.classList.remove("light")
      body.classList.add("dark")
      
      // Set the data attribute
      root.setAttribute('data-theme', 'dark')
      
      // Set the specific background colors for consistency
      body.style.backgroundColor = "#0B0B0B"
      
      // Force a style recalculation
      root.style.colorScheme = "dark"
    }
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {}, // No-op since we only use dark
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}