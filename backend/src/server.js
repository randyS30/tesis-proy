import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

// node-fetch si tu Node es <18; si usas Node 18+ puedes usar global fetch
import fetch from "node-fetch";

dotenv.config();

const { Pool } = pg;
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const JWT_SECRET = process.env.JWT_SECRET || "pon_un_valor_largo_y_secreto_aqui";

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
// Multer (subida de archivos)
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});
const upload = multer({ storage });

// -----------------------------
// Helpers
const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code = 500, msg = "Error en servidor") =>
  res.status(code).json({ success: false, message: msg });

// -----------------------------
// Middlewares auth
const authOptional = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header) return next();
  const token = header.split(" ")[1];
  if (!token) return next();
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.warn("Token inválido (authOptional):", err.message);
  }
  return next();
};

const authRequired = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header) return fail(res, 401, "No autorizado");
  const token = header.split(" ")[1];
  if (!token) return fail(res, 401, "No autorizado");
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return fail(res, 401, "Token inválido");
  }
};

const requireRole = (roles = []) => (req, res, next) => {
  if (!req.user) return fail(res, 401, "No autorizado");
  if (!roles.includes(req.user.rol)) return fail(res, 403, "No tienes permisos");
  return next();
};

// -----------------------------
// Wrapper IA
async function callAISystem(systemMessage, userMessage) {
  if (process.env.OPENAI_API_KEY) {
    const body = {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      max_tokens: 1200,
    };
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    return j?.choices?.[0]?.message?.content ?? "Sin respuesta IA";
  }

  if (process.env.AI_API_KEY && process.env.AI_BASE_URL) {
    const url = process.env.AI_BASE_URL.replace(/\/$/, "") + "/v1/complete";
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: `${systemMessage}\n\n${userMessage}`,
      }),
    });
    const j = await r.json();
    return j.output || j.result || j.text || JSON.stringify(j);
  }

  return "IA no configurada.";
}

// -----------------------------
// Ruta de prueba
app.get("/", (req, res) => res.send("✅ Backend funcionando sin lectura de PDF"));

// AUTH / USUARIOS
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return fail(res, 400, "Email y password requeridos");

  try {
    const r = await pool.query("SELECT * FROM usuarios WHERE email=$1 LIMIT 1", [email]);
    if (r.rows.length === 0) return fail(res, 401, "Credenciales inválidas");
    const user = r.rows[0];
    const stored = user.password || "";

    let okPass = false;
    if (typeof stored === "string" && stored.startsWith("$2")) {
      okPass = await bcrypt.compare(password, stored);
    } else {
      okPass = password === stored;
    }
    if (!okPass) return fail(res, 401, "Credenciales inválidas");

    const payload = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol || "usuario" };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
    const safeUser = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    ok(res, { user: safeUser, token });
  } catch (err) {
    console.error("login error:", err);
    fail(res);
  }
});

