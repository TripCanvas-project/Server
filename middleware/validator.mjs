import { validationResult } from "express-validator";

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        // validate 통과
        return next();
    }
    return res
        .status(400)
        .json({ message: errors.array()[0].msg /* .withMessage content */ });
};
