import { Router } from "express";
import { listarExpedientes, crearExpediente } from "../controllers/expediente.controller.js";

const router = Router();

router.get("/", listarExpedientes);
router.post("/", crearExpediente);

export default router;
