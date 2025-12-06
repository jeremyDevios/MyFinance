import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e) {
  console.error("Failed to start app:", e);
  document.body.innerHTML = `<div style="color: red; padding: 20px;">
    <h1>Failed to start application</h1>
    <pre>${e instanceof Error ? e.message : String(e)}</pre>
  </div>`;
}
