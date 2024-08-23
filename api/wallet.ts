import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";

export const router = express.Router();

router.get("/wallet", (req, res) => {
  conn.query("select * from Wallet", (err, result, fields) => {
    res.json(result);
  });
});
