const urlParams = new URLSearchParams(window.location.search)
const layoutId = urlParams.get('id')
let layoutName = "TabTiler"
let panesState = []

chrome.storage.local.get([`layout_${layoutId}`], (result) => {
  const data = result[`layout_${layoutId}`]
  if (!data) return
  
  layoutName = data.name
  document.title = layoutName
  const grid = document.getElementById('grid')
  
  grid.className = data.urls.length <= 2 ? 'duo' : 'quad'

  data.urls.forEach((url, index) => {
    const container = document.createElement('div')
    container.className = 'paneContainer'
    container.id = `pane-${index}`
    
    const iframe = document.createElement('iframe')
    iframe.src = url || chrome.runtime.getURL('empty.html')
    iframe.id = `iframe-${index}`
    iframe.sandbox = "allow-scripts allow-forms allow-same-origin allow-popups allow-downloads"
    
    container.appendChild(iframe)
    grid.appendChild(container)
    
    panesState.push({ 
      index: index, 
      originalUrl: url,
      isEmpty: !url,
      zoom: 1
    })
  })
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get_state') {
    sendResponse({ name: layoutName, panes: panesState })
  } else if (request.action === 'pane_command') {
    const iframe = document.getElementById(`iframe-${request.index}`)
    if (iframe) {
      if (request.command === 'close') {
        iframe.src = chrome.runtime.getURL('empty.html')
        panesState[request.index].isEmpty = true
        panesState[request.index].originalUrl = ''
      } else if (request.command === 'extract') {
        window.open(panesState[request.index].originalUrl || iframe.src, '_blank')
        iframe.src = chrome.runtime.getURL('empty.html')
        panesState[request.index].isEmpty = true
        panesState[request.index].originalUrl = ''
      } else if (request.command === 'load') {
        let targetUrl = request.url
        if (!targetUrl.startsWith('http') && !targetUrl.startsWith('chrome')) {
          targetUrl = 'https://' + targetUrl
        }
        iframe.src = targetUrl
        panesState[request.index].isEmpty = false
        panesState[request.index].originalUrl = targetUrl
      } else if (request.command === 'zoom') {
        iframe.style.zoom = request.value
        panesState[request.index].zoom = request.value
      } else {
        iframe.contentWindow.postMessage({ action: `tabtiler_${request.command}` }, '*')
      }
    }
    sendResponse({ success: true })
  }
  return true
})