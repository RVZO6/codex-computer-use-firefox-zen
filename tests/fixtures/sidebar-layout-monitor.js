window.addEventListener('error', e=>{document.body.dataset.uiError=e.message;document.body.textContent=e.message});
window.addEventListener('unhandledrejection', e=>{document.body.dataset.uiError=String(e.reason);document.body.textContent=String(e.reason)});
