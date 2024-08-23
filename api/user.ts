import express from "express";
import { conn } from "../dbconnect";
import {Users} from "../model/users_get_res";



export const router = express.Router();


router.get("/Users", (req, res) => {
    conn.query('select * from Users', (err, result, fields) => {
      res.json(result);
    });
  });
 
  
// Login
router.post("/login", (req, res) => {
    const { phone } = req.body;
    const {password} = req.body;
  
    const sql = "SELECT * FROM Users WHERE phone = ? AND password = ?";
  
    conn.query(sql, [phone, password], (err, result, fields) => {
      if (err) {
        res.status(500).json({ message: "An error occurred" });
        return;
      }
  
      if (result.length > 0) {
        const Users = result[0];
        res.json({
          message: 'Match found',
          Users
        });
      } else {
        res.json({ message: 'No match found' });
      }
    });
  });