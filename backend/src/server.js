// server.js (completo, actualizado — reemplaza tu archivo actual)
import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();
const { Pool } = pg;
const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "cambiame_ya_123";

// -----------------------------
// Conexión a PostgreSQL
const pool = new Pool({
  user: process.env.PGUSER || "postgres",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "tesisdb",
  password: process.env.PGPASSWORD || "1234",
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
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
// Helpers para respuestas
const ok = (res, data) => res.json({ success: true, ...data });
const fail = (res, code = 500, msg = "Error en servidor") =>
  res.status(code).json({ success: false, message: msg });

// -----------------------------
// Auth helpers / middlewares

// Middleware opcional: si viene Authorization Bearer <token> lo valida y setea req.user,
// si no viene, continúa sin bloquear (compatibilidad con clientes actuales).
const authOptional = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header) return next();
  const token = header.split(" ")[1];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
  } catch (err) {
    console.warn("Token inválido (authOptional):", err.message);
    // no bloqueamos al cliente si token inválido; solo no seteamos req.user
  }
  return next();
};

// Middleware requerido: si no hay token válido responde 401
const authRequired = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header) return fail(res, 401, "No autorizado");
  const token = header.split(" ")[1];
  if (!token) return fail(res, 401, "No autorizado");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return fail(res, 401, "Token inválido");
  }
};

// Middleware para roles (ej: requireRole(['admin','abogado']))
const requireRole = (roles = []) => (req, res, next) => {
  if (!req.user) return fail(res, 401, "No autorizado");
  if (!roles.includes(req.user.rol)) return fail(res, 403, "No tienes permisos");
  return next();
};

// -----------------------------
// Ruta de prueba
app.get("/", (req, res) => {
  res.send("✅ Backend funcionando");
});

// -----------------------------
// LOGIN
// Compatible: si la contraseña en BD está hasheada con bcrypt (empieza por $2b/$2a),
// se usa bcrypt.compare; si no, compara en texto plano para compatibilidad.
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return fail(res, 400, "Email y password son requeridos");

  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE email=$1 LIMIT 1", [email]);
    if (result.rows.length === 0) return fail(res, 401, "Credenciales inválidas");

    const user = result.rows[0];
    const stored = user.password || "";

    let okPass = false;
    try {
      if (typeof stored === "string" && stored.startsWith("$2")) {
        // bcrypt hash
        okPass = await bcrypt.compare(password, stored);
      } else {
        // fallback: plaintext comparison (compatibilidad)
        okPass = password === stored;
      }
    } catch (err) {
      console.error("Error comparando password:", err);
      okPass = false;
    }

    if (!okPass) return fail(res, 401, "Credenciales inválidas");

    // build token payload
    const payload = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol || "usuario",
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });

    // devolver usuario sin password
    const safeUser = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    ok(res, { user: safeUser, token });
  } catch (err) {
    console.error("Error en login:", err);
    fail(res);
  }
});

// Endpoint opcional para crear usuarios (si quieres habilitarlo): guarda bcrypt hash.
// Lo protegemos con authRequired + role admin for safety (puedes cambiar).
app.post("/api/usuarios", authRequired, requireRole(["admin"]), async (req, res) => {
  const { nombre, email, password, rol } = req.body || {};
  if (!nombre || !email || !password) return fail(res, 400, "Faltan campos");

  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol, creado_en)
       VALUES ($1,$2,$3,$4,NOW()) RETURNING id, nombre, email, rol`,
      [nombre, email, hash, rol || "asistente"]
    );
    ok(res, { usuario: r.rows[0] });
  } catch (err) {
    console.error("Error creando usuario:", err);
    fail(res);
  }
});

// -----------------------------
// EXPEDIENTES
// Listar con filtros (mantengo compatibilidad con creado_por texto)
app.get("/api/expedientes", authOptional, async (req, res) => {
  try {
    const { q = "", estado = "", from = "", to = "" } = req.query;

    const where = [];
    const params = [];

    if (q) {
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      const a = params.length - 2;
      const b = params.length - 1;
      const c = params.length;
      where.push(`(numero_expediente ILIKE $${a} OR demandante ILIKE $${b} OR demandado ILIKE $${c})`);
    }

    if (estado) {
      params.push(estado);
      where.push(`estado = $${params.length}`);
    }

    if (from) {
      params.push(from);
      where.push(`fecha_inicio >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      where.push(`COALESCE(fecha_fin, fecha_inicio) <= $${params.length}`);
    }

    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    const sql = `
      SELECT id, numero_expediente, demandante_doc, demandante, demandado_doc, demandado, estado,
             fecha_nacimiento, fecha_inicio, fecha_fin, creado_por, archivo, creado_en
      FROM expedientes
      ${whereSql}
      ORDER BY id DESC
      LIMIT 200
    `;

    const result = await pool.query(sql, params);
    ok(res, { expedientes: result.rows });
  } catch (err) {
    console.error("Error listando expedientes:", err);
    fail(res);
  }
});

