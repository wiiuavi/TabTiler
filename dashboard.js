document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(null, (items) => {
    const container = document.getElementById('layoutsContainer');
    const layoutKeys = Object.keys(items).filter(k => k.startsWith('layout_'));
    
    if (layoutKeys.length === 0) {
      container.innerHTML = '<div class="empty-state">No active tile layouts found in storage.</div>';
      return;
    }

    container.innerHTML = '';
    layoutKeys.forEach(key => {
      const data = items[key];
      const div = document.createElement('div');
      div.className = 'layout-item';
      
      const details = document.createElement('div');
      details.innerHTML = `<strong>${data.name}</strong> <span style="color:#94a3b8; font-size:0.85em; margin-left:8px;">(${data.urls.length} slots)</span>`;
      
      const cleanBtn = document.createElement('button');
      cleanBtn.textContent = 'Delete Data';
      cleanBtn.style.cssText = 'background: #7f1d1d; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer;';
      cleanBtn.onclick = () => {
        chrome.storage.local.remove(key, () => div.remove());
      };

      div.appendChild(details);
      div.appendChild(cleanBtn);
      container.appendChild(div);
    });
  });
});