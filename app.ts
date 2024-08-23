import express from "express";
import cors from "cors";
import { router as user } from "./api/user";

export const app = express();
// app.use("/", (req, res) => {
//   res.send("Hello World!!! ei");
// });
app.use(
  cors({
    origin: "*",
    // origin: "http://localhost:4200",
  })  
);
app.use("", user);