// Endpoint crear usuario (protegido por token + admin)
app.post("/api/usuarios", authRequired, requireRole(["admin"]), async (req, res) => {
  const { nombre, email, password, rol } = req.body || {};
  if (!nombre || !email || !password) return fail(res, 400, "Faltan campos");
  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol, creado_en) VALUES ($1,$2,$3,$4,NOW()) RETURNING id, nombre, email, rol`,
      [nombre, email, hash, rol || "asistente"]
    );
    ok(res, { usuario: r.rows[0] });
  } catch (err) {
    console.error("crear usuario error:", err);
    fail(res);
  }
});

// -----------------------------
// EXPEDIENTES CRUD
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
    const r = await pool.query(sql, params);
    ok(res, { expedientes: r.rows });
  } catch (err) {
    console.error("list expedientes error:", err);
    fail(res);
  }
});

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
    } = req.body || {};

    if (!numero_expediente || !demandante_doc || !demandante) {
      return fail(res, 400, "numero_expediente, demandante_doc y demandante son obligatorios");
    }

    const archivo = req.file ? req.file.filename : null;
    const creado_por = req.user ? (req.user.email || req.user.nombre || String(req.user.id)) : (req.body.creado_por || "anonimo");

    const r = await pool.query(
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

    ok(res, { expediente: r.rows[0] });
  } catch (err) {
    console.error("crear expediente error:", err);
    fail(res);
  }
});

app.get("/api/expedientes/:id", authOptional, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM expedientes WHERE id=$1", [req.params.id]);
    if (r.rows.length === 0) return fail(res, 404, "Expediente no encontrado");
    ok(res, { expediente: r.rows[0] });
  } catch (err) {
    console.error("get expediente error:", err);
    fail(res);
  }
});

app.put("/api/expedientes/:id", authOptional, async (req, res) => {
  try {
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
    } = req.body || {};

    const r = await pool.query(
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
    ok(res, { expediente: r.rows[0] });
  } catch (err) {
    console.error("editar expediente error:", err);
    fail(res);
  }
});

app.delete("/api/expedientes/:id", authOptional, async (req, res) => {
  try {
    await pool.query("DELETE FROM expedientes WHERE id=$1", [req.params.id]);
    ok(res, { message: "Expediente eliminado" });
  } catch (err) {
    console.error("eliminar expediente error:", err);
    fail(res);
  }
});

// -----------------------------
// EVENTOS CRUD
app.get("/api/expedientes/:id/eventos", authOptional, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM eventos WHERE expediente_id=$1 ORDER BY fecha_evento DESC", [req.params.id]);
    ok(res, { eventos: r.rows });
  } catch (err) {
    console.error("listar eventos error:", err);
    fail(res);
  }
});

app.post("/api/expedientes/:id/eventos", authOptional, async (req, res) => {
  try {
    const { tipo_evento, descripcion, fecha_evento } = req.body || {};
    if (!tipo_evento || !fecha_evento) return fail(res, 400, "tipo_evento y fecha_evento obligatorios");

    const r = await pool.query(
      `INSERT INTO eventos (expediente_id, tipo_evento, descripcion, fecha_evento, creado_en)
       VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [parseInt(req.params.id), tipo_evento, descripcion || null, fecha_evento]
    );
    ok(res, { evento: r.rows[0] });
  } catch (err) {
    console.error("crear evento error:", err);
    fail(res);
  }
});

app.put("/api/eventos/:id", authOptional, async (req, res) => {
  try {
    const { tipo_evento, descripcion, fecha_evento } = req.body || {};
    const r = await pool.query(
      `UPDATE eventos SET tipo_evento=$1, descripcion=$2, fecha_evento=$3 WHERE id=$4 RETURNING *`,
      [tipo_evento, descripcion || null, fecha_evento, req.params.id]
    );
    ok(res, { evento: r.rows[0] });
  } catch (err) {
    console.error("editar evento error:", err);
    fail(res);
  }
});

app.delete("/api/eventos/:id", authOptional, async (req, res) => {
  try {
    await pool.query("DELETE FROM eventos WHERE id=$1", [req.params.id]);
    ok(res, { message: "Evento eliminado" });
  } catch (err) {
    console.error("eliminar evento error:", err);
    fail(res);
  }
});

// -----------------------------
// REPORTES CRUD
app.get("/api/expedientes/:id/reportes", authOptional, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM reportes WHERE expediente_id=$1 ORDER BY generado_en DESC", [req.params.id]);
    ok(res, { reportes: r.rows });
  } catch (err) {
    console.error("listar reportes error:", err);
    fail(res);
  }
});

app.post("/api/expedientes/:id/reportes", authOptional, async (req, res) => {
  try {
    const { contenido, generado_por } = req.body || {};
    const generadoBy = req.user ? (req.user.id) : (generado_por || null); // GUARDA ID (integer) si hay usuario
    const r = await pool.query(
      `INSERT INTO reportes (expediente_id, contenido, generado_por, generado_en)
       VALUES ($1,$2,$3,NOW()) RETURNING *`,
      [parseInt(req.params.id), contenido, generadoBy]
    );
    ok(res, { reporte: r.rows[0] });
  } catch (err) {
    console.error("crear reporte error:", err);
    fail(res);
  }
});

app.put("/api/reportes/:id", authOptional, async (req, res) => {
  try {
    const { contenido } = req.body || {};
    const r = await pool.query(`UPDATE reportes SET contenido=$1 WHERE id=$2 RETURNING *`, [contenido, req.params.id]);
    ok(res, { reporte: r.rows[0] });
  } catch (err) {
    console.error("editar reporte error:", err);
    fail(res);
  }
});

app.delete("/api/reportes/:id", authOptional, async (req, res) => {
  try {
    await pool.query("DELETE FROM reportes WHERE id=$1", [req.params.id]);
    ok(res, { message: "Reporte eliminado" });
  } catch (err) {
    console.error("eliminar reporte error:", err);
    fail(res);
  }
});

