import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SWRConfig } from 'swr';
import './index.css';
import App from './App.jsx';

// SWR global configuration - follows client-swr-dedup best practice
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SWRConfig value={swrConfig}>
      <App />
    </SWRConfig>
  </StrictMode>
);
