import React from 'react'
import ReactDOM from 'react-dom/client'
import JourneyApp from './JourneyApp'
import '../fonts.css'
import './mobility.css'
import './journey.css'
import { registerOfflineGuide } from './offline'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><JourneyApp /></React.StrictMode>)

void registerOfflineGuide()
