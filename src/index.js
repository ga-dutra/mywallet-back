import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import joi from "joi";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";

dotenv.config();

// Server inicialization
const server = express();
server.use(cors());
server.use(express.json());

// Mongodb connection
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect().then(() => {
  db = mongoClient.db("mywallet_db");
});

// Joi schemas
const userSignUpSchema = joi.object({
  name: joi.string().min(1).required(),
  email: joi
    .string()
    .email({ minDomainSegments: 2, tlds: { allow: ["com", "net"] } })
    .required(),
  password: joi.string().min(4).required(),
  repeat_password: joi.ref("password"),
});

const userLoginSchema = joi.object({
  email: joi
    .string()
    .email({ minDomainSegments: 2, tlds: { allow: ["com", "net"] } })
    .required(),
  password: joi.string().min(4).required(),
});

const cashflow = joi.object({
  amount: joi.string().required(),
  flowType: joi.string().valid("inflow", "outflow").required(),
  description: joi.string().min(1).required(),
});

// Sign-up Route
server.post("/sign-up", async (req, res) => {
  // Name, email, password and repeat_password

  const validation = userSignUpSchema.validate(req.body, { abortEarly: false });
  if (validation.error) {
    const errors = validation.error.details.map((erro) => erro.message);
    return res.status(422).send(errors);
  }
  if (!req.body.repeat_password) {
    return res.status(422).send({ error: "repeat_password is required" });
  }

  const user = req.body;
  delete user.repeat_password;

  const passwordHash = bcrypt.hashSync(user.password, 10);

  try {
    const existingUser = await db
      .collection("users")
      .findOne({ email: user.email });
    if (existingUser) {
      return res.status(409).send({ error: "email is already in use!" });
    }

    await db.collection("users").insertOne({ ...user, password: passwordHash });
    res.status(201).send("Ok");
  } catch (error) {
    console.error(error);
  }
});

// Login Route
server.post("/login", async (req, res) => {
  // Email and password

  const validation = userLoginSchema.validate(req.body, { abortEarly: false });
  if (validation.error) {
    const errors = validation.error.details.map((erro) => erro.message);
    return res.status(422).send(errors);
  }

  const { email, password } = req.body;
  try {
    const user = await db.collection("users").findOne({ email });

    if (user && bcrypt.compareSync(password, user.password)) {
      const token = uuid();
      await db.collection("sessions").insertOne({
        userId: user._id,
        token,
      });

      res.status(201).send(token);
    } else {
      res.status(404).send({ error: "user not found!" });
    }
  } catch (error) {
    console.error(error);
  }
});

// Operation Routes

server.listen(5000, () => console.log("Listening on port 5000"));
