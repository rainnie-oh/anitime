import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";
import catalog from "./catalog.json";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App catalog={catalog} />
  </React.StrictMode>,
);
