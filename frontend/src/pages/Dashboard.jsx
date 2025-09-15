import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from "recharts";
import "./Dashboard.css";

const colores = ["#800000", "#cc8800", "#004080", "#999"];

const Dashboard = () => {
  const [resumen, setResumen] = useState({
    total: 0,
    abiertos: 0,
    cerrados: 0,
    usuarios: 0
  });
  const [porEstado, setPorEstado] = useState([]);
  const [porUsuario, setPorUsuario] = useState([]);
  const [porMes, setPorMes] = useState([]);

  useEffect(() => {
  const token = localStorage.getItem("token");

  // si no hay token, redirigimos al login
  if (!token) {
    window.location.href = "/login";
    return;
  }

  // Cargar dashboard (resumen + estado + usuario)
  fetch("http://localhost:4000/api/dashboard", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((r) => r.json())
    .then((d) => {
      if (d.success) {
        const { indicadores, porEstado, porUsuario } = d;

        setResumen({
          total: indicadores.total || 0,
          abiertos: (indicadores.total || 0) - (indicadores.cerrados || 0),
          cerrados: indicadores.cerrados || 0,
          usuarios: porUsuario.length || 0,
        });

        setPorEstado(
          porEstado.map((e) => ({
            estado: e.estado || "Sin estado",
            total: parseInt(e.total, 10) || 0,
          }))
        );

        setPorUsuario(
          porUsuario.map((u) => ({
            usuario: u.usuario || "Desconocido",
            total: parseInt(u.total, 10) || 0,
          }))
        );
      }
    })
    .catch((err) => console.error("Error cargando dashboard:", err));
}, []);


  return (
    <div className="dash-container">
      <div className="dash-header">
        <h2>Dashboard</h2>
        <Link to="/expedientes" className="btn btn-primary">
          Ver Expedientes
        </Link>
      </div>

      {/* Cards de resumen */}
      <div className="dash-cards">
        <div className="card resumen">
          <h3>Total Expedientes</h3>
          <p>{resumen.total}</p>
        </div>
        <div className="card resumen">
          <h3>Abiertos</h3>
          <p>{resumen.abiertos}</p>
        </div>
        <div className="card resumen">
          <h3>Cerrados</h3>
          <p>{resumen.cerrados}</p>
        </div>
        <div className="card resumen">
          <h3>Usuarios</h3>
          <p>{resumen.usuarios}</p>
        </div>
      </div>

      <div className="dash-grid">
        {/* Expedientes por Estado */}
        <div className="card">
          <h3>Expedientes por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={porEstado}
                dataKey="total"
                nameKey="estado"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {porEstado.map((_, i) => (
                  <Cell key={i} fill={colores[i % colores.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Expedientes por Usuario */}
        <div className="card">
          <h3>Expedientes por Usuario</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={porUsuario}>
              <XAxis dataKey="usuario" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#800000" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expedientes por mes */}
      <div className="card">
        <h3>Evolución de Expedientes por Mes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={porMes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#004080" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
