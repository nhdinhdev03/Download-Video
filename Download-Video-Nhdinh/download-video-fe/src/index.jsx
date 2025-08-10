import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // Your global styles
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Measure performance if needed
reportWebVitals();
