import React, { useState } from "react";

const CrearExpediente = () => {
  const [formData, setFormData] = useState({
    numero_expediente: "",
    demandante_doc: "",
    demandante: "",
    fecha_nacimiento: "",
    direccion: "",
    demandado_doc: "",
    demandado: "",
    estado: "",
    fecha_inicio: "",
    fecha_fin: "",
    creado_por: "admin",
    archivo: null,
  });

  const [loading, setLoading] = useState(false);

  // Consulta RENIEC (demandante o demandado)
  const consultarReniec = async (tipo) => {
    const doc = tipo === "demandante" ? formData.demandante_doc : formData.demandado_doc;

    if (!doc || (doc.length !== 8 && doc.length !== 9)) {
      alert("Documento inválido (DNI: 8 dígitos, CE: 9 dígitos)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/reniec/${doc}`);
      const data = await res.json();

      if (data.success) {
        if (tipo === "demandante") {
          setFormData((prev) => ({
            ...prev,
            demandante: data.nombre || "",
            fecha_nacimiento: data.fecha_nacimiento || "",
            direccion: data.direccion || "",
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            demandado: data.nombre || "",
          }));
        }
      } else {
        alert("⚠️ No se encontró en RENIEC, completa los datos manualmente.");
      }
    } catch (err) {
      console.error("Error RENIEC:", err);
    } finally {
      setLoading(false);
    }
  };

  // Guardar expediente
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key !== "archivo") {
        formDataToSend.append(key, formData[key]);
      }
    });
    if (formData.archivo) {
      formDataToSend.append("archivo", formData.archivo);
    }

    try {
      const res = await fetch("http://localhost:4000/api/expedientes", {
        method: "POST",
        body: formDataToSend,
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Expediente creado correctamente");
        setFormData({
          numero_expediente: "",
          demandante_doc: "",
          demandante: "",
          fecha_nacimiento: "",
          direccion: "",
          demandado_doc: "",
          demandado: "",
          estado: "",
          fecha_inicio: "",
          fecha_fin: "",
          creado_por: "admin",
          archivo: null,
        });
      } else {
        alert("❌ Error al crear expediente");
      }
    } catch (err) {
      console.error("Error creando expediente:", err);
    }
  };

  return (
    <div className="p-6 bg-white rounded shadow-md max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Crear Expediente</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Número expediente */}
        <input
          type="text"
          placeholder="Número de expediente"
          className="w-full border p-2 rounded"
          value={formData.numero_expediente}
          onChange={(e) => setFormData({ ...formData, numero_expediente: e.target.value })}
          required
        />

        {/* Demandante */}
        <div>
          <label className="font-semibold">Demandante</label>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="DNI/CE"
              className="w-1/3 border p-2 rounded"
              value={formData.demandante_doc}
              onChange={(e) => setFormData({ ...formData, demandante_doc: e.target.value })}
            />
            <button
              type="button"
              onClick={() => consultarReniec("demandante")}
              className="bg-blue-600 text-white px-3 rounded"
              disabled={loading}
            >
              {loading ? "..." : "Buscar"}
            </button>
          </div>

          {/* Nombre largo */}
          <input
            type="text"
            placeholder="Nombre completo"
            className="w-full border p-2 rounded mt-2"
            value={formData.demandante}
            onChange={(e) => setFormData({ ...formData, demandante: e.target.value })}
          />

          {/* Fecha de nacimiento debajo */}
          <input
            type="date"
            className="w-full border p-2 rounded mt-2"
            value={formData.fecha_nacimiento}
            onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
          />
        </div>

        {/* Demandado */}
        <div>
          <label className="font-semibold">Demandado</label>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="DNI/CE"
              className="w-1/3 border p-2 rounded"
              value={formData.demandado_doc}
              onChange={(e) => setFormData({ ...formData, demandado_doc: e.target.value })}
            />
            <button
              type="button"
              onClick={() => consultarReniec("demandado")}
              className="bg-blue-600 text-white px-3 rounded"
              disabled={loading}
            >
              {loading ? "..." : "Buscar"}
            </button>
          </div>

          <input
            type="text"
            placeholder="Nombre completo"
            className="w-full border p-2 rounded mt-2"
            value={formData.demandado}
            onChange={(e) => setFormData({ ...formData, demandado: e.target.value })}
          />
        </div>

        {/* Dirección */}
        <input
          type="text"
          placeholder="Dirección"
          className="w-full border p-2 rounded"
          value={formData.direccion}
          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
        />

        {/* Estado */}
        <select
          className="w-full border p-2 rounded"
          value={formData.estado}
          onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
          required
        >
          <option value="">-- Estado --</option>
          <option value="Abierto">Abierto</option>
          <option value="En Proceso">En Proceso</option>
          <option value="Cerrado">Cerrado</option>
        </select>

        {/* Fechas proceso */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={formData.fecha_inicio}
            onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
          />
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={formData.fecha_fin}
            onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
          />
        </div>

        {/* Subir archivo */}
        <input
          type="file"
          className="w-full border p-2 rounded"
          onChange={(e) => setFormData({ ...formData, archivo: e.target.files[0] })}
        />

        <button type="submit" className="w-full bg-green-600 text-white p-2 rounded">
          Crear Expediente
        </button>
      </form>
    </div>
  );
};

export default CrearExpediente;
