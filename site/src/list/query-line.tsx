import { useId } from 'react'
import type { ReactNode } from 'react'
import { classes, control } from '../ui'
import type { FieldHelp, Help, Preset } from './query'

// A list's query line: the input; what the query didn't understand, a status
// that describes the input, so screen readers hear it as it changes; "Query
// help" drawn from the list's help; then the presets. Nothing here knows
// books.
export function QueryLine({ text, onChange, help, notUnderstood, presets, placeholder }: {
  text: string
  onChange: (text: string) => void
  help: Help
  notUnderstood: readonly string[]
  presets: readonly Preset[]
  placeholder?: string
}) {
  const statusId = useId()
  // A preset or "← Journal" starts a new query: from the top of the page.
  function go(next: string) {
    onChange(next)
    window.scrollTo({ top: 0 })
  }
  return (
    <>
      <label className="grid gap-1.5">
        <span className="sr-only">Query</span>
        <input
          type="search"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={placeholder}
          className={classes(control, 'font-mono text-base')}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={statusId}
        />
      </label>
      {/* Always there, empty when all is understood: a status announces changes, not its first content. */}
      <p id={statusId} role="status" className="text-sm text-muted-foreground empty:hidden mt-2">
        {notUnderstood.length > 0 && (
          <>Not understood: <code className="text-foreground line-through wrap-anywhere">{notUnderstood.join(' ')}</code></>
        )}
      </p>
      <details className="mt-2 text-sm text-muted-foreground">
        <summary className="cursor-pointer">Query help</summary>
        <HelpText help={help} />
      </details>
      <Presets text={text} presets={presets} onPick={go} />
    </>
  )
}

// One button per preset, in the list's order; the one whose query is in the
// line is pressed, and hovering shows its query. "← Journal" empties the
// line, so it is there only when the line isn't empty.
function Presets({ text, presets, onPick }: { text: string; presets: readonly Preset[]; onPick: (query: string) => void }) {
  const button = 'rounded-md border px-2.5 py-1 text-sm'
  const typed = text.trim()
  return (
    <div className="mt-3 mb-5 flex flex-wrap gap-1.5">
      {typed && <button type="button" onClick={() => onPick('')} className={classes(button, 'bg-card hover:bg-hover')}>← Journal</button>}
      {presets.map(({ label, query }) => (
        <button
          key={label}
          type="button"
          title={query}
          aria-pressed={typed === query}
          onClick={() => onPick(query)}
          className={classes(button, typed === query ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-hover')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// The fields grouped by how a value is typed (the numbers, the dates…), in
// the order the list gives them.
function bySyntax(fields: readonly FieldHelp[]) {
  const groups = new Map<string, FieldHelp[]>()
  for (const field of fields) groups.set(field.syntax, [...(groups.get(field.syntax) ?? []), field])
  return [...groups]
}

function HelpText({ help }: { help: Help }) {
  const labels = new Map(help.fields.map(({ key, label }) => [key, label]))
  return (
    <div className="mt-2 grid gap-3 rounded-md border bg-card p-3 sm:p-4">
      <p>{help.words}</p>
      {bySyntax(help.fields).map(([syntax, fields]) => (
        <section key={syntax} className="grid gap-1">
          <p className="text-foreground">Takes {syntax}.</p>
          <ul className="grid gap-1">
            {fields.map((field) => (
              <li key={field.key} className="pl-3">
                <Code>{field.key}:</Code>
                {field.aliases.map((alias) => <span key={alias}> or <Code>{alias}:</Code></span>)}
                {' '}{field.label}
                {field.note && <>, {field.note}</>}
                {!field.sorts && <> (filter only: no <Code>sort:</Code> or <Code>show:</Code>)</>}
                {field.alsoShow.length > 0 && <>; filtering on it also shows {field.alsoShow.map((key) => labels.get(key) ?? key).join(' and ')}</>}
                {'. '}<Code>{field.example}</Code>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p>
        <Code>sort:</Code> takes {help.sort.syntax}: <Code>{help.sort.example}</Code>.
        {' '}<Code>show:</Code> takes {help.show.syntax}: <Code>{help.show.example}</Code>.
      </p>
    </div>
  )
}

// Query text in the help.
function Code({ children }: { children: ReactNode }) {
  return <code className="whitespace-nowrap text-foreground">{children}</code>
}
