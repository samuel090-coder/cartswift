import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { syncPriceFormatFromServer } from './lib/priceFormat'

// Sync the global admin-controlled price format setting at boot.
syncPriceFormatFromServer();

createRoot(document.getElementById("root")!).render(<App />);
