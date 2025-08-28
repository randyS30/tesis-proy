import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function EditarExpediente() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    numero_expediente: "",
    demandante_doc: "",
    demandante: "",
    fecha_nacimiento: "",
    direccion: "",
    demandado: "",
    estado: "En proceso",
    fecha_inicio: "",
    fecha_fin: "",
    creado_por: "admin",
  });

  // Cargar expediente actual
  useEffect(() => {
    fetch(`http://localhost:4000/api/expedientes/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setForm(data.expediente);
        }
      })
      .catch((err) => console.error("Error cargando expediente:", err));
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:4000/api/expedientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        alert("Expediente actualizado correctamente ✅");
        navigate("/expedientes");
      } else {
        alert("Error al actualizar expediente ❌");
      }
    } catch (err) {
      console.error("Error al actualizar expediente:", err);
    }
  };

  return (
    <div className="form-container">
      <h2>✏️ Editar Expediente</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>N° Expediente</label>
          <input
            type="text"
            name="numero_expediente"
            value={form.numero_expediente}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>DNI / CE del Demandante</label>
          <input
            type="text"
            name="demandante_doc"
            value={form.demandante_doc}
            onChange={handleChange}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Nombre del Demandante</label>
          <input
            type="text"
            name="demandante"
            value={form.demandante}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Fecha de nacimiento</label>
          <input
            type="text"
            name="fecha_nacimiento"
            value={form.fecha_nacimiento}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Dirección</label>
          <input
            type="text"
            name="direccion"
            value={form.direccion}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Demandado</label>
          <input
            type="text"
            name="demandado"
            value={form.demandado}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Estado</label>
          <select name="estado" value={form.estado} onChange={handleChange}>
            <option>En proceso</option>
            <option>Concluido</option>
            <option>Archivado</option>
          </select>
        </div>

        <div className="form-group">
          <label>Fecha Inicio</label>
          <input
            type="date"
            name="fecha_inicio"
            value={form.fecha_inicio?.split("T")[0] || ""}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Fecha Fin</label>
          <input
            type="date"
            name="fecha_fin"
            value={form.fecha_fin ? form.fecha_fin.split("T")[0] : ""}
            onChange={handleChange}
          />
        </div>

        <button type="submit" className="btn">Guardar Cambios</button>
      </form>
    </div>
  );
}
