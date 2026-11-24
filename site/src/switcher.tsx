import { Monitor, Moon, Palette, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { deviceDarkQuery, themeSetting } from './theme'

// The page's theme setting. Reaching localStorage can itself throw (e.g. when
// the browser blocks storage), so it is reached on each use, where the
// setting catches it.
const setting = themeSetting({
  storage: {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  },
  darkQuery: matchMedia(deviceDarkQuery),
  page: document,
})

const modeIcons = { light: Sun, dark: Moon, system: Monitor }

// Two small buttons for the header: the mode setting (light, dark, system)
// and the theme. Each shows its current state and moves to the next on a
// click.
export function ThemeSwitcher() {
  const { theme, mode } = useSyncExternalStore(setting.subscribe, setting.get)
  const ModeIcon = modeIcons[mode]
  return (
    <div className="flex items-center">
      <SwitchButton label={`Mode: ${mode}`} onClick={setting.cycleMode}>
        <ModeIcon className="size-4.5" />
      </SwitchButton>
      <SwitchButton label={`Theme: ${theme}`} onClick={setting.cycleTheme}>
        <span className="relative">
          <Palette className="size-4.5" />
          {/* The theme's mark colour, which every theme sets off against
              its header. */}
          <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-switcher-dot ring-2 ring-header forced-color-adjust-none" />
        </span>
      </SwitchButton>
    </div>
  )
}

// An icon button in the header; the label is its tooltip and accessible name.
function SwitchButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-8.5 place-items-center rounded-md hover:bg-header-hover focus-visible:outline-header-ring"
    >
      {children}
    </button>
  )
}
