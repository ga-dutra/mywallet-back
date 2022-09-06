import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import joi from "joi";

dotenv.config();

// Server inicialization
const server = express();
server.use(cors());
server.use(express.json());

// Mongodb conection
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect().then(() => {
  db = mongoClient.db("mywallet_db");
});

// Joi schemas

//

server.listen(5000, () => console.log("Listening on port 5000"));
