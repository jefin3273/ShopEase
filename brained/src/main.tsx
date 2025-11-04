import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { TrackingProvider } from './context/TrackingContext'
import ConsentBanner from './components/ConsentBanner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TrackingProvider>
          <App />
        </TrackingProvider>
      </AuthProvider>
      <ConsentBanner />
    </BrowserRouter>
  </StrictMode>,
)
