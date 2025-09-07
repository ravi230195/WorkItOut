import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../App.tsx'
import '../styles/globals.css'

// Default to hard delete mode in the browser
if (typeof localStorage !== 'undefined' && localStorage.getItem('USE_HARD_DELETE') === null) {
  localStorage.setItem('USE_HARD_DELETE', 'true');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
