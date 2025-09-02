import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function ExpedientesList() {
  const [expedientes, setExpedientes] = useState([]);

  useEffect(() => {
    fetch("http://localhost:4000/api/expedientes")
      .then((res) => res.json())
      .then((data) => setExpedientes(data.expedientes || []));
  }, []);

  return (
    <div className="container">
      <h2>Expedientes</h2>
      <table className="table">
        <thead>
          <tr>
            <th>N° Expediente</th>
            <th>Demandante</th>
            <th>Demandado</th>
            <th>Estado</th>
            <th>Inicio</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {expedientes.map((e) => (
            <tr key={e.id}>
              <td>{e.numero_expediente}</td>
              <td>{e.demandante}</td>
              <td>{e.demandado}</td>
              <td>{e.estado}</td>
              <td>{e.fecha_inicio}</td>
              <td>
                <Link className="btn" to={`/expedientes/${e.id}`}>
                  Ver detalle
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
