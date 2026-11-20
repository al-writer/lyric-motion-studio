import { createRoot } from 'react-dom/client'
// Fonts the templates use by default. A project brings any other font in its
// own assets/*.css (@font-face pointing at assets/fonts/*.woff2).
import '@fontsource-variable/fraunces'
import '@fontsource-variable/fraunces/wght-italic.css'
import '@fontsource-variable/inter'
import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'
import '@fontsource/caveat/600.css'
import App from './app/App.jsx'

createRoot(document.getElementById('root')).render(<App />)
