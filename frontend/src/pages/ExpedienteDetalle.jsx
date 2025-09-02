import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Modal from "../components/Modal";

const API = "http://localhost:4000";

export default function ExpedienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [expediente, setExpediente] = useState(null);
  const [tab, setTab] = useState("eventos");
  const [loading, setLoading] = useState(true);

  // ===================== EVENTOS =====================
  const [eventos, setEventos] = useState([]);
  const [openEvento, setOpenEvento] = useState(false);
  const [editEvento, setEditEvento] = useState(null);
  const [eventoForm, setEventoForm] = useState({
    tipo_evento: "",
    descripcion: "",
    fecha_evento: "",
  });

  // ===================== REPORTES =====================
  const [reportes, setReportes] = useState([]);
  const [openReporte, setOpenReporte] = useState(false);
  const [editReporte, setEditReporte] = useState(null);
  const [reporteForm, setReporteForm] = useState({
    contenido: "",
    generado_por: 1, // simula usuario logueado
  });

  // ===================== ARCHIVOS =====================
  const [archivos, setArchivos] = useState([]);
  const [openArchivo, setOpenArchivo] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState(null);

  // ===================== CARGA INICIAL =====================
  useEffect(() => {
    const load = async () => {
      try {
        const e = await fetch(`${API}/api/expedientes/${id}`).then((r) => r.json());
        if (!e.success) {
          alert("Expediente no encontrado");
          return navigate("/expedientes");
        }
        setExpediente(e.expediente);

        const ev = await fetch(`${API}/api/expedientes/${id}/eventos`).then((r) => r.json());
        setEventos(ev.success ? ev.eventos : []);

        const rp = await fetch(`${API}/api/expedientes/${id}/reportes`).then((r) => r.json());
        setReportes(rp.success ? rp.reportes : []);

        const ar = await fetch(`${API}/api/expedientes/${id}/archivos`).then((r) => r.json());
        setArchivos(ar.success ? ar.archivos : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  // ===================== EVENTOS CRUD =====================
  const abrirNuevoEvento = () => {
    setEditEvento(null);
    setEventoForm({ tipo_evento: "", descripcion: "", fecha_evento: "" });
    setOpenEvento(true);
  };
  const abrirEditarEvento = (ev) => {
    setEditEvento(ev);
    setEventoForm({
      tipo_evento: ev.tipo_evento,
      descripcion: ev.descripcion || "",
      fecha_evento: ev.fecha_evento?.substring(0, 10) || "",
    });
    setOpenEvento(true);
  };
  const guardarEvento = async (e) => {
    e.preventDefault();
    try {
      if (editEvento) {
        const r = await fetch(`${API}/api/eventos/${editEvento.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventoForm),
        }).then((r) => r.json());
        if (r.success) {
          setEventos((prev) =>
            prev.map((x) => (x.id === editEvento.id ? r.evento : x))
          );
          setOpenEvento(false);
        } else {
          alert("No se pudo editar");
        }
      } else {
        const r = await fetch(`${API}/api/expedientes/${id}/eventos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventoForm),
        }).then((r) => r.json());
        if (r.success) {
          setEventos((prev) => [r.evento, ...prev]);
          setOpenEvento(false);
        } else {
          alert("No se pudo crear");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error guardando evento");
    }
  };
  const eliminarEvento = async (evId) => {
    if (!confirm("¿Eliminar evento?")) return;
    try {
      const r = await fetch(`${API}/api/eventos/${evId}`, { method: "DELETE" }).then((r) => r.json());
      if (r.success) setEventos((prev) => prev.filter((x) => x.id !== evId));
    } catch (err) {
      console.error(err);
    }
  };

  // ===================== REPORTES CRUD =====================
  const abrirNuevoReporte = () => {
    setEditReporte(null);
    setReporteForm({ contenido: "", generado_por: 1 });
    setOpenReporte(true);
  };
  const abrirEditarReporte = (rp) => {
    setEditReporte(rp);
    setReporteForm({ contenido: rp.contenido, generado_por: rp.generado_por || 1 });
    setOpenReporte(true);
  };
  const guardarReporte = async (e) => {
    e.preventDefault();
    try {
      if (editReporte) {
        const r = await fetch(`${API}/api/reportes/${editReporte.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contenido: reporteForm.contenido }),
        }).then((r) => r.json());
        if (r.success) {
          setReportes((prev) =>
            prev.map((x) => (x.id === editReporte.id ? r.reporte : x))
          );
          setOpenReporte(false);
        } else {
          alert("No se pudo editar");
        }
      } else {
        const r = await fetch(`${API}/api/expedientes/${id}/reportes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reporteForm),
        }).then((r) => r.json());
        if (r.success) {
          setReportes((prev) => [r.reporte, ...prev]);
          setOpenReporte(false);
        } else {
          alert("No se pudo crear");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error guardando reporte");
    }
  };
  const eliminarReporte = async (rpId) => {
    if (!confirm("¿Eliminar reporte?")) return;
    try {
      const r = await fetch(`${API}/api/reportes/${rpId}`, { method: "DELETE" }).then((r) => r.json());
      if (r.success) setReportes((prev) => prev.filter((x) => x.id !== rpId));
    } catch (err) {
      console.error(err);
    }
  };

  // ===================== ARCHIVOS CRUD =====================
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
    formData.append("subido_por", "admin");

    try {
      const r = await fetch(`${API}/api/expedientes/${id}/archivos`, {
        method: "POST",
        body: formData,
      }).then((r) => r.json());
      if (r.success) {
        setArchivos((prev) => [...r.archivos, ...prev]);
        setOpenArchivo(false);
        setFilesToUpload(null);
      } else {
        alert("No se pudo subir");
      }
    } catch (err) {
      console.error(err);
      alert("Error subiendo archivos");
    }
  };
  const eliminarArchivo = async (archivoId) => {
    if (!confirm("¿Eliminar archivo?")) return;
    try {
      const r = await fetch(`${API}/api/archivos/${archivoId}`, { method: "DELETE" }).then((r) => r.json());
      if (r.success) setArchivos((prev) => prev.filter((x) => x.id !== archivoId));
    } catch (err) {
      console.error(err);
    }
  };

  // ===================== RENDER =====================
  if (loading) return <div className="card"><p>Cargando…</p></div>;
  if (!expediente) return null;

  return (
    <div className="page">
      {/* Encabezado */}
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
            <Link className="btn" to="/expedientes">Volver</Link>
          </div>
        </div>
        <div className="info-grid">
          <div><strong>Demandante:</strong> {expediente.demandante} ({expediente.demandante_doc || "-"})</div>
          <div><strong>Demandado:</strong> {expediente.demandado} ({expediente.demandado_doc || "-"})</div>
          <div><strong>Estado:</strong> {expediente.estado}</div>
          <div><strong>Inicio:</strong> {expediente.fecha_inicio?.substring(0,10) || "-"}</div>
          <div><strong>Fin:</strong> {expediente.fecha_fin?.substring(0,10) || "-"}</div>
          <div><strong>Creado por:</strong> {expediente.creado_por}</div>
        </div>
      </div>

      {/* Pestañas */}
      <div className="tabs">
        <button className={`tab ${tab === "eventos" ? "active" : ""}`} onClick={() => setTab("eventos")}>Eventos</button>
        <button className={`tab ${tab === "reportes" ? "active" : ""}`} onClick={() => setTab("reportes")}>Reportes</button>
        <button className={`tab ${tab === "archivos" ? "active" : ""}`} onClick={() => setTab("archivos")}>Archivos</button>
      </div>

      {/* ===================== TAB EVENTOS ===================== */}
      {tab === "eventos" && (
        <div className="card">
          <div className="card-header">
            <h3>Eventos</h3>
            <button className="btn" onClick={abrirNuevoEvento}>+ Nuevo evento</button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Fecha</th>
                  <th>Creado</th>
                  <th style={{width:120}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {eventos.length === 0 && (
                  <tr><td colSpan="5" className="muted">Sin eventos</td></tr>
                )}
                {eventos.map(ev => (
                  <tr key={ev.id}>
                    <td>{ev.tipo_evento}</td>
                    <td>{ev.descripcion || "-"}</td>
                    <td>{ev.fecha_evento?.substring(0,10)}</td>
                    <td>{ev.creado_en ? new Date(ev.creado_en).toLocaleString() : "-"}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => abrirEditarEvento(ev)}>Editar</button>
                      <button className="btn btn-danger" onClick={() => eliminarEvento(ev.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB REPORTES ===================== */}
      {tab === "reportes" && (
        <div className="card">
          <div className="card-header">
            <h3>Reportes</h3>
            <button className="btn" onClick={abrirNuevoReporte}>+ Nuevo reporte</button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Contenido</th>
                  <th>Generado por</th>
                  <th>Fecha</th>
                  <th style={{width:120}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reportes.length === 0 && (
                  <tr><td colSpan="5" className="muted">Sin reportes</td></tr>
                )}
                {reportes.map(rp => (
                  <tr key={rp.id}>
                    <td>{rp.id}</td>
                    <td>{rp.contenido}</td>
                    <td>{rp.generado_por || "-"}</td>
                    <td>{rp.generado_en ? new Date(rp.generado_en).toLocaleString() : "-"}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => abrirEditarReporte(rp)}>Editar</button>
                      <button className="btn btn-danger" onClick={() => eliminarReporte(rp.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB ARCHIVOS ===================== */}
      {tab === "archivos" && (
        <div className="card">
          <div className="card-header">
            <h3>Archivos</h3>
            <button className="btn" onClick={() => setOpenArchivo(true)}>+ Subir archivos</button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Subido por</th>
                  <th>Fecha</th>
                  <th style={{width:160}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {archivos.length === 0 && (
                  <tr><td colSpan="5" className="muted">Sin archivos</td></tr>
                )}
                {archivos.map(ar => (
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
                      <button className="btn btn-danger" onClick={() => eliminarArchivo(ar.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== MODAL EVENTO ===================== */}
      <Modal open={openEvento} onClose={() => setOpenEvento(false)} title={editEvento ? "Editar evento" : "Nuevo evento"} width={520}>
        <form onSubmit={guardarEvento} className="form-grid">
          <label>
            <span>Tipo de evento *</span>
            <input
              type="text"
              value={eventoForm.tipo_evento}
              onChange={(e) => setEventoForm({ ...eventoForm, tipo_evento: e.target.value })}
              required
            />
          </label>
          <label className="full">
            <span>Descripción</span>
            <textarea
              rows={3}
              value={eventoForm.descripcion}
              onChange={(e) => setEventoForm({ ...eventoForm, descripcion: e.target.value })}
            />
          </label>
          <label>
            <span>Fecha *</span>
            <input
              type="date"
              value={eventoForm.fecha_evento}
              onChange={(e) => setEventoForm({ ...eventoForm, fecha_evento: e.target.value })}
              required
            />
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-light" onClick={() => setOpenEvento(false)}>Cancelar</button>
            <button type="submit" className="btn">{editEvento ? "Guardar cambios" : "Crear"}</button>
          </div>
        </form>
      </Modal>

      {/* ===================== MODAL REPORTE ===================== */}
      <Modal open={openReporte} onClose={() => setOpenReporte(false)} title={editReporte ? "Editar reporte" : "Nuevo reporte"} width={600}>
        <form onSubmit={guardarReporte} className="form-grid">
          <label className="full">
            <span>Contenido *</span>
            <textarea
              rows={6}
              value={reporteForm.contenido}
              onChange={(e) => setReporteForm({ ...reporteForm, contenido: e.target.value })}
              required
            />
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-light" onClick={() => setOpenReporte(false)}>Cancelar</button>
            <button type="submit" className="btn">{editReporte ? "Guardar cambios" : "Crear"}</button>
          </div>
        </form>
      </Modal>

      {/* ===================== MODAL ARCHIVOS ===================== */}
      <Modal open={openArchivo} onClose={() => setOpenArchivo(false)} title="Subir archivos" width={500}>
        <form onSubmit={subirArchivos} className="form-grid">
          <label className="full">
            <span>Selecciona archivo(s)</span>
            <input type="file" multiple onChange={(e) => setFilesToUpload(e.target.files)} />
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-light" onClick={() => setOpenArchivo(false)}>Cancelar</button>
            <button type="submit" className="btn">Subir</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
