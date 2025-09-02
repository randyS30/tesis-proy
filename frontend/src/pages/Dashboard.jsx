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
    // Cargar resumen numérico
    fetch("http://localhost:4000/api/dashboard/resumen")
      .then(r => r.json())
      .then(d => {
        if (d.success) setResumen(d.resumen);
      })
      .catch(err => console.error("Error cargando resumen:", err));

    // Cargar expedientes por estado y usuario
    fetch("http://localhost:4000/api/reportes")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const est = d.porEstado.map(e => ({
            estado: e.estado || "Sin estado",
            total: parseInt(e.total, 10) || 0
          }));
          const usu = d.porUsuario.map(u => ({
            usuario: u.usuario || u.creado_por || "Desconocido",
            total: parseInt(u.total, 10) || 0
          }));
          setPorEstado(est);
          setPorUsuario(usu);
        }
      })
      .catch(err => console.error("Error cargando estado/usuario:", err));

    // Cargar expedientes por mes
    fetch("http://localhost:4000/api/dashboard/mes")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const mes = d.data.map(m => ({
            mes: m.mes,
            total: parseInt(m.total, 10) || 0
          }));
          setPorMes(mes);
        }
      })
      .catch(err => console.error("Error cargando por mes:", err));
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
