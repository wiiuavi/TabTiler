let availableTabs = []
let activeGroups = []
let selectedTabIds = new Set()

const elements = {
  tabContainer: document.getElementById('tabContainer'),
  createLayoutBtn: document.getElementById('createLayoutBtn'),
  activeLayoutsSection: document.getElementById('activeLayoutsSection'),
  activeGroupsContainer: document.getElementById('activeGroupsContainer'),
  statusBadge: document.getElementById('statusBadge')
}

async function initializeApp() {
  await fetchAvailableTabs()
  await loadActiveGroups()
  setupEventListeners()
  updateCreateButtonState()
}

async function fetchAvailableTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true })
  availableTabs = tabs.filter(tab => !tab.url.startsWith('chrome-extension://'))
  renderTabList()
}

function renderTabList() {
  elements.tabContainer.innerHTML = ''
  
  if (availableTabs.length === 0) {
    elements.tabContainer.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">No tileable tabs found.</p>'
    return
  }

  availableTabs.forEach(tab => {
    const wrapper = document.createElement('label')
    wrapper.className = 'flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors border border-transparent has-[:checked]:border-sky-500/50 has-[:checked]:bg-slate-700/30'
    
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.value = tab.id
    checkbox.className = 'w-4 h-4 rounded border-slate-600 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900 bg-slate-800 cursor-pointer'
    
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
      updateCreateButtonState()
    })

    const titleSpan = document.createElement('span')
    titleSpan.className = 'text-sm text-slate-200 truncate flex-1'
    titleSpan.textContent = tab.title

    wrapper.appendChild(checkbox)
    wrapper.appendChild(titleSpan)
    elements.tabContainer.appendChild(wrapper)
  })
}

function updateCreateButtonState() {
  const count = selectedTabIds.size
  const isValid = count === 2 || count === 3 || count === 4
  elements.createLayoutBtn.disabled = !isValid
  
  if (count === 0) {
    elements.createLayoutBtn.textContent = 'Select 2-4 Tabs'
  } else if (count === 1) {
    elements.createLayoutBtn.textContent = 'Select at least 1 more'
  } else if (count === 3) {
    elements.createLayoutBtn.textContent = 'Tile 3 Tabs (+1 New Tab)'
  } else {
    elements.createLayoutBtn.textContent = `Tile ${count} Tabs`
  }
}

async function loadActiveGroups() {
  const result = await chrome.storage.local.get('stardanceGroups')
  activeGroups = result.stardanceGroups || []
  renderActiveGroups()
}

async function saveActiveGroups() {
  await chrome.storage.local.set({ stardanceGroups: activeGroups })
}

function renderActiveGroups() {
  elements.activeGroupsContainer.innerHTML = ''
  
  if (activeGroups.length === 0) {
    elements.activeLayoutsSection.classList.add('hidden')
    return
  }
  
  elements.activeLayoutsSection.classList.remove('hidden')

  activeGroups.forEach((group, index) => {
    const groupCard = document.createElement('div')
    groupCard.className = 'bg-slate-900/50 p-3 rounded-lg border border-slate-700/30'

    const header = document.createElement('div')
    header.className = 'flex justify-between items-center mb-3'
    
    const title = document.createElement('span')
    title.className = 'text-xs font-medium text-sky-400'
    title.textContent = `Layout ${index + 1} (${group.type})`
    
    const focusBtn = document.createElement('button')
    focusBtn.className = 'text-[10px] uppercase tracking-wider bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded transition-colors'
    focusBtn.textContent = 'Focus'
    focusBtn.onclick = () => focusGroup(group.windowIds)

    header.appendChild(title)
    header.appendChild(focusBtn)
    groupCard.appendChild(header)

    const globalZoomWrapper = document.createElement('div')
    globalZoomWrapper.className = 'mb-3 pb-3 border-b border-slate-700/50'
    globalZoomWrapper.appendChild(createZoomSlider('Group Zoom', 1, (val) => updateGroupZoom(group, val)))
    groupCard.appendChild(globalZoomWrapper)

    group.tabs.forEach((tab) => {
      const tabZoomWrapper = document.createElement('div')
      tabZoomWrapper.className = 'mt-2'
      tabZoomWrapper.appendChild(createZoomSlider(tab.title, 1, (val) => updateTabZoom(tab.id, val), true))
      groupCard.appendChild(tabZoomWrapper)
    })

    elements.activeGroupsContainer.appendChild(groupCard)
  })
}

