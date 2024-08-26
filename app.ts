import express from "express";
import cors from "cors";
import { router as user } from "./api/user";
import { router as wallet } from "./api/wallet";
import { router as edituser } from "./api/edituser";
import bodyParser from "body-parser";

export const app = express();

app.use(express.json());
app.use(bodyParser.text());
app.use(bodyParser.json());
// app.use("/", (req, res) => {
//   res.send("Hello World!!! ei");
// });
app.use(
  cors({
    // origin: "*",
    origin: "http://localhost:4200",
  })  
);
app.use("", user);
app.use("/w", wallet);
app.use("/edit", edituser);



