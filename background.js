chrome.windows.onRemoved.addListener(async (windowId) => {
  try {
    const result = await chrome.storage.local.get('stardanceGroups')
    let groups = result.stardanceGroups || []
    let modified = false

    groups = groups.map(group => {
      if (group.windowIds.includes(windowId)) {
        modified = true
        group.windowIds = group.windowIds.filter(id => id !== windowId)
      }
      return group
    }).filter(group => group.windowIds.length > 0)

    if (modified) {
      await chrome.storage.local.set({ stardanceGroups: groups })
      chrome.runtime.sendMessage({ type: 'CLEANUP_GROUPS' }).catch(() => {})
    }
  } catch (e) {
    console.error(e)
  }
})