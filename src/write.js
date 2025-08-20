import fs from "fs";
import { getFileExtension } from "./utils.js";
import { returnAppFile, returnControllerData, returnIndexFile, returnRouteData } from "./data.js";

export class WriteFiles {
    lang;

    constructor(lang) {
        this.lang = lang;
    }

    writeAppFile() {
        fs.writeFileSync("src/app" + getFileExtension(this.lang),
            returnAppFile(),
        );
    }

    writeIndexFile() {
        fs.writeFileSync(
            "src/index" + (getFileExtension(this.lang)),
            returnIndexFile(),
        );
    }

    writePingRoute() {
        let filepath = "src/routes/" + "ping" + getFileExtension(this.lang);
        fs.writeFileSync(filepath, returnRouteData(this.lang, "ping"))
    }

    writeSampleRoute() {
        let filepath = "src/routes/" + "sample" + getFileExtension(this.lang);
        fs.writeFileSync(filepath, returnRouteData(this.lang, "sample"))
    }

    writeRoutesFile() {
        let filepath = "src/routes/" + "index" + getFileExtension(this.lang);
        this.writePingRoute();
        this.writeSampleRoute();
        fs.writeFileSync(filepath,
            `import { Router } from 'express';
import { pingRoute } from './ping';
import { sampleRoute } from './sample';

const router = Router();

router.use(pingRoute);
router.use(sampleRoute);

export default router;
`
        )
    }

    writeSampleController() {
        let filepath = "src/controllers/" + "sample" + getFileExtension(this.lang);
        fs.writeFileSync(filepath, returnControllerData(this.lang, "sample"));
    }

    writeControllersFile() {
        let filepath = "src/controllers/" + "index" + getFileExtension(this.lang);
        this.writeSampleController();
        let content;
        if (this.lang === "TypeScript") {
            content = `import { Request, Response } from "express";
import { SampleController } from "./sample";

export class ControllerClass {
    constructor() {
        // do something
    }

    async pingController(req: Request, res: Response) {
        return res.status(201).json({ message: "Server running" });
    }

    sampleController = SampleController;
}

const Controllers = new ControllerClass();
export default Controllers;\n`
        } else {
            content = `import { SampleController } from "./sample";

export class ControllerClass {
    constructor() {
        // do something
    }

    async pingController(req, res) {
        return res.status(201).json({ message: "Server running" });
    }

    sampleController = SampleController;
}

const Controllers = new ControllerClass();
export default Controllers;\n`
        }
        fs.writeFileSync(filepath, content);
    }

    writeSchemaFile() {
        let filepath = "src/schemas/" + "index" + getFileExtension(this.lang);
        let content = `import { z } from "zod";

export const SampleSchema = z.object({
  name: z.string(),
  age: z.number().min(18),
});
${this.lang === "TypeScript" && "\nexport type ISample = z.infer<typeof SampleSchema>\n"};
`;
        fs.writeFileSync(filepath, content.trim() + "\n");
    }
}