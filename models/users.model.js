import joi from "joi";

const userSignUpSchema = joi.object({
  name: joi
    .string()
    .min(1)
    .required()
    .error(new Error("Por favor, digite um nome válido!")),
  email: joi
    .string()
    .email({ minDomainSegments: 2, tlds: { allow: ["com", "net"] } })
    .required()
    .error(new Error("O email digitado precisa ser válido!")),
  password: joi
    .string()
    .min(4)
    .required()
    .error(new Error("A senha deve ter pelo menos 4 caracteres!")),
  repeat_password: joi
    .valid(joi.ref("password"))
    .required()
    .error(new Error("A senha deve ser igual à anterior!")),
});

const userLoginSchema = joi.object({
  email: joi
    .string()
    .email({ minDomainSegments: 2, tlds: { allow: ["com", "net"] } })
    .required(),
  password: joi.string().min(4).required(),
});

export { userLoginSchema, userSignUpSchema }