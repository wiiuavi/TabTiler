let availableTabs = []
let selectedTabIds = new Set()
let activeTabId = null

const elements = {
  createView: document.getElementById('createView'),
  manageView: document.getElementById('manageView'),
  tabContainer: document.getElementById('tabContainer'),
  createLayoutBtn: document.getElementById('createLayoutBtn'),
  layoutNameInput: document.getElementById('layoutNameInput'),
  activeLayoutName: document.getElementById('activeLayoutName'),
  panesContainer: document.getElementById('panesContainer')
}

async function initializeApp() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
  activeTabId = activeTab.id

  if (activeTab.url && activeTab.url.includes(chrome.runtime.id) && activeTab.url.includes('layout.html')) {
    elements.manageView.classList.remove('hidden')
    fetchActiveLayoutState()
  } else {
    elements.createView.classList.remove('hidden')
    fetchAvailableTabs()
    setupCreateListeners()
  }
}

async function fetchAvailableTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true })
  availableTabs = tabs.filter(tab => !tab.url.startsWith('chrome-extension://') && tab.id !== activeTabId)
  
  availableTabs.forEach(tab => {
    const wrapper = document.createElement('label')
    wrapper.className = 'tabWrapper'
    
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.value = tab.id
    checkbox.className = 'tabCheckbox'
    
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        if (selectedTabIds.size >= 4) {
          e.target.checked = false
          return
        }
        selectedTabIds.add(tab.id)
      } else {
        selectedTabIds.delete(tab.id)
      }
      updateCreateButton()
    })

    const titleSpan = document.createElement('span')
    titleSpan.className = 'tabTitle'
    titleSpan.textContent = tab.title

    wrapper.appendChild(checkbox)
    wrapper.appendChild(titleSpan)
    elements.tabContainer.appendChild(wrapper)
  })
}

function updateCreateButton() {
  const count = selectedTabIds.size
  const isValid = count === 2 || count === 3 || count === 4
  elements.createLayoutBtn.disabled = !isValid
  
  if (count === 0) elements.createLayoutBtn.textContent = 'Select 2-4 Tabs'
  else if (count === 1) elements.createLayoutBtn.textContent = 'Select at least 1 more'
  else if (count === 3) elements.createLayoutBtn.textContent = 'Tile 3 Tabs (+1 Empty)'
  else elements.createLayoutBtn.textContent = `Tile ${count} Tabs`
}

function setupCreateListeners() {
  elements.createLayoutBtn.addEventListener('click', async () => {
    elements.createLayoutBtn.disabled = true
    let tabsToProcess = Array.from(selectedTabIds)
    let urlsToLoad = []

    for (let id of tabsToProcess) {
      const tabInfo = await chrome.tabs.get(id)
      urlsToLoad.push(tabInfo.url)
    }

    if (urlsToLoad.length === 3) urlsToLoad.push('')

    const customName = elements.layoutNameInput.value.trim()
    const layoutName = customName || (urlsToLoad.length > 2 ? 'Quad Tile' : 'Duo Tile')
    const layoutId = Date.now().toString()

    await chrome.storage.local.set({ 
      [`layout_${layoutId}`]: { name: layoutName, urls: urlsToLoad } 
    })

    await chrome.tabs.remove(tabsToProcess)
    chrome.tabs.create({ url: `layout.html?id=${layoutId}` })
  })
}

function fetchActiveLayoutState() {
  chrome.tabs.sendMessage(activeTabId, { action: 'get_state' }, (response) => {
    if (chrome.runtime.lastError || !response) return
    
    elements.activeLayoutName.textContent = response.name
    elements.panesContainer.innerHTML = ''

    response.panes.forEach((pane) => {
      const card = document.createElement('div')
      card.className = 'paneControlCard'
      
      const title = document.createElement('span')
      title.className = 'paneName'
      title.textContent = pane.isEmpty ? `Slot ${pane.index + 1} (Empty)` : `Slot ${pane.index + 1}`
      
      const actions = document.createElement('div')
      actions.className = 'paneActions'
      
      if (!pane.isEmpty) {
        actions.appendChild(createActionBtn('⬅', 'back', pane.index))
        actions.appendChild(createActionBtn('➡', 'forward', pane.index))
        actions.appendChild(createActionBtn('↻', 'refresh', pane.index))
        actions.appendChild(createActionBtn('✕', 'close', pane.index, true))
      }

      card.appendChild(title)
      card.appendChild(actions)
      elements.panesContainer.appendChild(card)
    })
  })
}

function createActionBtn(icon, command, index, isClose = false) {
  const btn = document.createElement('button')
  btn.className = isClose ? 'actionBtn closeBtn' : 'actionBtn'
  btn.textContent = icon
  btn.onclick = () => {
    chrome.tabs.sendMessage(activeTabId, { action: 'pane_command', command: command, index: index })
    if (isClose) setTimeout(fetchActiveLayoutState, 100)
  }
  return btn
}

document.addEventListener('DOMContentLoaded', initializeApp)