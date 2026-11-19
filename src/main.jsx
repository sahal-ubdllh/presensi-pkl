import 'leaflet/dist/leaflet.css';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import SplashScreen from './components/SplashScreen.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render (
  <React.StrictMode>
    <App />
    <SplashScreen />
  </React.StrictMode>
)