import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/fraunces/wght-italic.css'
import '@fontsource-variable/inter'
// Cyrillic incl. Kazakh (Ққ Ғғ Ңң Үү Ұұ Әә Өө Іі Һһ)
import '@fontsource-variable/lora'
import '@fontsource-variable/lora/wght-italic.css'
import '@fontsource-variable/rubik'
import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'
import '@fontsource/caveat/600.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)
