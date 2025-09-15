import React, { useEffect, useState } from "react";
import Modal from "../Modal";

const API = "http://localhost:4000";

export default function ReportesPanel({ expedienteId }) {
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [editReporte, setEditReporte] = useState(null);
  const [reporteForm, setReporteForm] = useState({ contenido: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/expedientes/${expedienteId}/reportes`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        setReportes(data.success ? data.reportes : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [expedienteId]);

  const abrirNuevo = () => {
    setEditReporte(null);
    setReporteForm({ contenido: "" });
    setOpenModal(true);
  };

  const abrirEditar = (rp) => {
    setEditReporte(rp);
    setReporteForm({ contenido: rp.contenido });
    setOpenModal(true);
  };

  const guardarReporte = async (e) => {
    e.preventDefault();
    try {
      if (editReporte) {
        const res = await fetch(`${API}/api/reportes/${editReporte.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(reporteForm),
        });
        const data = await res.json();
        if (data.success) {
          setReportes((prev) => prev.map((x) => (x.id === editReporte.id ? data.reporte : x)));
          setOpenModal(false);
        }
      } else {
        const res = await fetch(`${API}/api/expedientes/${expedienteId}/reportes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(reporteForm),
        });
        const data = await res.json();
        if (data.success) {
          setReportes((prev) => [data.reporte, ...prev]);
          setOpenModal(false);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error guardando reporte");
    }
  };

  const eliminarReporte = async (id) => {
    if (!window.confirm("¿Eliminar reporte?")) return;
    try {
      const res = await fetch(`${API}/api/reportes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) setReportes((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p>Cargando reportes…</p>;

  return (
    <div className="card">
      <div className="card-header">
        <h3>Reportes</h3>
        <button className="btn" onClick={abrirNuevo}>+ Nuevo reporte</button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Contenido</th>
              <th>Generado por</th>
              <th>Fecha</th>
              <th style={{ width: 120 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reportes.length === 0 && (
              <tr><td colSpan="5" className="muted">Sin reportes</td></tr>
            )}
            {reportes.map((rp) => (
              <tr key={rp.id}>
                <td>{rp.id}</td>
                <td>{rp.contenido}</td>
                <td>{rp.generado_por || "-"}</td>
                <td>{rp.generado_en ? new Date(rp.generado_en).toLocaleString() : "-"}</td>
                <td>
                  <button className="btn btn-secondary" onClick={() => abrirEditar(rp)}>Editar</button>
                  <button className="btn btn-danger" onClick={() => eliminarReporte(rp.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editReporte ? "Editar reporte" : "Nuevo reporte"} width={520}>
        <form onSubmit={guardarReporte} className="form-grid">
          <label className="full">
            <span>Contenido *</span>
            <textarea
              value={reporteForm.contenido}
              onChange={(e) => setReporteForm({ ...reporteForm, contenido: e.target.value })}
              required
            />
          </label>
          <div className="actions">
            <button type="submit" className="btn btn-primary">Guardar</button>
            <button type="button" className="btn" onClick={() => setOpenModal(false)}>Cancelar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
