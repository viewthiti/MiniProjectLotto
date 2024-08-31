import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { AdminDrawsGetResponse } from "../model/admin_get_res";
// import { WalletGetResponse } from "../model/wallet_get_res";

export const router = express.Router();
let winningNumbers: string[] = [];

router.get("/admin", (req, res) => {
  conn.query(
    "SELECT * FROM AdminDraws WHERE drawID = 1",
    (err, result, fields) => {
      res.json(result);
    }
  );
});

// router.get("/random", async (req, res) => {
//   try {
//     const winningNumbers = await lottoWinSold(); // สุ่มหมายเลขล็อตเตอรี่
//     res.status(200).json({ winningNumbers }); // ส่งหมายเลขกลับไปยังไคลเอนต์
//   } catch (error) {
//     console.error("Error generating winning numbers:", error);
//     res.status(500).json({ error: "Failed to generate winning numbers" });
//   }
// });

// router.get("/dateNow", (req, res) => {
//   conn.query(
//     "SELECT lottoNumber FROM PurchasedLotto WHERE DATE_FORMAT(purchaseDate, '%Y-%m-%d') = CURDATE()",
//     (err, result, fields) => {
//       res.json(result);
//     }
//   );
// });

router.get("/random", async (req, res) => {
  const type = req.query.type; // รับค่าจาก query parameter

  try {
    let winningNumbers: string[];

    // ตรวจสอบค่าที่รับมา
    if (type === "1") {
      winningNumbers = lottoWinAll(); // คาดว่า lottoWinAll เป็น synchronous
    } else if (type === "2") {
      winningNumbers = await lottoWinSold(); // ใช้ await เพื่อรอผลลัพธ์
    } else {
      return res
        .status(400)
        .json({ error: "Invalid type. Please use type=1 or type=2." });
    }

    res.status(200).json({ winningNumbers }); // ส่งหมายเลขกลับไปยังไคลเอนต์
  } catch (error) {
    console.error("Error in /random:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/lottoWin", (req, res) => {
  let sql =
    "INSERT INTO `AdminDraws`(`winningNumber`, `prizeType`, `drawDate`) VALUES (?,?,?)";
  const darwDate = new Date().toISOString().slice(0, 19).replace("T", " ");

  winningNumbers.forEach((index) => {
    const prizeType = index + 1;
    sql = mysql.format(sql, [winningNumbers, prizeType, darwDate]);

    conn.query(sql, (err, result) => {
      if (err) {
        console.error("Error inserting into AdminDraws:", err);
        return res.status(500).json({ error: "Database error" });
      }

      // ส่งข้อมูลผลลัพธ์หลังจากการแทรก
      res.status(201).json({
        affected_rows_AdminDraws: result.affectedRows,
        last_idx_AdminDraws: result.insertId,
      });
    });
  });
});


function lottoWinAll() {
  const prizes = [];
  const numPrizes = 5; // จำนวนรางวัล
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

function lottoWinSold(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const sql =
      "SELECT lottoNumber FROM PurchasedLotto WHERE DATE(purchaseDate) = CURDATE()";

    conn.query(sql, (err, result) => {
      if (err) {
        console.error("Error fetching purchased lotto numbers:", err);
        return reject(err); // Return error if there's a problem with the query
      }

      const soldNumbers = result.map(
        (item: { lottoNumber: any }) => item.lottoNumber
      );

      const numPrizes = 5; // Number of prizes

      // Check if there are at least 5 purchased numbers
      if (soldNumbers.length < numPrizes) {
        return reject(null); // Reject if less than 5 numbers
      }

      const prizes: string[] = [];
      const availableNumbers = [...soldNumbers]; // Create a copy of soldNumbers

      for (let i = 0; i < numPrizes; i++) {
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        prizes.push(availableNumbers[randomIndex]); // Select a number
        availableNumbers.splice(randomIndex, 1); // Remove the selected number to avoid duplicates
      }

      resolve(prizes); // Return the selected winning numbers
    });
  });
}
