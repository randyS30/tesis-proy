import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar">
      <h1>Sistema Judicial</h1>
      <div>
        <Link to="/expedientes">Expedientes</Link>
        <Link to="/usuarios">Usuarios</Link>
        <Link to="/reportes">Reportes</Link>
      </div>
    </nav>
  );
}
