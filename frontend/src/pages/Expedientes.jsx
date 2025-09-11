import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./Expedientes.css";

const API = "http://localhost:4000";

const Expedientes = () => {
  const [expedientes, setExpedientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (estado) p.set("estado", estado);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString() ? "?" + p.toString() : "";
  }, [q, estado, from, to]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setErr("");
      fetch(`${API}/api/expedientes${queryString}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.expedientes)) {
            setExpedientes(data.expedientes);
          } else {
            setExpedientes([]);
            setErr(data.message || "No se pudo cargar");
          }
        })
        .catch((e) => {
          console.error(e);
          setErr("Error de red");
          setExpedientes([]);
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(t);
  }, [queryString]);

  const limpiarFiltros = () => {
    setQ("");
    setEstado("");
    setFrom("");
    setTo("");
  };

  const analizarExpedienteIA = async (id) => {
    try {
      const r = await fetch(`${API}/api/expedientes/${id}/analizar`, {
        method: "POST",
      }).then((res) => res.json());
      if (r.success) {
        alert("✅ Análisis generado y guardado en reportes");
      } else {
        alert("❌ No se pudo analizar");
      }
    } catch (err) {
      console.error(err);
      alert("Error en análisis IA");
    }
  };

  return (
    <div className="exp-container">
      <div className="exp-header">
        <h2>Lista de Expedientes</h2>
        <Link to="/expedientes/nuevo" className="btn btn-success">
          Nuevo Expediente
        </Link>
      </div>

      {/* Filtros */}
      <div className="exp-filters">
        <div className="row">
          <div className="col">
            <label>Buscar</label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="N° expediente, demandante o demandado"
            />
          </div>
          <div className="col">
            <label>Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="Abierto">Abierto</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Cerrado">Cerrado</option>
            </select>
          </div>
          <div className="col">
            <label>Desde</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="col">
            <label>Hasta</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="row right">
          <button className="btn btn-secondary" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>
      </div>

      {loading && <p>Cargando...</p>}
      {err && <p className="text-error">{err}</p>}

      {!loading && !err && (
        <>
          {expedientes.length === 0 ? (
            <p>No hay expedientes para los filtros aplicados.</p>
          ) : (
            <table className="exp-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>N° Expediente</th>
                  <th>Demandante</th>
                  <th>Demandado</th>
                  <th>Estado</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Archivo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {expedientes.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.id}</td>
                    <td>{exp.numero_expediente}</td>
                    <td>{exp.demandante}</td>
                    <td>{exp.demandado}</td>
                    <td>{exp.estado}</td>
                    <td>{exp.fecha_inicio ? exp.fecha_inicio.slice(0, 10) : "—"}</td>
                    <td>{exp.fecha_fin ? exp.fecha_fin.slice(0, 10) : "—"}</td>
                    <td>
                      {exp.archivo ? (
                        <>
                          <a
                            href={`${API}/uploads/${exp.archivo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-link"
                          >
                            Ver archivo
                          </a>
                          <button
                            className="btn btn-warning"
                            onClick={() => analizarExpedienteIA(exp.id)}
                          >
                            Analizar IA
                          </button>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Link to={`/expedientes/${exp.id}`} className="btn btn-primary">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default Expedientes;
