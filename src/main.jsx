import React from "react";
import { createRoot } from "react-dom/client";
import Public from "./Public.jsx";
import Admin from "./Admin.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {location.pathname.startsWith('/admin')?<Admin/>:<Public/>}
  </React.StrictMode>,
);