// Crear expediente con archivo
// Si el cliente envía Authorization Bearer <token>, se usará req.user.email como creado_por;
// si no, se usará el campo creado_por enviado en el body (compatibilidad).
app.post("/api/expedientes", authOptional, upload.single("archivo"), async (req, res) => {
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
    } = req.body;

    // Validaciones mínimas
    if (!numero_expediente || !demandante_doc || !demandante) {
      return fail(res, 400, "numero_expediente, demandante_doc y demandante son obligatorios");
    }

    const archivo = req.file ? req.file.filename : null;
    const creado_por = req.user ? (req.user.email || req.user.nombre || String(req.user.id)) : (req.body.creado_por || "anonimo");

    const result = await pool.query(
      `INSERT INTO expedientes 
      (numero_expediente, demandante_doc, demandante, demandado_doc, demandado, fecha_nacimiento, direccion, estado, fecha_inicio, fecha_fin, creado_por, archivo, creado_en)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW()) RETURNING *`,
      [
        numero_expediente,
        demandante_doc,
        demandante,
        demandado_doc || null,
        demandado || null,
        fecha_nacimiento || null,
        direccion || null,
        estado || "Abierto",
        fecha_inicio || null,
        fecha_fin || null,
        creado_por,
        archivo,
      ]
    );

    ok(res, { expediente: result.rows[0] });
  } catch (err) {
    console.error("Error guardando expediente:", err);
    fail(res);
  }
});

// Obtener expediente
app.get("/api/expedientes/:id", authOptional, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM expedientes WHERE id=$1", [req.params.id]);
    if (result.rows.length > 0) {
      ok(res, { expediente: result.rows[0] });
    } else {
      fail(res, 404, "Expediente no encontrado");
    }
  } catch (err) {
    console.error("Error obteniendo expediente:", err);
    fail(res);
  }
});

// Editar expediente
app.put("/api/expedientes/:id", authOptional, async (req, res) => {
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
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE expedientes SET 
        numero_expediente=$1, demandante_doc=$2, demandante=$3, fecha_nacimiento=$4, direccion=$5,
        demandado=$6, estado=$7, fecha_inicio=$8, fecha_fin=$9
       WHERE id=$10 RETURNING *`,
      [
        numero_expediente,
        demandante_doc,
        demandante,
        fecha_nacimiento || null,
        direccion || null,
        demandado || null,
        estado || null,
        fecha_inicio || null,
        fecha_fin || null,
        req.params.id,
      ]
    );

    ok(res, { expediente: result.rows[0] });
  } catch (err) {
    console.error("Error al editar expediente:", err);
    fail(res);
  }
});

// Eliminar expediente
app.delete("/api/expedientes/:id", authOptional, async (req, res) => {
  try {
    await pool.query("DELETE FROM expedientes WHERE id=$1", [req.params.id]);
    ok(res, { message: "Expediente eliminado" });
  } catch (err) {
    console.error("Error al eliminar expediente:", err);
    fail(res);
  }
});

// -----------------------------
// EVENTOS (CRUD)
app.get("/api/expedientes/:id/eventos", authOptional, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM eventos WHERE expediente_id=$1 ORDER BY fecha_evento DESC", [req.params.id]);
    ok(res, { eventos: result.rows });
  } catch (err) {
    console.error("Error listando eventos:", err);
    fail(res);
  }
});

app.post("/api/expedientes/:id/eventos", authOptional, async (req, res) => {
  try {
    const { tipo_evento, descripcion, fecha_evento } = req.body;

    if (!tipo_evento || !fecha_evento) {
      return fail(res, 400, "tipo_evento y fecha_evento son obligatorios");
    }

    const r = await pool.query(
      `INSERT INTO eventos (expediente_id, tipo_evento, descripcion, fecha_evento, creado_en)
       VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [parseInt(req.params.id), tipo_evento, descripcion || null, fecha_evento]
    );
    ok(res, { evento: r.rows[0] });
  } catch (e) {
    console.error("❌ Error creando evento:", e);
    fail(res, 500, e.message);
  }
});

