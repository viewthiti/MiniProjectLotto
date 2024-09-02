import express from "express";
import { conn, queryAsync } from "../dbconnect";
import mysql from "mysql";
import { editUsers } from "../model/edit_get_res";
import { log } from "console";


export const router = express.Router();

//ดึงข้อมูลมาโชว์
router.get("/:userID", (req, res) => {
  const userID = +req.params.userID;
  const sql = "select userID, username, phone, email  from Users where userID = ?";
  // log(userID);
  conn.query(sql, [userID], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    res.json(result[0]);
  });
 
});

// เเก้ไขชื่อ
router.put("/:userID", async (req, res) => {
    try {
      // Receive data 
      const userID = +req.params.userID;
      const profile = req.body;
  
      //GET original data from table by id
      let sql = "select * from Users where userID = ?";
      sql = mysql.format(sql, [userID]);
  
      //Query and Wait for result 
      const result = await queryAsync(sql);
      const jsonStr = JSON.stringify(result);
      const jsonObj = JSON.parse(jsonStr);
      const UsersOriginal = jsonObj[0];
  
      const updateprofile = { ...UsersOriginal, ...profile };
      sql =
        "update  `Users` set `username`=?, `phone`=?, `email`=? where `userID`=?";
  
      sql = mysql.format(sql, [
        updateprofile.username,
        updateprofile.phone,
        updateprofile.email,
        userID
      ]);
  
      conn.query(sql, (err, result) => {
        if (err) {
          console.error('Database query error:', err);
          return res.status(500).json({ error: 'Database query error' });
        }
  
        res.status(200).json({
          affected_row: result.affectedRows
        });
      });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'An error occurred' });
    }
    
  });


