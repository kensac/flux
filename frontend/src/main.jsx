import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Operations from './Operations.jsx'
import './index.css'

function Router() {
  // Get the pathname and handle /app/ base path
  const path = window.location.pathname;
  
  // Check for operations page (with or without /app/ prefix)
  if (path === '/operations' || path === '/operations.html' || 
      path === '/app/operations' || path === '/app/operations.html') {
    return <Operations />;
  }
  
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
)
