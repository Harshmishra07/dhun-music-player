import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { PlayerProvider } from './context/PlayerContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <PlayerProvider>
            <App />
        </PlayerProvider>
    </React.StrictMode>,
)

// Register service worker only in production
if ('serviceWorker' in navigator) {
    if (import.meta.env.PROD) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('✅ Service Worker registered:', reg.scope))
                .catch(err => console.log('⚠️ Service Worker registration failed:', err));
        });
    } else {
        // Automatically unregister service worker in development mode if it exists
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            for (let registration of registrations) {
                registration.unregister().then(() => {
                    console.log('🗑️ Service Worker unregistered in Dev mode');
                });
            }
        });
    }
}