app.put("/api/eventos/:id", authOptional, async (req, res) => {
  try {
    const { tipo_evento, descripcion, fecha_evento } = req.body;
    const r = await pool.query(
      `UPDATE eventos SET tipo_evento=$1, descripcion=$2, fecha_evento=$3 
       WHERE id=$4 RETURNING *`,
      [tipo_evento, descripcion || null, fecha_evento, req.params.id]
    );
    ok(res, { evento: r.rows[0] });
  } catch (e) {
    console.error("Error editando evento:", e);
    fail(res, 500, e.message);
  }
});

app.delete("/api/eventos/:id", authOptional, async (req, res) => {
  try {
    await pool.query("DELETE FROM eventos WHERE id=$1", [req.params.id]);
    ok(res, { message: "Evento eliminado" });
  } catch (e) {
    console.error("Error eliminando evento:", e);
    fail(res, 500, e.message);
  }
});

// -----------------------------
// REPORTES (CRUD)
app.get("/api/expedientes/:id/reportes", authOptional, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM reportes WHERE expediente_id=$1 ORDER BY generado_en DESC", [req.params.id]);
    ok(res, { reportes: result.rows });
  } catch (err) {
    console.error("Error listando reportes:", err);
    fail(res);
  }
});

app.post("/api/expedientes/:id/reportes", authOptional, async (req, res) => {
  try {
    const { contenido, generado_por } = req.body;
    const generadoBy = req.user ? (req.user.email || req.user.nombre || String(req.user.id)) : (generado_por || null);

    const r = await pool.query(
      `INSERT INTO reportes (expediente_id, contenido, generado_por, generado_en)
       VALUES ($1,$2,$3,NOW()) RETURNING *`,
      [parseInt(req.params.id), contenido, generadoBy]
    );
    ok(res, { reporte: r.rows[0] });
  } catch (e) {
    console.error("Error creando reporte:", e);
    fail(res, 500, e.message);
  }
});

app.put("/api/reportes/:id", authOptional, async (req, res) => {
  try {
    const { contenido } = req.body;
    const r = await pool.query(
      `UPDATE reportes SET contenido=$1 WHERE id=$2 RETURNING *`,
      [contenido, req.params.id]
    );
    ok(res, { reporte: r.rows[0] });
  } catch (e) {
    console.error("Error editando reporte:", e);
    fail(res, 500, e.message);
  }
});

app.delete("/api/reportes/:id", authOptional, async (req, res) => {
  try {
    await pool.query("DELETE FROM reportes WHERE id=$1", [req.params.id]);
    ok(res, { message: "Reporte eliminado" });
  } catch (e) {
    console.error("Error eliminando reporte:", e);
    fail(res, 500, e.message);
  }
});

