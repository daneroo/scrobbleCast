// localStorage for the saved settings (theme, list views). Reaching it can
// itself throw (e.g. when the browser blocks storage), so it is reached on
// each use, where each setting catches it and keeps its own default.
export const browserStorage: Pick<Storage, 'getItem' | 'setItem'> = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
}
