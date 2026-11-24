import type { ComponentProps, ReactNode } from 'react'

// Small building blocks shared by the pages. Each takes extra classes for
// layout (margins, width); its look comes from roles only.

export function classes(...names: (string | false | undefined)[]) {
  return names.filter(Boolean).join(' ')
}

// A page's main heading.
export function Heading({ className, ...props }: ComponentProps<'h1'>) {
  return (
    <h1
      className={classes('text-4xl font-bold tracking-tighter wrap-anywhere lg:text-5xl', className)}
      {...props}
    />
  )
}

// A raised box on the page: empty results, errors, loading.
export function Panel({ className, ...props }: ComponentProps<'div'>) {
  return <div className={classes('rounded-lg border bg-card p-6', className)} {...props} />
}

// The primary action.
export function Button({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={classes(
        'rounded-md border border-primary bg-primary px-3.5 py-2 text-primary-foreground hover:bg-primary-hover',
        className,
      )}
      {...props}
    />
  )
}

// A labelled form control: the label above, the control below.
export function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={classes('grid gap-1.5 text-sm font-semibold', className)}>
      <span>{label}</span>
      {children}
    </label>
  )
}

// The look of a text input or select inside a Field.
export const control = 'min-h-11 w-full rounded-md border border-input bg-field px-3 py-2 font-normal'