// -----------------------------
// DASHBOARD (resumen / charts)
app.get("/api/reportes", authOptional, async (req, res) => {
  try {
    // Total expedientes
    const totalExpedientes = await pool.query("SELECT COUNT(*) FROM expedientes");

    // Expedientes por estado (normalizar NULL/'' a 'Sin estado')
    const porEstado = await pool.query(`
      SELECT COALESCE(NULLIF(estado, ''), 'Sin estado') AS estado, COUNT(*)::int AS total
      FROM expedientes
      GROUP BY COALESCE(NULLIF(estado, ''), 'Sin estado')
      ORDER BY estado
    `);

    // Expedientes por usuario (intentar unir con usuarios; si no, usar creado_por)
    const porUsuario = await pool.query(`
      SELECT 
        COALESCE(u.nombre, e.creado_por, 'Desconocido') AS usuario,
        COUNT(*)::int AS total
      FROM expedientes e
      LEFT JOIN usuarios u ON u.email = e.creado_por OR u.nombre = e.creado_por OR u.id::text = e.creado_por
      GROUP BY usuario
      ORDER BY total DESC
    `);

    // Expedientes creados este mes
    const esteMes = await pool.query(`
      SELECT COUNT(*)::int AS total FROM expedientes
      WHERE DATE_TRUNC('month', creado_en) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    // Expedientes cerrados
    const cerrados = await pool.query(`
      SELECT COUNT(*)::int AS total FROM expedientes WHERE estado ILIKE 'Cerrado'
    `);

    res.json({
      success: true,
      indicadores: {
        total: Number(totalExpedientes.rows[0].count),
        esteMes: Number(esteMes.rows[0].total),
        cerrados: Number(cerrados.rows[0].total),
      },
      porEstado: porEstado.rows,
      porUsuario: porUsuario.rows,
    });
  } catch (err) {
    console.error("Error en reportes:", err);
    fail(res);
  }
});

// Rutas dashboard independientes (opcional, si las consumes desde frontend)
app.get("/api/dashboard/estado", authOptional, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COALESCE(NULLIF(estado, ''), 'Sin estado') AS estado, COUNT(*)::int AS total
      FROM expedientes
      GROUP BY COALESCE(NULLIF(estado, ''), 'Sin estado')
      ORDER BY estado
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error en dashboard estado:", err);
    fail(res);
  }
});

app.get("/api/dashboard/usuario", authOptional, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COALESCE(u.nombre, e.creado_por, 'Desconocido') AS usuario, COUNT(*)::int AS total
      FROM expedientes e
      LEFT JOIN usuarios u ON e.creado_por = u.email OR u.nombre = e.creado_por OR u.id::text = e.creado_por
      GROUP BY usuario
      ORDER BY total DESC;
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error en dashboard usuario:", err);
    fail(res);
  }
});

app.get("/api/dashboard/mes", authOptional, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT TO_CHAR(fecha_inicio, 'YYYY-MM') AS mes, COUNT(*)::int AS total
      FROM expedientes
      GROUP BY mes
      ORDER BY mes
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error en dashboard mes:", err);
    fail(res);
  }
});

app.get("/api/dashboard/resumen", authOptional, async (req, res) => {
  try {
    const total = await pool.query("SELECT COUNT(*)::int FROM expedientes");
    const abiertos = await pool.query("SELECT COUNT(*)::int FROM expedientes WHERE estado = 'Abierto'");
    const cerrados = await pool.query("SELECT COUNT(*)::int FROM expedientes WHERE estado = 'Cerrado'");
    const usuarios = await pool.query("SELECT COUNT(*)::int FROM usuarios");

    res.json({
      success: true,
      resumen: {
        total: total.rows[0].count,
        abiertos: abiertos.rows[0].count,
        cerrados: cerrados.rows[0].count,
        usuarios: usuarios.rows[0].count
      }
    });
  } catch (err) {
    console.error("Error en resumen dashboard:", err);
    fail(res);
  }
});
app.get("/api/dashboard/abiertos-cerrados", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(fecha_inicio, 'YYYY-MM') AS mes,
        SUM(CASE WHEN estado = 'Abierto' THEN 1 ELSE 0 END)::int AS abiertos,
        SUM(CASE WHEN estado = 'Cerrado' THEN 1 ELSE 0 END)::int AS cerrados
      FROM expedientes
      GROUP BY mes
      ORDER BY mes;
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error en abiertos-cerrados:", err);
    res.status(500).json({ success: false, message: "Error en servidor" });
  }
});


// -----------------------------
// ARCHIVOS (múltiples)
app.post("/api/expedientes/:id/archivos", authOptional, upload.array("archivos", 10), async (req, res) => {
  const { id } = req.params;
  const archivos = req.files; // Array de archivos subidos
  const subido_por = req.user ? (req.user.email || req.user.nombre || String(req.user.id)) : (req.body.subido_por || "admin");

  try {
    const results = [];
    for (let file of archivos) {
      const result = await pool.query(
        `INSERT INTO archivos (expediente_id, nombre_original, archivo_path, tipo_mime, subido_por, subido_en) 
         VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *`,
        [id, file.originalname, file.filename, file.mimetype, subido_por]
      );
      results.push(result.rows[0]);
    }

    res.json({ success: true, archivos: results });
  } catch (err) {
    console.error("❌ Error subiendo archivos:", err);
    fail(res);
  }
});

// Listar archivos de un expediente
app.get("/api/expedientes/:id/archivos", authOptional, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM archivos WHERE expediente_id=$1 ORDER BY id DESC", [id]);
    res.json({ success: true, archivos: result.rows });
  } catch (err) {
    console.error("❌ Error listando archivos:", err);
    fail(res);
  }
});

// Descargar un archivo
app.get("/api/archivos/:id/download", authOptional, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM archivos WHERE id=$1", [id]);
    if (result.rows.length === 0) return res.status(404).send("Archivo no encontrado");

    const archivo = result.rows[0];
    res.download(`uploads/${archivo.archivo_path}`, archivo.nombre_original);
  } catch (err) {
    console.error("❌ Error descargando archivo:", err);
    fail(res);
  }
});

// Eliminar archivo
app.delete("/api/archivos/:id", authOptional, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM archivos WHERE id=$1 RETURNING *", [id]);
    if (result.rows.length === 0) return fail(res, 404, "Archivo no encontrado");

    res.json({ success: true, message: "Archivo eliminado", archivo: result.rows[0] });
  } catch (err) {
    console.error("❌ Error eliminando archivo:", err);
    fail(res);
  }
});

// -----------------------------
// Servir archivos subidos (estático)
app.use("/uploads", express.static("uploads"));

// -----------------------------
// Iniciar servidor
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});