function createZoomSlider(label, initialValue, onChange, isSub = false) {
  const container = document.createElement('div')
  
  const header = document.createElement('div')
  header.className = 'flex justify-between items-center mb-1'
  
  const labelSpan = document.createElement('span')
  labelSpan.className = `truncate ${isSub ? 'text-[10px] text-slate-400 max-w-[200px]' : 'text-xs text-slate-300'}`
  labelSpan.textContent = label
  
  const valueSpan = document.createElement('span')
  valueSpan.className = 'text-[10px] text-sky-400 font-mono'
  valueSpan.textContent = `${Math.round(initialValue * 100)}%`

  const input = document.createElement('input')
  input.type = 'range'
  input.min = '0.25'
  input.max = '2.0'
  input.step = '0.05'
  input.value = initialValue
  input.className = 'customRange'
  
  input.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value)
    valueSpan.textContent = `${Math.round(val * 100)}%`
    onChange(val)
  })

  header.appendChild(labelSpan)
  header.appendChild(valueSpan)
  container.appendChild(header)
  container.appendChild(input)
  
  return container
}

async function updateGroupZoom(group, zoomValue) {
  for (const tab of group.tabs) {
    await updateTabZoom(tab.id, zoomValue)
  }
}

async function updateTabZoom(tabId, zoomValue) {
  try {
    await chrome.tabs.setZoom(tabId, zoomValue)
  } catch (e) {
    console.error(e)
  }
}

async function focusGroup(windowIds) {
  for (const winId of windowIds) {
    try {
      await chrome.windows.update(winId, { focused: true })
    } catch (e) {
      console.error(e)
    }
  }
}

async function createLayout() {
  elements.createLayoutBtn.disabled = true
  elements.statusBadge.textContent = 'Building...'
  
  let tabsToProcess = Array.from(selectedTabIds)
  
  if (tabsToProcess.length === 3) {
    const newTab = await chrome.tabs.create({ url: 'chrome://newtab', active: false })
    tabsToProcess.push(newTab.id)
  }

  const screenW = window.screen.availWidth
  const screenH = window.screen.availHeight
  const halfW = Math.floor(screenW / 2)
  const halfH = Math.floor(screenH / 2)
  
  let coordinates = []
  const layoutType = tabsToProcess.length === 2 ? 'Duo' : 'Quad'

  if (layoutType === 'Duo') {
    coordinates = [
      { left: 0, top: 0, width: halfW, height: screenH },
      { left: halfW, top: 0, width: halfW, height: screenH }
    ]
  } else {
    coordinates = [
      { left: 0, top: 0, width: halfW, height: halfH },
      { left: halfW, top: 0, width: halfW, height: halfH },
      { left: 0, top: halfH, width: halfW, height: halfH },
      { left: halfW, top: halfH, width: halfW, height: halfH }
    ]
  }

  const groupData = {
    id: Date.now().toString(),
    type: layoutType,
    windowIds: [],
    tabs: []
  }

  for (let i = 0; i < tabsToProcess.length; i++) {
    const tabId = tabsToProcess[i]
    const pos = coordinates[i]
    
    try {
      const tabInfo = await chrome.tabs.get(tabId)
      const newWin = await chrome.windows.create({
        tabId: tabId,
        type: 'popup',
        left: pos.left,
        top: pos.top,
        width: pos.width,
        height: pos.height
      })
      
      groupData.windowIds.push(newWin.id)
      groupData.tabs.push({
        id: tabId,
        title: tabInfo.title || 'New Tab'
      })
    } catch (e) {
      console.error(e)
    }
  }

  activeGroups.push(groupData)
  await saveActiveGroups()
  
  selectedTabIds.clear()
  await fetchAvailableTabs()
  renderActiveGroups()
  
  elements.statusBadge.textContent = 'Ready'
  updateCreateButtonState()
}

function setupEventListeners() {
  elements.createLayoutBtn.addEventListener('click', createLayout)
  
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'CLEANUP_GROUPS') {
      loadActiveGroups()
    }
  })
}

document.addEventListener('DOMContentLoaded', initializeApp)