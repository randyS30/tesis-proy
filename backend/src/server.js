import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();
const { Pool } = pg;
const app = express();

app.use(cors());
app.use(express.json());

// Conexión a PostgreSQL
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "tesisdb",
  password: "1234",
  port: 5432,
});

// -----------------------------
// Configuración de multer (subida de archivos)
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// -----------------------------
// Rutas

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1 AND password = $2",
      [email, password]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(401).json({ success: false, message: "Credenciales inválidas" });
    }
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ success: false, message: "Error en servidor" });
  }
});

// Listar expedientes con búsqueda y filtros
app.get("/api/expedientes", async (req, res) => {
  try {
    // Query params
    const {
      q = "",                 // texto libre: número, demandante, demandado
      estado = "",            // Abierto | En Proceso | Cerrado
      from = "",              // fecha_inicio >= from  (YYYY-MM-DD)
      to = ""                 // fecha_fin   <= to    (YYYY-MM-DD)
    } = req.query;

    // Armado dinámico y seguro (parametrizado)
    const where = [];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      params.push(`%${q}%`);
      params.push(`%${q}%`);
      where.push("(numero_expediente ILIKE $" + (params.length - 2) +
                 " OR demandante ILIKE $" + (params.length - 1) +
                 " OR demandado ILIKE $" + params.length + ")");
    }

    if (estado) {
      params.push(estado);
      where.push("estado = $" + params.length);
    }

    if (from) {
      params.push(from);
      where.push("fecha_inicio >= $" + params.length);
    }

    if (to) {
      params.push(to);
      where.push("COALESCE(fecha_fin, fecha_inicio) <= $" + params.length);
    }

    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    const sql = `
      SELECT id, numero_expediente, demandante, demandado, estado,
             fecha_inicio, fecha_fin, creado_por, archivo, creado_en
      FROM expedientes
      ${whereSql}
      ORDER BY id DESC
      LIMIT 200
    `;

    const result = await pool.query(sql, params);
    res.json({ success: true, expedientes: result.rows });
  } catch (err) {
    console.error("Error listando expedientes:", err);
    res.status(500).json({ success: false, message: "Error en servidor" });
  }
});


// Crear expediente (con archivo)
app.post("/api/expedientes", upload.single("archivo"), async (req, res) => {
  try {
    const {
      numero_expediente,
      demandante_doc,
      demandante,
      demandado_doc,
      demandado,
      fecha_nacimiento,
      direccion,
      estado,
      fecha_inicio,
      fecha_fin,
      creado_por,
    } = req.body;

    const archivo = req.file ? req.file.filename : null;

    const result = await pool.query(
      `INSERT INTO expedientes 
      (numero_expediente, demandante_doc, demandante, demandado_doc, demandado, fecha_nacimiento, direccion, estado, fecha_inicio, fecha_fin, creado_por, archivo, creado_en)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW()) RETURNING *`,
      [
        numero_expediente,
        demandante_doc,
        demandante,
        demandado_doc,
        demandado,
        fecha_nacimiento || null,
        direccion,
        estado,
        fecha_inicio || null,
        fecha_fin || null,
        creado_por,
        archivo,
      ]
    );

    res.json({ success: true, expediente: result.rows[0] });
  } catch (err) {
    console.error("Error guardando expediente:", err);
    res.status(500).json({ success: false, message: "Error en servidor" });
  }
});

// Obtener un expediente por ID
app.get("/api/expedientes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM expedientes WHERE id=$1", [id]);
    if (result.rows.length > 0) {
      res.json({ success: true, expediente: result.rows[0] });
    } else {
      res.status(404).json({ success: false, message: "Expediente no encontrado" });
    }
  } catch (err) {
    console.error("Error obteniendo expediente:", err);
    res.status(500).json({ success: false, message: "Error en servidor" });
  }
});

// Editar expediente
app.put("/api/expedientes/:id", async (req, res) => {
  const { id } = req.params;
  const {
    numero_expediente,
    demandante_doc,
    demandante,
    fecha_nacimiento,
    direccion,
    demandado,
    estado,
    fecha_inicio,
    fecha_fin,
    creado_por,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE expedientes SET 
        numero_expediente=$1, demandante_doc=$2, demandante=$3, fecha_nacimiento=$4, direccion=$5,
        demandado=$6, estado=$7, fecha_inicio=$8, fecha_fin=$9, creado_por=$10
       WHERE id=$11 RETURNING *`,
      [
        numero_expediente,
        demandante_doc,
        demandante,
        fecha_nacimiento,
        direccion,
        demandado,
        estado,
        fecha_inicio,
        fecha_fin,
        creado_por,
        id,
      ]
    );

    res.json({ success: true, expediente: result.rows[0] });
  } catch (err) {
    console.error("Error al editar expediente:", err);
    res.status(500).json({ success: false, message: "Error al editar expediente" });
  }
});

// Eliminar expediente
app.delete("/api/expedientes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM expedientes WHERE id=$1", [id]);
    res.json({ success: true, message: "Expediente eliminado" });
  } catch (err) {
    console.error("Error al eliminar expediente:", err);
    res.status(500).json({ success: false, message: "Error al eliminar expediente" });
  }
});

// Servir archivos subidos
app.use("/uploads", express.static("uploads"));

// -----------------------------
// Iniciar servidor
app.listen(4000, () => {
  console.log("✅ Backend corriendo en http://localhost:4000");
});
// Dashboard de reportes
app.get("/api/reportes", async (req, res) => {
  try {
    const [porEstado, porUsuario] = await Promise.all([
      pool.query(`SELECT estado, COUNT(*) AS total FROM expedientes GROUP BY estado`),
      pool.query(`SELECT creado_por, COUNT(*) AS total FROM expedientes GROUP BY creado_por`),
    ]);

    res.json({
      success: true,
      porEstado: porEstado.rows,
      porUsuario: porUsuario.rows,
    });
  } catch (err) {
    console.error("Error en reportes:", err);
    res.status(500).json({ success: false, message: "Error en servidor" });
  }
});
