import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";

export const router = express.Router();
let winningNumbers: string[] = [];

router.get("/random", (req, res) => {
  winningNumbers = lottoRandom(); // Generates random lottery numbers
  res.status(200).json({ winningNumbers }); // Sends the numbers back to the client
});

function lottoRandom() {
  const prizes = [];
  const numPrizes = 10; // จำนวนรางวัล
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

router.post('/search', (req, res) => {
    const { number } = req.body;
    const numOptions = 10; 
    const lengthOfOptions = 6; 

    // ตรวจสอบว่าเลขที่ส่งมามี 6 หลักหรือไม่
    if (!number || number.length > lengthOfOptions) {
        return res.status(400).json({ error: 'หมายเลขต้องมี 6 หลักหรือไม่ควรเกิน 6 หลัก' });
    }

    if (number.length === lengthOfOptions) {
        // ถ้าครบ 6 หลักให้แสดงเลขที่กรอก
        return res.json({ options: [number] });
    }

    // สุ่มเลขที่เหลือ
    const options = [];
    const missingDigits = lengthOfOptions - number.length;

    for (let i = 0; i < numOptions; i++) {
        const randomDigits = Array.from({ length: missingDigits }, () => Math.floor(Math.random() * 10)).join('');
        options.push(number + randomDigits);
    }

    res.json({ options });
});





