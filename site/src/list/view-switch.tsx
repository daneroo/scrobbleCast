import { classes } from '../ui'
import { views } from './view'
import type { View } from './view'

const labels: Record<View, string> = { table: 'Table', small: 'Small cards', large: 'Large cards' }

// A list's view switch: one button per view, the current one pressed.
export function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <div role="group" aria-label="View" className="flex overflow-hidden rounded-md border text-sm">
      {views.map((name) => (
        <button
          key={name}
          type="button"
          aria-pressed={view === name}
          onClick={() => onChange(name)}
          className={classes('px-3 py-1.5', view === name ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-hover')}
        >
          {labels[name]}
        </button>
      ))}
    </div>
  )
}
