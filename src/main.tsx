import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import App from './App.tsx'
import './index.css'
import StatementParser from "./StatementParser.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StatementParser />
  </StrictMode>,
)
