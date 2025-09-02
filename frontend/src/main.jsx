import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Expedientes from "./pages/Expedientes.jsx";
import Usuarios from "./pages/Usuarios.jsx";
import Reportes from "./pages/Reportes.jsx";
import Configuracion from "./pages/Configuracion.jsx";
import CrearExpediente from "./pages/CrearExpediente.jsx";
import '../src/Index.css';
import MainLayout from "./layouts/MainLayout";
import ExpedienteDetalle from "./pages/ExpedienteDetalle.jsx";
import ExpedientesList from "./pages/ExpedientesLista.jsx";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
        <Route path="/" element={<Login />} />
        <Route path="/" element={<ExpedientesList />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/expedientes" element={<Expedientes />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="/expedientes/nuevo" element={<CrearExpediente />} />
        <Route path="/expedientes/:id" element={<ExpedienteDetalle />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
