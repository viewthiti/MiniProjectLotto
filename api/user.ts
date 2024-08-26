import express from "express";
import { conn } from "../dbconnect";
import { Users } from "../model/users_get_res";
import mysql from "mysql";
import { WalletGetResponse } from "../model/wallet_get_res";

export const router = express.Router();

router.get("/Users", (req, res) => {
  conn.query("select * from Users", (err, result, fields) => {
    res.json(result);
  });
});

// Login
router.post("/login", (req, res) => {
  const { phone } = req.body;
  const { password } = req.body;

  const sql = "SELECT * FROM Users WHERE phone = ? AND password = ?";

  conn.query(sql, [phone, password], (err, result, fields) => {
    if (err) {
      res.status(500).json({ message: "An error occurred" });
      return;
    }

    if (result.length > 0) {
      const Users = result[0];
      res.json({
        message: "Match found",
        Users,
      });
    } else {
      res.json({ message: "No match found" });
    }
  });
});

//insert amount ยังไม่ได้
router.post("/register", (req, res) => {
  // Rece data and convert to model
  const users: Users = req.body;
  const wallet: WalletGetResponse = req.body;

  let sql =
    "INSERT INTO `Users`(`username`, `phone`, `email`, `password`, `img`, `typeID`) VALUES (?,?,?,?,?,?)";

  sql = mysql.format(sql, [
    users.username,
    users.phone,
    users.email,
    users.password,
    null,
    1,
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    const userID = result.insertId;

    // สร้างคำสั่ง SQL สำหรับ Wallet
    let sql1 =
      "INSERT INTO `Wallet`(`userID`, `amount`, `transactionDate`) VALUES (?,?,?)";
    sql1 = mysql.format(sql1, [userID, wallet.amount, Date.now()]);

    // ส่งข้อมูลกระเป๋าเงินไปยังฐานข้อมูล
    conn.query(sql1, (err1, result1) => {
      if (err1) throw err1;

      // ส่งคืนข้อมูล
      res.status(201).json({
        affected_rows_users: result.affectedRows,
        last_idx_users: result.insertId,
        affected_rows_wallet: result1.affectedRows,
        last_idx_wallet: result1.insertId,
      });
    });
  });
});

//ลบบัญชีผู้ใช้
router.delete("/delete/:id", (req, res) => {
  const  userId  = req.params.id;

  const sql = "DELETE FROM Users WHERE userID = ?";

  conn.query(sql, [userId], (err, result) => {
    if (err) {
      res.status(500).json({ message: "error" });
      return;
    }

    if (result.affectedRows > 0) {
      res.json({
        message: "User deleted successfully",
      });
    } 
  });
});
