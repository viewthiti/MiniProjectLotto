import express from "express";
import { conn } from "../dbconnect";

export const router = express.Router();

router.delete("/delete", (req, res) => {
  const deleteUsers = new Promise((resolve, reject) => {
    conn.query("DELETE FROM Users WHERE typeID = 1", (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

  const deleteAdminDraws = new Promise((resolve, reject) => {
    conn.query("DELETE FROM AdminDraws", (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

  Promise.all([deleteUsers, deleteAdminDraws])
    .then(([userResult, adminResult]) => {
      res.json({
        message: "User typeID 1 and admin draws deleted successfully",
        userResult,
        adminResult,
      });
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
});
