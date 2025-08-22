import fs from "fs";
import { getFileExtension } from "./utils.js";
import { returnAppFile, returnControllerData, returnIndexFile, returnRouteData } from "./data.js";

export class WriteFiles {
    lang;
    features;

    constructor(answers) {
        this.lang = answers.language;
        this.features = answers.features;
    }

    writeGitignore() {
      fs.writeFileSync(".gitignore", 
        `node_modules
dist
bin

*.local`
      );
    }

    writeAppFile() {
        fs.writeFileSync("src/app" + getFileExtension(this.lang),
            returnAppFile(this.lang),
        );
    }

    writeIndexFile() {
        fs.writeFileSync(
            "src/index" + (getFileExtension(this.lang)),
            returnIndexFile(this.lang),
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
import { pingRoute } from './ping${this.lang != "TypeScript" ? '.js' : ""}';
import { sampleRoute } from './sample${this.lang != "TypeScript" ? '.js' : ""}';

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
            content = `import { SampleController } from "./sample${this.lang != "TypeScript" ? '.js' : ""}";

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
        if (!this.features?.includes("zod")) return;
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
