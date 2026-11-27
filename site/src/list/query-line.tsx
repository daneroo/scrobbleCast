import { CircleHelp, Search } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { classes, control } from '../ui'
import type { FieldHelp, Help, Preset } from './query'

// A list's query line, presets first, since they are how a list is mostly
// read: the presets with a Search button last; under them the input, full
// width, once opened (the button, or "/") or whenever the line holds a query
// that isn't a preset, so a typed query is never hidden; a "?" beside it for
// the help drawn from the list's help; then what the query didn't
// understand, a status that describes the input, so screen readers hear it
// as it changes. Escape, or picking a preset, closes the input (Escape only
// closes the help on a query of its own). Nothing here knows books, or scrolls: the list's page
// does, on every new query.
//
// `inputRef` is what the page focuses: the input when it shows, otherwise
// the Search button.
export function QueryLine({ text, onChange, onJournal, help, notUnderstood, presets, inputRef, placeholder }: {
  text: string
  // Typing, or picking a preset.
  onChange: (text: string) => void
  // "← Journal": the line is to be emptied. The button goes with it, so the
  // page moves focus to the input. Without it (a list with no journal), no
  // button: clearing the line is enough.
  onJournal?: () => void
  help: Help
  notUnderstood: readonly string[]
  presets: readonly Preset[]
  inputRef: RefObject<HTMLElement | null>
  placeholder?: string
}) {
  const statusId = useId()
  const helpId = useId()
  const [opened, setOpened] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const searchButton = useRef<HTMLButtonElement>(null)
  // What to focus once the input shows or hides: it, or the Search button.
  const focusNext = useRef<'input' | 'button' | null>(null)
  const typed = text.trim()
  // A query of its own keeps the input open.
  const ownQuery = typed !== '' && !presets.some(({ query }) => query === typed)
  const showInput = opened || ownQuery

  function openInput() {
    focusNext.current = 'input'
    setOpened(true)
  }

  function close() {
    setOpened(false)
    setHelpOpen(false)
  }

  // Focus the input once it shows, or the Search button once it hides, when
  // opening or Escape asked for it.
  useEffect(() => {
    const element = focusNext.current === 'input' ? input.current : focusNext.current === 'button' ? searchButton.current : null
    if (!element) return
    focusNext.current = null
    element.focus()
  }, [showInput])

  // "/" opens the search from anywhere but a field.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      if (input.current) input.current.focus()
      else openInput()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // The page's ref follows whichever of the input and the Search button shows.
  function focusTarget(element: HTMLElement | null) {
    if (element) inputRef.current = element
  }

  return (
    <div className="mb-5">
      <Presets
        text={text}
        presets={presets}
        onPick={(query) => {
          close()
          onChange(query)
        }}
        onJournal={onJournal}
        search={showInput ? undefined : (
          <button
            ref={(element) => {
              searchButton.current = element
              focusTarget(element)
            }}
            type="button"
            title="Search (/)"
            aria-expanded={false}
            onClick={openInput}
            className="flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-sm text-muted-foreground hover:bg-hover hover:text-foreground"
          >
            <Search aria-hidden className="size-3.5" />Search
          </button>
        )}
      />
      {showInput && (
        <div
          className="mt-2 flex gap-1.5"
          onBlur={(event) => {
            // An empty line closes when focus leaves the input and its "?",
            // unless the help is open.
            if (!typed && !helpOpen && !event.currentTarget.contains(event.relatedTarget)) close()
          }}
        >
          <label className="grow">
            <span className="sr-only">Query</span>
            <input
              ref={(element) => {
                input.current = element
                focusTarget(element)
              }}
              type="search"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              placeholder={placeholder}
              className={classes(control, 'font-mono text-base')}
              value={text}
              onChange={(event) => onChange(event.target.value)}
              // Opened by a query of its own, it stays open while it's
              // being edited, even emptied or turned into a preset's query.
              onFocus={() => setOpened(true)}
              onKeyDown={(event) => {
                // Not the browser's clear: the line is the page's query.
                if (event.key !== 'Escape') return
                event.preventDefault()
                // A query of its own keeps the input: Escape only closes the help.
                if (ownQuery) return setHelpOpen(false)
                focusNext.current = 'button'
                close()
              }}
              aria-describedby={statusId}
            />
          </label>
          <button
            type="button"
            aria-label="Query help"
            title="Query help"
            aria-expanded={helpOpen}
            aria-controls={helpId}
            // Keeps focus in the input, so it doesn't close on the click.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setHelpOpen((open) => !open)}
            className={classes('grid min-h-11 w-11 shrink-0 place-items-center rounded-md border', helpOpen ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-hover hover:text-foreground')}
          >
            <CircleHelp aria-hidden className="size-5" />
          </button>
        </div>
      )}
      {/* Always there, empty when all is understood: a status announces changes, not its first content. */}
      <p id={statusId} role="status" className="text-sm text-muted-foreground empty:hidden mt-2">
        {notUnderstood.length > 0 && (
          <>Not understood: <code className="text-foreground line-through wrap-anywhere">{notUnderstood.join(' ')}</code></>
        )}
      </p>
      {showInput && helpOpen && (
        <div id={helpId} className="text-sm text-muted-foreground">
          <HelpText help={help} />
        </div>
      )}
    </div>
  )
}

// One button per preset, in the list's order; the one whose query is in the
// line is pressed, and hovering shows its query. "← Journal" empties the
// line, so it is there only when the line isn't empty. `search` goes last.
function Presets({ text, presets, onPick, onJournal, search }: { text: string; presets: readonly Preset[]; onPick: (query: string) => void; onJournal?: () => void; search?: ReactNode }) {
  const buttonClass = 'rounded-md border px-2.5 py-1 text-sm'
  const typed = text.trim()
  return (
    <div className="flex flex-wrap gap-1.5">
      {typed && onJournal && <button type="button" onClick={onJournal} className={classes(buttonClass, 'bg-card hover:bg-hover')}>← Journal</button>}
      {presets.map(({ label, query }) => (
        <button
          key={label}
          type="button"
          title={query}
          aria-pressed={typed === query}
          onClick={() => onPick(query)}
          className={classes(buttonClass, typed === query ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-hover')}
        >
          {label}
        </button>
      ))}
      {search}
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
