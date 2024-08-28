import express from "express";
import { conn } from "../dbconnect";
import { Users } from "../model/users_get_res";
import mysql from "mysql";
import { WalletGetResponse } from "../model/wallet_get_res";

export const router = express.Router();
const bcrypt = require('bcryptjs');

router.get("/Users", (req, res) => {
  conn.query("select * from Users", (err, result, fields) => {
    res.json(result);
  });
});


router.post("/login", (req, res) => {
  const { phone, password } = req.body;

  // ใช้ SQL เพื่อค้นหาเฉพาะผู้ใช้ที่มีหมายเลขโทรศัพท์
  const sql = "SELECT * FROM Users WHERE phone = ?";

  conn.query(sql, [phone], async (err, result) => {
    if (err) {
      res.status(500).json({ message: "An error occurred" });
      return;
    }

    // หากพบผู้ใช้
    if (result.length > 0) {
      const Users = result[0];
      // เปรียบเทียบรหัสผ่านที่ป้อนกับรหัสผ่านที่ถูกแฮช
      const match = await bcrypt.compare(password, Users.password);
      if (match) {
        res.json({
          message: "Match found",
          Users,
        });
      } else {
        // รหัสผ่านไม่ถูกต้อง
        res.status(401).json({ message: "Invalid phone or password" });
      }
    } else {
      res.status(404).json({ message: "No user found with that phone number" });
    }
  });
});


//insert amount ยังไม่ได้
router.post("/register", (req, res) => {
  // Rece data and convert to model
  const users: Users = req.body;
  const wallet: WalletGetResponse = req.body;

  if (users.password !== users.confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  let checkEmailphoneSql = "SELECT * FROM `Users` WHERE `email` = ? or `phone` = ?";
  checkEmailphoneSql = mysql.format(checkEmailphoneSql, [users.email, users.email]);

  conn.query(checkEmailphoneSql, async (err, results) => {
    if (err) throw err;

    // ถ้ามีอีเมลหรือหมายเลขโทรศัพท์อยู่ในฐานข้อมูลแล้ว
    if (results.length > 0) {
      const existingEmails = results.filter((user: { email: string; }) => user.email === users.email);
      const existingPhones = results.filter((user: { phone: string; }) => user.phone === users.phone);
      
      const errors = [];
      if (existingEmails.length > 0) {
        errors.push("Email already registered.");
      }
      if (existingPhones.length > 0) {
        errors.push("Phone number already registered.");
      }
      return res.status(409).json({ errors });
    }

    // ถ้าอีเมลไม่อยู่ในฐานข้อมูล ให้ทำการลงทะเบียนผู้ใช้ใหม่
    try {
      const hashedPassword = await bcrypt.hash(users.password, 10);
      let sql =
        "INSERT INTO `Users`(`username`, `phone`, `email`, `password`, `img`, `typeID`) VALUES (?,?,?,?,?,?)";

      sql = mysql.format(sql, [
        users.username,
        users.phone,
        users.email,
        hashedPassword,
        null,
        1,
      ]);

      conn.query(sql, (err, result) => {
        if (err) throw err;
        const userID = result.insertId;

        // สร้างคำสั่ง SQL สำหรับ Wallet
        let sql1 =
          "INSERT INTO `Wallet`(`userID`, `amount`, `transactionDate`) VALUES (?,?,?)";
        const transactionDate = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");
        sql1 = mysql.format(sql1, [userID, wallet.amount, transactionDate]);

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
    } catch (hashError) {
      console.error("Error hashing password:", hashError);
      return res.status(500).json({ error: "Error registering user." });
    }
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
