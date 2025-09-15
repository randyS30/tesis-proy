import React from "react";
import { Link } from "react-router-dom";

const API = "http://localhost:4000";

export default function ExpedienteInfo({ expediente }) {
  const analizarExpediente = async () => {
    const res = await fetch(`${API}/api/expedientes/${expediente.id}/analizar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = await res.json();
    if (data.success) {
      alert("✅ Análisis generado con IA");
    } else {
      alert("❌ Error en análisis");
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Expediente #{expediente.numero_expediente}</h2>
        <div className="actions">
          {expediente.archivo && (
            <a className="btn btn-light"
              href={`${API}/uploads/${expediente.archivo}`}
              target="_blank" rel="noreferrer">
              Ver archivo
            </a>
          )}
          <button className="btn btn-success" onClick={analizarExpediente}>
            🔎 Analizar con IA
          </button>
          <Link className="btn" to="/expedientes">Volver</Link>
        </div>
      </div>
      <div className="info-grid">
        <div><strong>Demandante:</strong> {expediente.demandante} ({expediente.demandante_doc || "-"})</div>
        <div><strong>Demandado:</strong> {expediente.demandado} ({expediente.demandado_doc || "-"})</div>
        <div><strong>Estado:</strong> {expediente.estado}</div>
        <div><strong>Inicio:</strong> {expediente.fecha_inicio?.substring(0, 10) || "-"}</div>
        <div><strong>Fin:</strong> {expediente.fecha_fin?.substring(0, 10) || "-"}</div>
        <div><strong>Creado por:</strong> {expediente.creado_por}</div>
      </div>
    </div>
  );
}
