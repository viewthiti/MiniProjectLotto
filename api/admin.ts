import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { AdminDrawsGetResponse } from "../model/admin_get_res";
// import { WalletGetResponse } from "../model/wallet_get_res";

export const router = express.Router();
let winningNumbers: string[] = [];
let cachedPrizes : string[] = []; // ตัวแปร global สำหรับเก็บหมายเลขที่สุ่มแล้ว


router.get("/admin", (req, res) => {
  conn.query(
    "SELECT * FROM AdminDraws WHERE drawID = 1",
    (err, result, fields) => {
      res.json(result);
    }
  );
});

//random
// รับหมายเลขสุ่มจาก `getRandomPrizes` หรือ `lottoWinSold`
router.get("/random", async (req, res) => {
  const type = req.query.type; // รับค่าจาก query parameter

  try {
    let winningNumbers: string[];

    // ตรวจสอบค่าที่รับมา
    if (type === "1") {
      winningNumbers = getRandomPrizes(); // คาดว่า lottoWinAll เป็น synchronous
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



// insert เลขที่สุ่มแล้ว
router.post("/lottoWin", (req, res) => {
  const { winningNumbers } = req.body; // รับค่าจาก body
  const drawDate = new Date().toISOString().slice(0, 19).replace("T", " ");

  if (
    !Array.isArray(winningNumbers) ||
    winningNumbers.some((num) => typeof num !== "string")
  ) {
    return res.status(400).json({ error: "Invalid data format" });
  }

  // แปลงสตริงเป็นตัวเลข
  const numbers = winningNumbers.map((num) => parseInt(num, 10));

  // เตรียมคำสั่ง SQL สำหรับการแทรกหลายแถว
  const sql =
    "INSERT INTO `AdminDraws`(`winningNumber`, `prizeType`, `drawDate`) VALUES ?";
  const values = numbers.map((number, index) => [number, index + 1, drawDate]);

  conn.query(sql, [values], (err, result) => {
    if (err) {
      console.error("Error inserting into AdminDraws:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // ทำการสุ่มหมายเลขใหม่หลังจากการบันทึกสำเร็จ
    cachedPrizes = []; // รีเซ็ต cachedPrizes

    // ส่งข้อมูลผลลัพธ์หลังจากการแทรก
    res.status(201).json({
      affected_rows_AdminDraws: result.affectedRows,
      last_idx_AdminDraws: result.insertId,
    });
  });
});


// ฟังก์ชันสุ่มเลขทั้งหมด (แก้ไข)
router.get("/randomALL", (req, res) => {
  if (cachedPrizes.length === 0) {
    cachedPrizes = lottoWinAll(); // สุ่มหมายเลขใหม่หากยังไม่มีหมายเลขในตัวแปร
  }
  res.status(200).json({ winningNumbers: cachedPrizes }); // ส่งหมายเลขทั้งหมด
});



// ฟังก์ชันสุ่มเลขทั้งหมด
function lottoWinAll(): string[] {
  const prizes: string[] = [];
  const numPrizes = 100; // จำนวนรางวัล
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

// ฟังก์ชันที่สุ่ม 5 หมายเลขจากหมายเลขทั้งหมดที่ได้จาก lottoWinAll
function getRandomPrizes(numPrizesToSelect = 5): string[] {
  if (cachedPrizes.length === 0) {
    cachedPrizes = lottoWinAll(); // สุ่มหมายเลขใหม่เมื่อยังไม่มีหมายเลขในตัวแปร
  }
  const shuffledPrizes = cachedPrizes.sort(() => 0.5 - Math.random()); // สุ่มเรียงลำดับหมายเลขทั้งหมด
  return shuffledPrizes.slice(0, numPrizesToSelect); // เลือกหมายเลขที่สุ่มมา 5 ตัว
}


// การทดสอบการเรียกใช้งาน
console.log(getRandomPrizes()); // จะได้ 5 หมายเลขที่สุ่มมาจากหมายเลขทั้งหมด

//สุ่มเลขที่ขายแล้ว
function lottoWinSold(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const sql =
      "SELECT DISTINCT lottoNumber FROM PurchasedLotto WHERE DATE(purchaseDate) = CURDATE()";

    conn.query(sql, (err, result) => {
      if (err) {
        console.error("Error fetching purchased lotto numbers:", err);
        return reject(err); // Return error if there's a problem with the query
      }

      const soldNumbers = result.map(
        (item: { lottoNumber: any }) => item.lottoNumber as string // Type assertion to string
      );

      const numPrizes = 5; // Number of prizes

      // Remove duplicates using a Set
      const uniqueSoldNumbers = Array.from(new Set(soldNumbers));

      // Check if there are at least 5 unique purchased numbers
      if (uniqueSoldNumbers.length < numPrizes) {
        return reject(null); // Reject if less than 5 unique numbers
      }

      const prizes: string[] = [];
      const selectedNumbers = new Set<string>(); // Specify the Set type as string

      while (prizes.length < numPrizes) {
        const randomIndex = Math.floor(
          Math.random() * uniqueSoldNumbers.length
        );
        const selectedNumber = uniqueSoldNumbers[randomIndex] as string; // Type assertion to string

        // Check if the selected number is already chosen
        if (!selectedNumbers.has(selectedNumber)) {
          prizes.push(selectedNumber); // Add to prizes
          selectedNumbers.add(selectedNumber); // Add to selected numbers to avoid duplicates
        }
      }

      resolve(prizes); // Return the selected winning numbers
    });
  });
}

//ดึงข้อมูลมางวดล่าสุดไปหน้า Home
const moment = require('moment'); // นำเข้า moment.js
require('moment/locale/th'); // นำเข้า locale ภาษาไทย

router.get("/drawsNow", (req, res) => {
  conn.query(
    "SELECT * FROM AdminDraws ORDER BY drawID DESC LIMIT 5",
    (err, result, fields) => {
      if (err) throw err;

      // กำหนด type ให้กับ result ว่าเป็น array ของ objects
      result = result.map((draw: { drawDate: string }) => {
        // ปรับปีจาก ค.ศ. เป็น พ.ศ.
        let drawDate = moment(draw.drawDate);
        let yearBuddhistEra = drawDate.year() + 543;
        draw.drawDate = drawDate.format(`DD MMMM ${yearBuddhistEra}`);
        return draw;
      });

      res.json(result);
    }
  );
});


