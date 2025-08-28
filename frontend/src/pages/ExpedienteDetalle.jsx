import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const ExpedienteDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expediente, setExpediente] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  // Cargar expediente al entrar
  useEffect(() => {
    const fetchExpediente = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/expedientes/${id}`);
        const data = await res.json();
        if (data.success) {
          setExpediente(data.expediente);
          setFormData(data.expediente);
        } else {
          alert("Expediente no encontrado");
          navigate("/expedientes");
        }
      } catch (err) {
        console.error("Error cargando expediente:", err);
      }
    };
    fetchExpediente();
  }, [id, navigate]);

  // Guardar cambios
  const handleSave = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/expedientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Expediente actualizado");
        setExpediente(data.expediente);
        setEditMode(false);
      } else {
        alert("❌ Error al actualizar");
      }
    } catch (err) {
      console.error("Error al actualizar:", err);
    }
  };

  if (!expediente) return <p className="p-6">Cargando expediente...</p>;

  return (
    <div className="p-6 bg-white rounded shadow-md max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Detalle de Expediente</h2>

      {!editMode ? (
        <div className="space-y-3">
          <p><strong>N° Expediente:</strong> {expediente.numero_expediente}</p>
          <p><strong>Demandante:</strong> {expediente.demandante} ({expediente.demandante_doc})</p>
          <p><strong>Fecha nacimiento:</strong> {expediente.fecha_nacimiento || "No registrada"}</p>
          <p><strong>Dirección:</strong> {expediente.direccion || "No registrada"}</p>
          <p><strong>Demandado:</strong> {expediente.demandado} ({expediente.demandado_doc})</p>
          <p><strong>Estado:</strong> {expediente.estado}</p>
          <p><strong>Inicio:</strong> {expediente.fecha_inicio}</p>
          <p><strong>Fin:</strong> {expediente.fecha_fin || "En curso"}</p>
          <p><strong>Creado por:</strong> {expediente.creado_por}</p>
          <p><strong>Fecha creación:</strong> {new Date(expediente.creado_en).toLocaleString()}</p>

          {expediente.archivo && (
            <p>
              <a
                href={`http://localhost:4000/uploads/${expediente.archivo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                📂 Ver archivo adjunto
              </a>
            </p>
          )}

          <button
            className="bg-yellow-500 text-white px-4 py-2 rounded"
            onClick={() => setEditMode(true)}
          >
            ✏️ Editar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            className="w-full border p-2 rounded"
            value={formData.numero_expediente}
            onChange={(e) => setFormData({ ...formData, numero_expediente: e.target.value })}
          />
          <input
            type="text"
            className="w-full border p-2 rounded"
            value={formData.demandante}
            onChange={(e) => setFormData({ ...formData, demandante: e.target.value })}
          />
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={formData.fecha_nacimiento || ""}
            onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
          />
          <input
            type="text"
            className="w-full border p-2 rounded"
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
          />
          <input
            type="text"
            className="w-full border p-2 rounded"
            value={formData.demandado}
            onChange={(e) => setFormData({ ...formData, demandado: e.target.value })}
          />
          <select
            className="w-full border p-2 rounded"
            value={formData.estado}
            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
          >
            <option value="Abierto">Abierto</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Cerrado">Cerrado</option>
          </select>
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={formData.fecha_inicio || ""}
            onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
          />
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={formData.fecha_fin || ""}
            onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
          />

          <div className="flex gap-2">
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={handleSave}
            >
              💾 Guardar
            </button>
            <button
              className="bg-gray-500 text-white px-4 py-2 rounded"
              onClick={() => setEditMode(false)}
            >
              ❌ Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpedienteDetalle;
