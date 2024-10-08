import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { log } from "console";
import moment from "moment";

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


// ***************************************
router.get("/PurchasedLotto/:id", (req, res) => {
  const userID = req.params.id; 

  const sql = `
    SELECT *
    FROM PurchasedLotto
    WHERE userID = ?
    ORDER BY purchaseDate DESC
  `;

  conn.query(sql, [userID], (err, result) => {
    if (err) {
      console.error("Error fetching purchased lotto numbers:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // พิมพ์ข้อมูลดิบเพื่อตรวจสอบโครงสร้าง
    // console.log("Raw result:", result);

    if (result.length > 0) {
      // ปรับปีจาก ค.ศ. เป็น พ.ศ. และจัดรูปแบบวันที่
      result = result.map((transaction: { purchaseDate: string}) => {
        let purchaseDate = moment(transaction.purchaseDate); // ใช้ purchaseDate
        let yearBuddhistEra = purchaseDate.year() + 543; // ปรับปีเป็น พ.ศ.
        transaction.purchaseDate = purchaseDate.format(`DD MMMM ${yearBuddhistEra}`); // จัดรูปแบบวันที่ตามที่ต้องการ
        return transaction;
      });
    } else {
      console.log("No results found");
    }

    // ส่งผลลัพธ์ที่จัดรูปแบบแล้วกลับไปที่ client
    res.status(200).json(result);
  });
});

//เช็คผลรางวัล
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

//เช็คผลรางวัล
router.get("/check2", (req, res) => {
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

//ขึ้นเงิน
router.post("/prizeMoney/:userID/:purchaseID", (req, res) => {
  const userID = +req.params.userID;
  const purchaseID = +req.params.purchaseID;

  const prizeMoney = req.body.prizeMoney;  
  const purchaseDate = new Date(); 
  
  const insertWalletSql = "INSERT INTO Wallet (userID, amount, transactionDate) VALUES (?, ?, ?)";
  const deletePurchaseSql = "DELETE FROM PurchasedLotto WHERE purchaseID = ?";

  conn.query(insertWalletSql, [userID, prizeMoney, purchaseDate], (err, result) => {
    if (err) {
      console.error("Error inserting into Wallet:", err);
      return res.status(500).json({ error: "Database error" });
    }

    conn.query(deletePurchaseSql, [purchaseID], (err, results) => {
      if (err) {
        console.error("Error deleting from tablePurchasedLotto:", err);
        return res.status(500).json({ error: "Database error" });
      }

      return res.status(200).json({ message: "Amount added and purchase record deleted successfully", result });
    });
  });
});




