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

router.post("/add", (req, res) => {
  // Rece data and convert to model
  const wallet: WalletGetResponse = req.body;
  let sql1 =
    "INSERT INTO `Wallet`(`userID`, `amount`, `transactionDate`) VALUES (?,?,?)";
    const transactionDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
  sql1 = mysql.format(sql1, [wallet.userID, wallet.amount, transactionDate]);

  // ส่งข้อมูลกระเป๋าเงินไปยังฐานข้อมูล
  conn.query(sql1, (err1, result1) => {
    if (err1) throw err1;

    // ส่งคืนข้อมูล
    res.status(201).json({
      // affected_rows_users: result.affectedRows,
      // last_idx_users: result.insertId,
      affected_rows_wallet: result1.affectedRows,
      last_idx_wallet: result1.insertId,
    });
  });
});
