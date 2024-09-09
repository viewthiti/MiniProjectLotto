import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { log } from "console";

export const router = express.Router();
let winningNumbers: string[] = [];


//ดึงข้อมูลPurchasedLottoออกมาโชว์
router.get("/PurchasedLotto", (req, res) => {
  const sql = "SELECT lottoNumber FROM PurchasedLotto";
  
  conn.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "An error occurred while fetching data" });
      return;
    }

    res.json(result);
  });
});

router.get("/random", (req, res) => {
  winningNumbers = lottoRandom(); // Generates random lottery numbers
  res.status(200).json({ winningNumbers }); // Sends the numbers back to the client
});

function lottoRandom() {
  const prizes = [];
  const numPrizes = 20; // จำนวนรางวัล
  const numDigits = 6; // จำนวนหลักของตัวเลข

  for (let i = 0; i < numPrizes; i++) {
    let number = "";
    for (let j = 0; j < numDigits; j++) {
      number += Math.floor(Math.random() * 10); // สุ่มตัวเลข 0-9
    }
    prizes.push(number);
  }
  return prizes;
}

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
