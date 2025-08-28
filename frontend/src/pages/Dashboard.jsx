import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import "./Dashboard.css";

const colores = ["#800000", "#cc8800", "#004080", "#999"];

const Dashboard = () => {
  const [data, setData] = useState({ porEstado: [], porUsuario: [] });

  useEffect(() => {
    fetch("http://localhost:4000/api/reportes")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
      });
  }, []);

  return (
    <div className="dash-container">
      <div className="dash-header">
        <h2>Dashboard</h2>
        <Link to="/expedientes" className="btn btn-primary">Ver Expedientes</Link>
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3>Expedientes por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.porEstado}
                dataKey="total"
                nameKey="estado"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {data.porEstado.map((_, i) => (
                  <Cell key={i} fill={colores[i % colores.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Expedientes por Usuario</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.porUsuario}>
              <XAxis dataKey="creado_por" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#800000" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
