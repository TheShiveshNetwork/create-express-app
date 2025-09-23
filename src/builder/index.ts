import chalk from "chalk";
import { FEATURES, InitialDependencies, InitialDevDependencies, PromptAnswers, prompts } from "../prompts.js";
import { detectPackageManager, getLatestVersion, InitCommands, InstallCommands, LANGUAGE, PACKAGEMANAGER, returnDirs, runInstallScript } from "../utils.js";
import inquirer from "inquirer";
import path from "path";
import fs from "fs";
import { WriteFiles } from "../write.js";
import ora from "ora";
import { execSync } from "child_process";

export class ProjectBuilder {
    private projectName!: string;
    private projectPath!: string;
    private packageManager: PACKAGEMANAGER;
    private dependencies: string[] = InitialDependencies;
    private devDependencies: string[] = InitialDevDependencies;
    private answers: PromptAnswers | null = null;
    private writeFiles!: WriteFiles;

    constructor() {
        this.packageManager = detectPackageManager();
        this.dependencies = [];
        this.devDependencies = [];
    }

    async init() {
        console.log(chalk.green.bold("\n🚀 Create Express App\n"));
        this.projectName = process.argv[2] || (await this.askProjectName());
        this.projectPath = path.join(process.cwd(), this.projectName);
        await this.handleExistingDir();
        this.initPackageJson();
        await this.collectPrompts();
        if (!this.answers) throw new Error("Could not collect prompts");
        this.writeFiles = new WriteFiles(this.answers);
        if (!this.writeFiles) throw new Error("Error instantiating file writing module");
        return this;
    }

    private async askProjectName(): Promise<string> {
        const { inputName } = await inquirer.prompt([
            {
                type: "input",
                name: "inputName",
                message: "Project name:",
                default: "my-express-app",
            },
        ]);
        return inputName;
    }

    private async handleExistingDir() {
        if (fs.existsSync(this.projectPath)) {
            const { overwrite } = await inquirer.prompt([
                {
                    type: "confirm",
                    name: "overwrite",
                    message: `Directory "${this.projectName}" already exists. Remove and continue?`,
                    default: false,
                },
            ]);
            if (!overwrite) {
                console.log(chalk.red("❌ Aborting, directory already exists."));
                process.exit(1);
            }
            fs.rmSync(this.projectPath, { recursive: true, force: true });
        }
        fs.mkdirSync(this.projectPath);
        process.chdir(this.projectPath);
    }

    private initPackageJson() {
        execSync(InitCommands[this.packageManager]);
        return this;
    }

    private async collectPrompts() {
        this.answers = await inquirer.prompt(prompts);
        return this;
    }

    handleDependencies() {
        this.answers?.features.map((feature: FEATURES) => {
            switch (feature) {
                case FEATURES.ESLINT:
                    this.devDependencies.push(
                        "eslint",
                        "prettier",
                        "@typescript-eslint/parser",
                        "@typescript-eslint/eslint-plugin"
                    );
                    break;
                case FEATURES.JEST:
                    this.devDependencies.push("jest", "@types/jest", "ts-jest");
                    break;
                default:
                    this.dependencies.push(feature);
                    break;
            }
        });
        return this;
    }

    setupTypeScript() {
        if (this.answers?.language === LANGUAGE.TYPESCRIPT) {
            this.devDependencies.push(
                "typescript",
                "@types/express",
                "@types/cors",
                "@types/body-parser",
                "tsc-alias"
            );
            this.writeFiles.writeTsConfig();
        }
        return this;
    }

    setupEslint() {
        if (this.answers?.features.includes(FEATURES.ESLINT)) {
            this.writeFiles.writeEslintFiles();
        }
        return this;
    }

    createSourceFiles() {
        if (this.answers) {
            fs.mkdirSync("src");
            const allDirs = returnDirs(this.answers.language);
            allDirs.map(dir =>
                fs.mkdirSync(`src/${dir}`)
            );
            this.writeFiles.writeGitignore();
            this.writeFiles.writeAppFile();
            this.writeFiles.writeIndexFile();
            this.writeFiles.writeRoutesFile();
            this.writeFiles.writeControllersFile();
            this.writeFiles.writeSchemaFile();
        }
        return this;
    }

    async updatePackageJson() {
        let pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
        if (this.answers) {
            if (this.answers.language != LANGUAGE.TYPESCRIPT) {
                pkg.type = "module";
            }
            pkg.dependencies = pkg.dependencies || {};
            pkg.devDependencies = pkg.devDependencies || {};
            pkg.scripts = {
                start:
                    this.answers.language === LANGUAGE.TYPESCRIPT
                        ? "node dist/index.js"
                        : "node src/index.js",
                lint: this.answers.features.includes(FEATURES.ESLINT)
                    ? "eslint . --ext .ts,.js"
                    : "echo 'no lint'",
                test: this.answers.features.includes(FEATURES.JEST)
                    ? "jest"
                    : "echo 'no tests'",
            };
            if (this.answers.language === LANGUAGE.TYPESCRIPT) {
                pkg.scripts = {
                    build: "tsc && tsc-alias",
                    ...pkg.scripts,
                };
            }
            const spinner = ora(`Setting things up...`).start();
            await Promise.all(
                this.dependencies.map(async dep => {
                    pkg.dependencies[dep] = `^${await getLatestVersion(dep)}`;
                })
            );
            await Promise.all(
                this.devDependencies.map(async dep => {
                    pkg.devDependencies[dep] = `^${await getLatestVersion(dep)}`;
                })
            );
            spinner.succeed("Success");
            fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
        }
        return this;
    }

    finalize() {
        console.log(chalk.green.bold(`\n✅ Happy Hacking!`));
        console.log(chalk.cyan(`\nNext steps:`));
        console.log(`  cd ${this.projectName}`);
        console.log(`  ${InstallCommands[this.packageManager]}`);
        if (this.answers?.language === LANGUAGE.TYPESCRIPT) {
            console.log(`  ${this.packageManager} run build`);
        }
        console.log(`  ${this.packageManager} run start`);
    }
}
