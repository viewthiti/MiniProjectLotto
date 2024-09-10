import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { log } from "console";
const moment = require('moment');

export const router = express.Router();
let winningNumbers: string[] = [];
const { purchasedNumbers } = require('./purchasedNumbers');


//ดึงข้อมูลPurchasedLottoออกมาโชว์
router.get("/Purchased/:id", (req, res) => {
  const userID = req.params.id;
  const sql = `
    SELECT *
    FROM PurchasedLotto 
    WHERE userID = ?
    ORDER BY purchaseDate DESC
  `;
  
  conn.query(sql, [userID, userID], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "An error occurred while fetching data" });
      return;
    }

    res.json(result);
  });
});

//insert เลขที่ซื้อในตะกร้าโดยที่หักเงินเเล้ว 
router.post("/lottoBuy/:userID", (req, res) => {
  const userID = +req.params.userID;
  const { lottoNumber } = req.body; 
  const purchaseDate = new Date().toISOString().slice(0, 19).replace("T", " ");
  const cost = 120; 

  // ตรวจสอบว่า `lottoNumber` เป็น string และไม่ใช่ค่าที่ว่างเปล่า
  if (typeof lottoNumber !== "string" || lottoNumber.trim() === "") {
    return res.status(400).json({ error: "Invalid lotto number format" });
  }
  
  // ตรวจสอบยอดเงินใน Wallet
  const checkWalletSql = "SELECT SUM(amount) AS totalAmount FROM Wallet WHERE userID = ?";
  conn.query(checkWalletSql, [userID], (err, result) => {
    if (err) {
      console.error("Error checking wallet amount:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (result.length === 0 || result[0].totalAmount === null) {
      // ไม่พบข้อมูลใน Wallet หรือยอดเงินเป็น null
      return res.status(404).json({ error: "Wallet not found" });
    }

    const walletAmount = result[0].totalAmount;
    log(walletAmount);

    if (walletAmount < cost) {
      // ยอดเงินไม่พอเด้อ
      return res.status(300).json({ error: "Insufficient funds" });
    }

    // ตรวจสอบว่าเลขล็อตเตอรี่ซ้ำ
    const checkLottoSql = "SELECT * FROM PurchasedLotto WHERE userID = ? AND lottoNumber = ?";
    conn.query(checkLottoSql, [userID, lottoNumber], (err, result) => {
      if (err) {
        console.error("Error checking duplicate lotto number:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (result.length > 0) {
        // พบเลขที่ซ้ำ
        return res.status(400).json({ error: "Lotto number already purchased" });
      }

      // หากไม่พบเลขที่ซ้ำ ให้ทำการแทรกข้อมูล
      const insertLottoSql = "INSERT INTO `PurchasedLotto`(`userID`, `lottoNumber`, `purchaseDate`) VALUES (?, ?, ?)";
      conn.query(insertLottoSql, [userID, lottoNumber, purchaseDate], (err, result) => {
        if (err) {
          console.error("Error inserting into PurchasedLotto:", err);
          return res.status(500).json({ error: "Database error" });
        }

         // แทรกข้อมูลการถอนเงินลงใน Wallet
         const insertWalletSql = "INSERT INTO Wallet (userID, amount, transactionDate) VALUES (?, ?, ?)";
         conn.query(insertWalletSql, [userID, -cost, purchaseDate], (err, result) => {
           if (err) {
             console.error("Error inserting into Wallet:", err);
             return res.status(500).json({ error: "Database error" });
           }

           purchasedNumbers.add(lottoNumber); console.log(purchasedNumbers);
          // ส่งข้อมูลผลลัพธ์หลังจากการแทรก
          res.status(201).json({
            affected_rows_PurchasedLotto: result.affectedRows,
            last_insert_id: result.insertId,
            message: "Purchase successful, wallet updated",
          });
        });
      });
    });
  });
});

//ขึ้นเงิน
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

router.get("/purchasedLotto", (req, res) => {
  const userID = req.query.userID; // รับ userID จาก query string

  const sql = `
    SELECT DATE(purchaseDate) AS purchaseDate, GROUP_CONCAT(lottoNumber) AS purchasedNumbers
    FROM PurchasedLotto
    WHERE userID = ?
    GROUP BY DATE(purchaseDate)
    ORDER BY purchaseDate
  `;

  conn.query(sql, [userID], (err, result) => {
    if (err) {
      console.error("Error fetching purchased lotto numbers:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.status(200).json(result); // ส่งข้อมูลผลลัพธ์กลับไปยังไคลเอนต์
  });
});

router.get("/checkLottoNumbers/:userID", (req, res) => {
  const userID = req.params.userID;

  // SQL query to join tables and find matching lotto numbers
  const sql = `
    SELECT p.*, d.*, d.*
    FROM PurchasedLotto p
    JOIN AdminDraws d ON p.lottoNumber = d.lottoNumber
    WHERE p.userID = ?
    ORDER BY d.drawDate DESC
  `;

  conn.query(sql, [userID], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "An error occurred while fetching data" });
      return;
    }

    // Return results
    res.json(results);
  });
});

router.get("/PurchasedLotto/:id", (req, res) => {
  const userID = req.params.id; // Use req.params.id for route parameters

  const sql = `
    SELECT DATE(purchaseDate) AS purchaseDate, GROUP_CONCAT(lottoNumber) AS purchasedNumbers
    FROM PurchasedLotto
    WHERE userID = ?
    GROUP BY DATE(purchaseDate)
    ORDER BY purchaseDate
  `;

  conn.query(sql, [userID], (err, result) => {
    if (err) {
      console.error("Error fetching purchased lotto numbers:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.status(200).json(result); // Send results back to client
  });
});

router.get("/check/:id", (req, res) => {
  const userID = req.params.id;
  const sql = `
    SELECT *
    FROM PurchasedLotto 
    WHERE userID = ? 
    AND purchaseDate = (SELECT MAX(purchaseDate) FROM PurchasedLotto WHERE userID = ?)
  `;
  
  conn.query(sql, [userID, userID], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "An error occurred while fetching data" });
      return;
    }

    res.json(result);
  });
});

router.get("/check2", (req, res) => {
  // Correct SQL query
  const sql = `
    SELECT *
    FROM AdminDraws
    ORDER BY drawID DESC
    LIMIT 5
  `;
  
  conn.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "An error occurred while fetching data" });
      return;
    }
    res.json(result);
  });
});

