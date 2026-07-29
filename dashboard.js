document.addEventListener('DOMContentLoaded', () => {
  const keep100Toggle = document.getElementById('keep100ZoomToggle');
  const hideScrollbarsToggle = document.getElementById('hideScrollbarsToggle');
  
  chrome.storage.local.get(['keep100Zoom', 'hideScrollbars'], (result) => {
    keep100Toggle.checked = result.keep100Zoom || false;
    hideScrollbarsToggle.checked = result.hideScrollbars || false;
  });

  keep100Toggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ keep100Zoom: e.target.checked });
  });

  hideScrollbarsToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ hideScrollbars: e.target.checked });
  });

  function renderLayouts() {
    chrome.storage.local.get(null, (items) => {
      const container = document.getElementById('layoutsContainer');
      const layoutKeys = Object.keys(items).filter(k => k.startsWith('layout_'));
      
      if (layoutKeys.length === 0) {
        container.innerHTML = '<div class="empty-state">No saved layouts found.</div>';
        return;
      }

      container.innerHTML = '';
      layoutKeys.forEach(key => {
        const data = items[key];
        const layoutId = key.replace('layout_', '');
        const div = document.createElement('div');
        div.className = 'layout-item';
        
        const details = document.createElement('div');
        details.innerHTML = `<strong>${data.name}</strong> <span style="color:#94a3b8; font-size:0.85em; margin-left:8px;">(${data.urls.length} slots)</span>`;
        
        const btnGroup = document.createElement('div');
        btnGroup.className = 'btnGroup';

        const openBtn = document.createElement('button');
        openBtn.className = 'dashActionBtn openBtn';
        openBtn.textContent = 'Open Layout';
        openBtn.onclick = async () => {
          const targetUrl = chrome.runtime.getURL(`layout.html?id=${layoutId}`);
          const tabs = await chrome.tabs.query({});
          const existingTab = tabs.find(t => t.url && t.url === targetUrl);
          
          if (existingTab) {
            chrome.tabs.update(existingTab.id, { active: true });
          } else {
            chrome.tabs.create({ url: targetUrl });
          }
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'dashActionBtn deleteBtn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => {
          chrome.storage.local.remove(key, () => renderLayouts());
        };

        btnGroup.appendChild(openBtn);
        btnGroup.appendChild(deleteBtn);
        div.appendChild(details);
        div.appendChild(btnGroup);
        container.appendChild(div);
      });
    });
  }

  renderLayouts();

  chrome.storage.onChanged.addListener((changes) => {
    const hasLayoutChanges = Object.keys(changes).some(k => k.startsWith('layout_'));
    if (hasLayoutChanges) renderLayouts();
  });
});