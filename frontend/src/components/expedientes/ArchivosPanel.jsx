import React, { useEffect, useState } from "react";
import Modal from "../Modal";

const API = "http://localhost:4000";

export default function ArchivosPanel({ expedienteId }) {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/expedientes/${expedienteId}/archivos`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        setArchivos(data.success ? data.archivos : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [expedienteId]);

  const subirArchivos = async (e) => {
    e.preventDefault();
    if (!filesToUpload || filesToUpload.length === 0) {
      alert("Selecciona al menos un archivo");
      return;
    }
    const formData = new FormData();
    for (let f of filesToUpload) {
      formData.append("archivos", f);
    }
    formData.append("subido_por", "usuario_demo");

    try {
      const res = await fetch(`${API}/api/expedientes/${expedienteId}/archivos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setArchivos((prev) => [...prev, ...data.archivos]);
        setOpenModal(false);
        setFilesToUpload(null);
      }
    } catch (err) {
      console.error(err);
      alert("Error subiendo archivos");
    }
  };

  const eliminarArchivo = async (id) => {
    if (!window.confirm("¿Eliminar archivo?")) return;
    try {
      const res = await fetch(`${API}/api/archivos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) setArchivos((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const analizarArchivo = async (id) => {
    try {
      const res = await fetch(`${API}/api/expedientes/archivos/${id}/analizar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Análisis generado con IA");
      } else {
        alert("❌ No se pudo analizar");
      }
    } catch (err) {
      console.error(err);
      alert("Error analizando archivo con IA");
    }
  };

  if (loading) return <p>Cargando archivos…</p>;

  return (
    <div className="card">
      <div className="card-header">
        <h3>Archivos</h3>
        <button className="btn" onClick={() => setOpenModal(true)}>+ Subir archivos</button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Subido por</th>
              <th>Fecha</th>
              <th style={{ width: 220 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {archivos.length === 0 && (
              <tr><td colSpan="5" className="muted">Sin archivos</td></tr>
            )}
            {archivos.map((ar) => (
              <tr key={ar.id}>
                <td>{ar.id}</td>
                <td>{ar.nombre_original}</td>
                <td>{ar.subido_por}</td>
                <td>{ar.subido_en ? new Date(ar.subido_en).toLocaleString() : "-"}</td>
                <td>
                  <a className="btn btn-light"
                     href={`${API}/api/archivos/${ar.id}/download`}
                     target="_blank" rel="noreferrer">
                    Descargar
                  </a>
                  <button className="btn btn-warning" onClick={() => analizarArchivo(ar.id)}>
                    🔎 Analizar con IA
                  </button>
                  <button className="btn btn-danger" onClick={() => eliminarArchivo(ar.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Subir archivos" width={480}>
        <form onSubmit={subirArchivos} className="form-grid">
          <label className="full">
            <input type="file" multiple onChange={(e) => setFilesToUpload(e.target.files)} />
          </label>
          <div className="actions">
            <button type="submit" className="btn btn-primary">Subir</button>
            <button type="button" className="btn" onClick={() => setOpenModal(false)}>Cancelar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
