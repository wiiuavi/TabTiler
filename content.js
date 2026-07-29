window.addEventListener('message', (event) => {
  if (event.data && typeof event.data.action === 'string' && event.data.action.startsWith('tabtiler_')) {
    const command = event.data.action.split('_')[1]
    if (command === 'back') window.history.back()
    if (command === 'forward') window.history.forward()
    if (command === 'refresh') window.location.reload()
  }
})

function applyScrollbarStyle(hide) {
  let styleEl = document.getElementById('tabtilerHideScrollbars')
  if (hide) {
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'tabtilerHideScrollbars'
      styleEl.textContent = `
        ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      `
      if (document.head) {
        document.head.appendChild(styleEl)
      } else {
        document.documentElement.appendChild(styleEl)
      }
    }
  } else {
    if (styleEl) styleEl.remove()
  }
}

chrome.storage.local.get(['hideScrollbars'], (result) => {
  applyScrollbarStyle(result.hideScrollbars !== false)
})

chrome.storage.onChanged.addListener((changes) => {
  if (changes.hideScrollbars) {
    applyScrollbarStyle(changes.hideScrollbars.newValue !== false)
  }
})