// -----------------------------
// DASHBOARD (resumen)
app.get("/api/reportes", authOptional, async (req, res) => {
  try {
    const totalExp = await pool.query("SELECT COUNT(*)::int AS total FROM expedientes");
    const porEstado = await pool.query(`
      SELECT COALESCE(NULLIF(estado,''),'Sin estado') AS estado, COUNT(*)::int AS total
      FROM expedientes GROUP BY COALESCE(NULLIF(estado,''),'Sin estado') ORDER BY estado
    `);
    const porUsuario = await pool.query(`
      SELECT COALESCE(u.nombre, e.creado_por, 'Desconocido') AS usuario, COUNT(*)::int AS total
      FROM expedientes e LEFT JOIN usuarios u ON u.email = e.creado_por OR u.nombre = e.creado_por OR u.id::text = e.creado_por
      GROUP BY usuario ORDER BY total DESC
    `);
    const esteMes = await pool.query(`
      SELECT COUNT(*)::int AS total FROM expedientes WHERE DATE_TRUNC('month', creado_en) = DATE_TRUNC('month', CURRENT_DATE)
    `);
    const cerrados = await pool.query(`SELECT COUNT(*)::int AS total FROM expedientes WHERE estado ILIKE 'Cerrado'`);
    ok(res, {
      indicadores: {
        total: Number(totalExp.rows[0].total),
        esteMes: Number(esteMes.rows[0].total),
        cerrados: Number(cerrados.rows[0].total),
      },
      porEstado: porEstado.rows,
      porUsuario: porUsuario.rows,
    });
  } catch (err) {
    console.error("dashboard error:", err);
    fail(res);
  }
});

// rutas dashboard individuales (opcional)
app.get("/api/dashboard/estado", authOptional, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT COALESCE(NULLIF(estado,''),'Sin estado') AS estado, COUNT(*)::int AS total
      FROM expedientes GROUP BY COALESCE(NULLIF(estado,''),'Sin estado') ORDER BY estado
    `);
    ok(res, { data: r.rows });
  } catch (err) {
    console.error(err);
    fail(res);
  }
});
app.get("/api/dashboard/usuario", authOptional, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT COALESCE(u.nombre, e.creado_por, 'Desconocido') AS usuario, COUNT(*)::int AS total
      FROM expedientes e LEFT JOIN usuarios u ON e.creado_por = u.email OR u.nombre = e.creado_por OR u.id::text = e.creado_por
      GROUP BY usuario ORDER BY total DESC
    `);
    ok(res, { data: r.rows });
  } catch (err) {
    console.error(err);
    fail(res);
  }
});

// -----------------------------
// ARCHIVOS (múltiples) - subir/listar/descargar/eliminar
app.post("/api/expedientes/:id/archivos", upload.array("archivos", 20), authOptional, async (req, res) => {
  try {
    const expedienteId = parseInt(req.params.id);
    const subidoPor = req.user ? req.user.id : (req.body.subido_por || null);

    const results = [];
    for (const f of req.files) {
      const inserted = await pool.query(
        `INSERT INTO archivos (expediente_id, nombre_original, archivo_path, tipo_mime, subido_por, subido_en)
         VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *`,
        [expedienteId, f.originalname, f.filename, f.mimetype, subidoPor]
      );
      results.push(inserted.rows[0]);
    }
    ok(res, { archivos: results });
  } catch (err) {
    console.error("subir archivos error:", err);
    fail(res);
  }
});

app.get("/api/expedientes/:id/archivos", authOptional, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM archivos WHERE expediente_id=$1 ORDER BY id DESC", [req.params.id]);
    ok(res, { archivos: r.rows });
  } catch (err) {
    console.error("listar archivos error:", err);
    fail(res);
  }
});

app.get("/api/archivos/:id/download", authOptional, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM archivos WHERE id=$1", [req.params.id]);
    if (r.rows.length === 0) return fail(res, 404, "Archivo no encontrado");
    const file = r.rows[0];
    const filePath = path.join(uploadDir, file.archivo_path);
    if (!fs.existsSync(filePath)) return fail(res, 404, "Archivo físico no encontrado");
    res.download(filePath, file.nombre_original);
  } catch (err) {
    console.error("download error:", err);
    fail(res);
  }
});

