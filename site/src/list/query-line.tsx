import { classes, control } from '../ui'
import type { FieldHelp, Help } from './query'

// A list's query line: the input, then "Query help" drawn from the list's
// help, with what the query didn't understand beside it, shown while the
// help is closed too. Nothing here knows books.
export function QueryLine({ text, onChange, help, notUnderstood, placeholder }: {
  text: string
  onChange: (text: string) => void
  help: Help
  notUnderstood: readonly string[]
  placeholder?: string
}) {
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
        />
      </label>
      <details className="mt-2 text-sm text-muted-foreground">
        <summary className="cursor-pointer">
          Query help
          {notUnderstood.length > 0 && (
            <> · Not understood: <code className="text-foreground line-through">{notUnderstood.join(' ')}</code></>
          )}
        </summary>
        <HelpText help={help} />
      </details>
    </>
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
                <code className="text-foreground">{field.key}:</code>
                {field.aliases.map((alias) => <span key={alias}> or <code className="text-foreground">{alias}:</code></span>)}
                {' '}{field.label}
                {field.note && <>, {field.note}</>}
                {field.alsoShow.length > 0 && <>; filtering on it also shows {field.alsoShow.map((key) => labels.get(key) ?? key).join(' and ')}</>}
                {'. '}<code className="whitespace-nowrap text-foreground">{field.example}</code>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p>
        <code className="text-foreground">sort:</code> takes {help.sort.syntax}: <code className="text-foreground">{help.sort.example}</code>.
        {' '}<code className="text-foreground">show:</code> takes {help.show.syntax}: <code className="text-foreground">{help.show.example}</code>.
      </p>
    </div>
  )
}
