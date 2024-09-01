import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";

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
