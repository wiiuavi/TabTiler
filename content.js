window.addEventListener('message', (event) => {
  if (event.data && typeof event.data.action === 'string' && event.data.action.startsWith('tabtiler_')) {
    const command = event.data.action.split('_')[1]
    if (command === 'back') window.history.back()
    if (command === 'forward') window.history.forward()
    if (command === 'refresh') window.location.reload()
  }
})