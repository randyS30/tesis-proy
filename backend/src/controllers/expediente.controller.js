import pool from "../models/db.js";

export const listarExpedientes = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM expedientes ORDER BY creado_en DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearExpediente = async (req, res) => {
  try {
    const { numero_expediente, demandante, demandado, fecha_inicio, creado_por } = req.body;
    const result = await pool.query(
      "INSERT INTO expedientes (numero_expediente, demandante, demandado, fecha_inicio, creado_por) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [numero_expediente, demandante, demandado, fecha_inicio, creado_por]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
