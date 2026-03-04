import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Bloquear menu de contexto (segurar) em links e botões
document.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('a, button, [role="button"], img, [onclick]')) {
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
