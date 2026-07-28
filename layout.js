const urlParams = new URLSearchParams(window.location.search)
const layoutId = urlParams.get('id')
let layoutName = "TabTiler"
let panesState = []

chrome.storage.local.get([`layout_${layoutId}`, 'keep100Zoom'], (result) => {
  const data = result[`layout_${layoutId}`]
  if (!data) return
  
  const keep100 = result.keep100Zoom || false
  layoutName = data.name
  document.title = layoutName
  const grid = document.getElementById('grid')
  
  const isDuo = data.urls.length <= 2
  grid.className = isDuo ? 'duo' : 'quad'
  const defaultZoom = keep100 ? 1.0 : (isDuo ? 0.5 : 0.25)

  data.urls.forEach((url, index) => {
    const container = document.createElement('div')
    container.className = 'paneContainer'
    container.id = `pane-${index}`
    
    const iframe = document.createElement('iframe')
    iframe.src = url || chrome.runtime.getURL('empty.html')
    iframe.id = `iframe-${index}`
    iframe.sandbox = "allow-scripts allow-forms allow-same-origin allow-popups allow-downloads"
    
    const initialZoom = data.zooms && data.zooms[index] !== undefined ? data.zooms[index] : defaultZoom
    iframe.style.zoom = initialZoom

    container.appendChild(iframe)
    grid.appendChild(container)
    
    panesState.push({ 
      index: index, 
      originalUrl: url,
      isEmpty: !url,
      zoom: initialZoom
    })
  })
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get_state') {
    sendResponse({ name: layoutName, panes: panesState, layoutId: layoutId })
  } else if (request.action === 'pane_command') {
    const iframe = document.getElementById(`iframe-${request.index}`)
    if (iframe) {
      if (request.command === 'close') {
        iframe.src = chrome.runtime.getURL('empty.html')
        panesState[request.index].isEmpty = true
        panesState[request.index].originalUrl = ''
      } else if (request.command === 'extract') {
        const targetUrl = panesState[request.index].originalUrl || iframe.src
        if (targetUrl && !targetUrl.includes('empty.html')) {
          chrome.tabs.create({ url: targetUrl })
        }
        iframe.src = chrome.runtime.getURL('empty.html')
        panesState[request.index].isEmpty = true
        panesState[request.index].originalUrl = ''
      } else if (request.command === 'load') {
        let targetUrl = request.url
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('chrome://')) {
          targetUrl = 'https://' + targetUrl
        }
        iframe.src = targetUrl
        panesState[request.index].isEmpty = false
        panesState[request.index].originalUrl = targetUrl
      } else if (request.command === 'refresh') {
        iframe.src = iframe.src
      } else if (request.command === 'zoom') {
        iframe.style.zoom = request.value
        panesState[request.index].zoom = request.value
      } else if (request.command === 'back') {
        try { iframe.contentWindow.history.back() } catch (e) {}
      } else if (request.command === 'forward') {
        try { iframe.contentWindow.history.forward() } catch (e) {}
      }
    }
    sendResponse({ success: true })
  }
  return true
})