import { classes } from '../ui'
import { viewsOn } from './view'
import type { View } from './view'

const labels: Record<View, string> = { table: 'Table', small: 'Small cards', large: 'Large cards' }

// A list's view switch: one button per view this screen offers, the current
// one pressed. The group clips its corners, so the focus outline is drawn
// inside each button.
export function ViewSwitch({ view, narrow, onChange }: { view: View; narrow: boolean; onChange: (view: View) => void }) {
  return (
    <div role="group" aria-label="View" className="flex overflow-hidden rounded-md border text-sm">
      {viewsOn(narrow).map((name) => (
        <button
          key={name}
          type="button"
          aria-pressed={view === name}
          onClick={() => onChange(name)}
          className={classes('px-3 py-1.5 focus-visible:-outline-offset-3', view === name ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-hover')}
        >
          {labels[name]}
        </button>
      ))}
    </div>
  )
}
