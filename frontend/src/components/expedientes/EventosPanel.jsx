import React, { useEffect, useState } from "react";
import Modal from "../Modal";

const API = "http://localhost:4000";

export default function EventosPanel({ expedienteId }) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [editEvento, setEditEvento] = useState(null);
  const [eventoForm, setEventoForm] = useState({
    tipo_evento: "",
    descripcion: "",
    fecha_evento: "",
  });

  // Cargar eventos
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/expedientes/${expedienteId}/eventos`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        setEventos(data.success ? data.eventos : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [expedienteId]);

  const abrirNuevo = () => {
    setEditEvento(null);
    setEventoForm({ tipo_evento: "", descripcion: "", fecha_evento: "" });
    setOpenModal(true);
  };

  const abrirEditar = (ev) => {
    setEditEvento(ev);
    setEventoForm({
      tipo_evento: ev.tipo_evento,
      descripcion: ev.descripcion || "",
      fecha_evento: ev.fecha_evento?.substring(0, 10) || "",
    });
    setOpenModal(true);
  };

  const guardarEvento = async (e) => {
    e.preventDefault();
    try {
      if (editEvento) {
        const res = await fetch(`${API}/api/eventos/${editEvento.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(eventoForm),
        });
        const data = await res.json();
        if (data.success) {
          setEventos((prev) => prev.map((x) => (x.id === editEvento.id ? data.evento : x)));
          setOpenModal(false);
        }
      } else {
        const res = await fetch(`${API}/api/expedientes/${expedienteId}/eventos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(eventoForm),
        });
        const data = await res.json();
        if (data.success) {
          setEventos((prev) => [data.evento, ...prev]);
          setOpenModal(false);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error guardando evento");
    }
  };

  const eliminarEvento = async (id) => {
    if (!window.confirm("¿Eliminar evento?")) return;
    try {
      const res = await fetch(`${API}/api/eventos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) setEventos((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p>Cargando eventos…</p>;

  return (
    <div className="card">
      <div className="card-header">
        <h3>Eventos</h3>
        <button className="btn" onClick={abrirNuevo}>+ Nuevo evento</button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Fecha</th>
              <th>Creado</th>
              <th style={{ width: 120 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {eventos.length === 0 && (
              <tr><td colSpan="5" className="muted">Sin eventos</td></tr>
            )}
            {eventos.map((ev) => (
              <tr key={ev.id}>
                <td>{ev.tipo_evento}</td>
                <td>{ev.descripcion || "-"}</td>
                <td>{ev.fecha_evento?.substring(0, 10)}</td>
                <td>{ev.creado_en ? new Date(ev.creado_en).toLocaleString() : "-"}</td>
                <td>
                  <button className="btn btn-secondary" onClick={() => abrirEditar(ev)}>Editar</button>
                  <button className="btn btn-danger" onClick={() => eliminarEvento(ev.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editEvento ? "Editar evento" : "Nuevo evento"} width={520}>
        <form onSubmit={guardarEvento} className="form-grid">
          <label>
            <span>Tipo *</span>
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
          <div className="actions">
            <button type="submit" className="btn btn-primary">Guardar</button>
            <button type="button" className="btn" onClick={() => setOpenModal(false)}>Cancelar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
