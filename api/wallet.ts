import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { WalletGetResponse } from "../model/wallet_get_res";

export const router = express.Router();

router.get("/wallet", (req, res) => {
  conn.query("select * from Wallet", (err, result, fields) => {
    res.json(result);
  });
});

//ยอดเงินรวม
router.get("/total/:userID", (req, res) => {
  const userID = +req.params.userID;

  if (!userID) {
    return res.status(400).json({ error: 'userID is required' });
  }

  const sumWalletSql = "SELECT U.username, SUM(W.amount) AS total FROM Wallet W INNER JOIN Users U ON W.userID = U.userID WHERE W.userID = ? GROUP BY U.username"; // เพิ่ม GROUP BY

  conn.query(sumWalletSql, [userID], (err, result) => {
    if (err) {
      console.error("Error fetching wallet total:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // ส่งคืนเป็นรายการ
    const response = result.map((row: { username: any; total: any; }) => ({
      username: row.username,
      total: row.total || 0,
    }));

    return res.status(200).json(response); // ส่งคืนข้อมูลในรูปแบบรายการ
  });
});

//เติมเงิน
router.post("/add/:userID", (req, res) =>  {
  const userID = +req.params.userID;
  const { amount } = req.body;

  // Validate input
  if (!userID || !amount) {
    return res.status(400).json({ error: 'userID and amount are required' });
  }

  if (amount < 500) {
    return res.status(403).json({ error: 'Wallet amount must be greater than 500.' });
  }

  const purchaseDate = new Date();  // Get the current date
  const insertWalletSql = "INSERT INTO Wallet (userID, amount, transactionDate) VALUES (?, ?, ?)";

  conn.query(insertWalletSql, [userID, amount, purchaseDate], (err, result) => {
    if (err) {
      console.error("Error inserting into Wallet:", err);
      return res.status(500).json({ error: "Database error" });
    }

    return res.status(200).json({ message: "Amount added successfully", result });
  });
});

//ถอนเงิน
router.post("/withdraw/:userID", (req, res) => {
  const userID = +req.params.userID;
  const { amount } = req.body;

  if (!userID || !amount || amount <= 0) {
    return res.status(400).json({ error: 'userID and a valid amount are required' });
  }

  const withdrawalAmount = -Math.abs(amount);

  const sumWalletSql = "SELECT SUM(amount) AS balance FROM Wallet WHERE userID = ?";
  const insertWalletSql = "INSERT INTO Wallet (userID, amount, transactionDate) VALUES (?, ?, ?)";
  const purchaseDate = new Date();  

  conn.query(sumWalletSql, [userID], (err, result) => {
    if (err) {
      console.error("Error fetching wallet balance:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const balance = result[0].balance || 0;

    if (balance + withdrawalAmount < 0) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    conn.query(insertWalletSql, [userID, withdrawalAmount, purchaseDate], (err, result) => {
      if (err) {
        console.error("Error inserting into Wallet:", err);
        return res.status(500).json({ error: "Database error" });
      }

      return res.status(200).json({ message: "Amount withdrawn successfully", result });
    });
  });
});

//ธุรกรรม
router.get("/transaction", (req, res) => {
  const userID = req.query.userID; // Assuming you're passing the userID as a query parameter

  const sql = "SELECT * FROM Wallet WHERE userID = ? ORDER BY transactionDate DESC LIMIT 10";
  const formattedSql = mysql.format(sql, [userID]);

  conn.query(formattedSql, (err, result, fields) => {
    if (err) throw err;
    res.json(result);
  });
});

