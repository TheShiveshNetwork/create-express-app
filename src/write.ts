import fs from 'fs';
import { getFileExtension, LANGUAGE, FEATURES } from './utils.js';
import {
  returnAppFile,
  returnControllerData,
  returnIndexFile,
  returnRouteData,
  returnSchemaFile,
} from './data.js';
import { PromptAnswers } from './prompts.js';

export class WriteFiles {
  private language: LANGUAGE;
  private features: FEATURES[];

  constructor(answers: PromptAnswers) {
    this.language = answers.language;
    this.features = answers.features;
  }

  writeGitignore() {
    fs.writeFileSync(
      '.gitignore',
      `node_modules
dist
bin

*.local`,
    );
  }

  writeEslintFiles() {
    fs.writeFileSync(
      '.eslintrc.js',
      `module.exports = {
  parser: "${this.language === LANGUAGE.TYPESCRIPT ? '@typescript-eslint/parser' : 'espree'}",
  extends: [
    "eslint:recommended"${this.language === LANGUAGE.TYPESCRIPT ? ', "plugin:@typescript-eslint/recommended"' : ''}
  ],
  rules: {}
};`,
    );
    fs.writeFileSync('.prettierrc', JSON.stringify({ semi: true, trailingComma: 'all' }, null, 2));
  }

  writeTsConfig() {
    fs.writeFileSync(
      'tsconfig.json',
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            outDir: 'dist',
            paths: {
              '@/*': ['./src/*'],
            },
          },
          include: ['src'],
        },
        null,
        2,
      ),
    );
  }

  writeAppFile() {
    fs.writeFileSync('src/app' + getFileExtension(this.language), returnAppFile(this.language));
  }

  writeIndexFile() {
    fs.writeFileSync('src/index' + getFileExtension(this.language), returnIndexFile(this.language));
  }

  writePingRoute() {
    const filepath = 'src/routes/' + 'ping' + getFileExtension(this.language);
    fs.writeFileSync(filepath, returnRouteData(this.language, 'ping'));
  }

  writeSampleRoute() {
    const filepath = 'src/routes/' + 'sample' + getFileExtension(this.language);
    fs.writeFileSync(filepath, returnRouteData(this.language, 'sample'));
  }

  writeRoutesFile() {
    const filepath = 'src/routes/' + 'index' + getFileExtension(this.language);
    this.writePingRoute();
    this.writeSampleRoute();
    fs.writeFileSync(
      filepath,
      `import { Router } from 'express';
import { pingRoute } from './ping${this.language != LANGUAGE.TYPESCRIPT ? '.js' : ''}';
import { sampleRoute } from './sample${this.language != LANGUAGE.TYPESCRIPT ? '.js' : ''}';

const router = Router();

router.use(pingRoute);
router.use(sampleRoute);

export default router;
`,
    );
  }

  writeSampleController() {
    const filepath = 'src/controllers/' + 'sample' + getFileExtension(this.language);
    fs.writeFileSync(filepath, returnControllerData(this.language, 'sample'));
  }

  writeControllersFile() {
    const filepath = 'src/controllers/' + 'index' + getFileExtension(this.language);
    this.writeSampleController();
    let content;
    if (this.language === LANGUAGE.TYPESCRIPT) {
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
export default Controllers;\n`;
    } else {
      content = `import { SampleController } from "./sample.js";

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
export default Controllers;\n`;
    }
    fs.writeFileSync(filepath, content);
  }

  writeSchemaFile() {
    if (!this.features?.includes(FEATURES.ZOD)) return;
    const filepath = 'src/schemas/' + 'index' + getFileExtension(this.language);
    const content = returnSchemaFile(this.language, 'SampleSchema');
    fs.writeFileSync(filepath, content.trim() + '\n');
  }
}
