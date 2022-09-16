import joi from "joi";

const cashflowSchema = joi.object({
  amount: joi.string().required(),
  flowType: joi.string().valid("inflow", "outflow").required(),
  description: joi.string().min(1).required(),
  date: joi.string().required(),
});

export { cashflowSchema }