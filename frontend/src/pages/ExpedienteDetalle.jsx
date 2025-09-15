import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ExpedienteInfo from "../components/expedientes/ExpedienteInfo";
import EventosPanel from "../components/expedientes/EventosPanel";
import ReportesPanel from "../components/expedientes/ReportesPanel";
import ArchivosPanel from "../components/expedientes/ArchivosPanel";

const API = "http://localhost:4000";

export default function ExpedienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expediente, setExpediente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("eventos");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/expedientes/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (!data.success) {
          alert("Expediente no encontrado");
          return navigate("/expedientes");
        }
        setExpediente(data.expediente);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  if (loading) return <div className="card">Cargando…</div>;
  if (!expediente) return null;

  return (
    <div className="page">
      <ExpedienteInfo expediente={expediente} />

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === "eventos" ? "active" : ""}`} onClick={() => setTab("eventos")}>Eventos</button>
        <button className={`tab ${tab === "reportes" ? "active" : ""}`} onClick={() => setTab("reportes")}>Reportes</button>
        <button className={`tab ${tab === "archivos" ? "active" : ""}`} onClick={() => setTab("archivos")}>Archivos</button>
      </div>

      {tab === "eventos" && <EventosPanel expedienteId={id} />}
      {tab === "reportes" && <ReportesPanel expedienteId={id} />}
      {tab === "archivos" && <ArchivosPanel expedienteId={id} />}
    </div>
  );
}
