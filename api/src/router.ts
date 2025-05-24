import express, { IRouter } from "express";
import { CompareInput } from "./models";
import { compare, lookups } from "./compare";

export const registerRoutes = (app: IRouter) => {

    const router = express.Router();

    router.get(`/lookups`, async (req, res) => {
        return res.status(200).json(await lookups());
    });
    
    router.post(`/compare`, async (req, res) => {
        try {
            const params: CompareInput = req.body;
            return res.status(200).json(await compare(params));
        }
        catch (e) {
            console.error(e);
            return res.status(500).send(e);
        }

    });

    app.use('/api', router);
}