app.delete("/api/archivos/:id", authOptional, async (req, res) => {
  try {
    const r = await pool.query("DELETE FROM archivos WHERE id=$1 RETURNING *", [req.params.id]);
    if (r.rows.length === 0) return fail(res, 404, "Archivo no encontrado");
    // borrar archivo físico si existe
    const fp = path.join(uploadDir, r.rows[0].archivo_path);
    if (fs.existsSync(fp)) {
      try { fs.unlinkSync(fp); } catch (e) { console.warn("no se pudo borrar archivo físico:", e.message); }
    }
    ok(res, { archivo: r.rows[0] });
  } catch (err) {
    console.error("eliminar archivo error:", err);
    fail(res);
  }
});

// -----------------------------
// IA: analizar archivo individual
app.post("/api/archivos/:id/analizar", authRequired, async (req, res) => {
  try {
    const archivoId = parseInt(req.params.id);
    const r = await pool.query("SELECT * FROM archivos WHERE id=$1", [archivoId]);
    if (r.rows.length === 0) return fail(res, 404, "Archivo no encontrado");
    const archivo = r.rows[0];

    const absPath = path.join(uploadDir, archivo.archivo_path);
    if (!fs.existsSync(absPath)) return fail(res, 404, "Archivo físico no encontrado");

    const texto = await leerContenidoArchivo(absPath, archivo.tipo_mime, archivo.nombre_original);
    const systemMsg = "Eres un abogado peruano experto en cese de alimentos. Analiza el documento, extrae resoluciones, fundamentos jurídicos relevantes y ofrece recomendaciones prácticas.";
    const userMsg = `Documento: ${archivo.nombre_original}\n\n${texto}`;

    const aiResult = await callAISystem(systemMsg, userMsg);

    // Guardar reporte: expediente_id viene del archivo
    const generadoPor = req.user?.id || null;
    const insert = await pool.query(
      `INSERT INTO reportes (expediente_id, contenido, generado_por, generado_en)
       VALUES ($1,$2,$3,NOW()) RETURNING *`,
      [archivo.expediente_id, `📄 Análisis de ${archivo.nombre_original}:\n\n${aiResult}`, generadoPor]
    );

    ok(res, { reporte: insert.rows[0] });
  } catch (err) {
    console.error("analizar archivo error:", err);
    fail(res, 500, "Error analizando archivo");
  }
});

// -----------------------------
// IA: análisis global expediente (todos los archivos)
app.post("/api/expedientes/:id/analizar", authRequired, async (req, res) => {
  try {
    const expedienteId = parseInt(req.params.id);
    const r = await pool.query("SELECT * FROM archivos WHERE expediente_id=$1 ORDER BY id", [expedienteId]);
    if (r.rows.length === 0) return fail(res, 400, "No hay archivos para analizar");

    let contenidoTotal = "";
    for (const archivo of r.rows) {
      const absPath = path.join(uploadDir, archivo.archivo_path);
      const texto = await leerContenidoArchivo(absPath, archivo.tipo_mime, archivo.nombre_original);
      contenidoTotal += `\n--- ${archivo.nombre_original} ---\n${texto}\n`;
    }

    const systemMsg = "Eres un abogado peruano experto en procesos de cese de alimentos. Lee el expediente completo y entrega un análisis general con pasos recomendados, riesgos, fundamentos legales y un resumen ejecutivo.";
    const userMsg = `Expediente ID: ${expedienteId}\n\n${contenidoTotal}`;

    const aiResult = await callAISystem(systemMsg, userMsg);

    const generadoPor = req.user?.id || null;
    const insert = await pool.query(
      `INSERT INTO reportes (expediente_id, contenido, generado_por, generado_en)
       VALUES ($1,$2,$3,NOW()) RETURNING *`,
      [expedienteId, `📚 Análisis general del expediente:\n\n${aiResult}`, generadoPor]
    );

    ok(res, { reporte: insert.rows[0] });
  } catch (err) {
    console.error("analizar expediente error:", err);
    fail(res, 500, "Error en análisis global");
  }
});

// -----------------------------
// Servir uploads estático
app.use("/uploads", express.static(uploadDir));

// -----------------------------
// Iniciar servidor
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
  console.log(
    `🔧 IA: ${
      process.env.OPENAI_API_KEY
        ? "OpenAI activo"
        : process.env.AI_API_KEY
        ? "AI API KEY detectada (verificar AI_BASE_URL)"
        : "No hay IA configurada"
    }`
  );
});