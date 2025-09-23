import { LANGUAGE } from "./utils.js"

export function returnIndexFile(lang: LANGUAGE) {
    return `import app from "./app${lang != LANGUAGE.TYPESCRIPT ? '.js' : ""}";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(\`🚀 Server running on http://localhost:\${PORT}\`);
});`
}

export function returnAppFile(lang: LANGUAGE) {
    return `import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import router from "./routes${lang != LANGUAGE.TYPESCRIPT ? '.js' : ""}";

const app = express();

app.use(cors({origin: "*", credentials: true,}));

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
    extended: true,
    })
);

app.use("/api", router);
    
export default app;`
}

export function returnRouteData(lang: LANGUAGE, name: string) {
    if (lang === LANGUAGE.TYPESCRIPT) {
        return `import { type Request, type Response, Router } from "express";
import Controllers from "@/controllers/index";

export const ${name}Route = Router();

${name}Route.get('/${name}', (req: Request, res: Response) => void Controllers.${name}Controller(req, res));`
    }
    return `import { Router } from "express";
import Controllers from "./index.js";

export const ${name}Route = Router();

${name}Route.get('/${name}', (req, res) => void Controllers.${name}Controller(req, res));`
}

export function returnControllerData(lang: LANGUAGE, name: string) {
    if (lang === LANGUAGE.TYPESCRIPT) {
        return `import type { Request, Response } from "express";
import type { ControllerClass } from "@/controllers/index";

export async function ${name.charAt(0).toUpperCase()+name.slice(1)}Controller(this: ControllerClass, request:Request, response:Response) {
    return response.status(200).json({ message: "This is a sample route" });
}`
    }
    return `
export async function ${name.charAt(0).toUpperCase()+name.slice(1)}Controller(request, response) {
    return response.status(200).json({ message: "This is a sample route" });
}`
}