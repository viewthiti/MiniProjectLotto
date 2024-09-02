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

  const sumWalletSql = "SELECT SUM(amount) AS total FROM Wallet WHERE userID = ?";

  conn.query(sumWalletSql, [userID], (err, result) => {
    if (err) {
      console.error("Error fetching wallet total:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const total = result[0].total || 0;

    return res.status(200).json({ total });
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
