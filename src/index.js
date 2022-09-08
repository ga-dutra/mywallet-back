import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
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

const cashflowSchema = joi.object({
  amount: joi.string().required(),
  flowType: joi.string().valid("inflow", "outflow").required(),
  description: joi.string().min(1).required(),
  date: joi.string().required(),
});

// Sign-up Route
server.post("/auth/sign-up", async (req, res) => {
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
    res.status(201).send({ message: "User created" });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Login Route
server.post("/auth/login", async (req, res) => {
  // Email and password

  const validation = userLoginSchema.validate(req.body, { abortEarly: false });
  if (validation.error) {
    const errors = validation.error.details.map((erro) => erro.message);
    return res.status(422).send(errors);
  }

  const { email, password } = req.body;
  try {
    const user = await db.collection("users").findOne({ email });
    console.log(user);
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = uuid();
      await db.collection("sessionsHistory").insertOne({
        userId: user._id,
        token,
      });
      await db.collection("currentSessions").insertOne({
        userId: user._id,
        token,
      });

      res.status(201).send({ token: token, name: user.name });
    } else {
      res.status(404).send({ error: "user not found!" });
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

server.delete("/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(422).send({ error: "Token is required!" });
  }

  try {
    const response = await db
      .collection("receitas")
      .deleteMany({ token: token });
    res.status(200).send(response);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Operation Routes

server.post("/cashflows", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(422).send({ error: "Token is required!" });
  }

  const validation = cashflowSchema.validate(req.body, { abortEarly: false });
  if (validation.error) {
    const errors = validation.error.details.map((erro) => erro.message);
    return res.status(422).send(errors);
  }

  const { amount, flowType, description, date } = req.body;

  try {
    const session = await db.collection("currentSessions").findOne({
      token,
    });

    if (!session) {
      res.status(404).send({ error: "Session not found!" });
    }

    const user = await db.collection("users").findOne({
      _id: session.userId,
    });

    await db.collection("cashflows").insertOne({
      userId: user._id,
      amount,
      flowType,
      description,
      date,
    });
    res.status(201).send({ message: "Cashflow created" });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

server.get("/cashflows", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    res.status(422).send({ error: "Token is required!" });
  }

  try {
    const session = await db.collection("currentSessions").findOne({
      token,
    });

    if (!session) {
      res.sendStatus(404);
    }

    const user = await db.collection("users").findOne({
      _id: session.userId,
    });

    const userCashFlows = await db
      .collection("cashflows")
      .find({ userId: user._id })
      .toArray();

    res.status(200).send(userCashFlows);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

server.delete("/cashflows/:id", async (req, res) => {
  const id = req.params.id;
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!id) {
    res.status(422).send({ error: "Id is required!" });
  }

  if (!token) {
    res.status(422).send({ error: "Token is required!" });
  }

  try {
    await db.collection("cashflows").deleteOne({ _id: new ObjectId(id) });
    res.status(200).send({ message: "Cashflow deleted" });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

server.listen(5000, () => console.log("Listening on port 5000"));
