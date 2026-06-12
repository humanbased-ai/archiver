// Helper functions to save and load state from localStorage
export const loadState = (key: string) => {
  try {
    const serializedState = localStorage.getItem(key)
    const res = serializedState ? JSON.parse(serializedState) : undefined
    console.log('loadState', key, res)
    return res
  } catch (err) {
    console.error('Could not load state from localStorage', err)
    return undefined
  }
}

export const saveState = (key: string, state: Object) => {
  try {
    const serializedState = JSON.stringify(state)
    localStorage.setItem(key, serializedState)

    console.log('saveState', key, serializedState)
  } catch (err) {
    console.error('Could not save state to localStorage', err)
  }
}

export const resetState = (key: string) => {
  localStorage.setItem(key, '')
}
