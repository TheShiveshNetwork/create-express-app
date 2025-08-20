import { execSync } from "child_process";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import ora from "ora";

import { prompts } from "./prompts.js";
import { runInstallScript, detectPackageManager, getFileExtension, returnDirs, getLatestVersion, cleanup } from "./utils.js";
import { WriteFiles } from "./write.js";

async function main() {
    console.log(chalk.green.bold("\n🚀 Create Express App\n"));
    let projectName = process.argv[2];
    let dependencies = ["express", "cors", "body-parser", "dotenv"];
    let devDependencies = [];

    const packageManager = detectPackageManager();
    const installScript = runInstallScript();

    if (!projectName) {
        const { inputName } = await inquirer.prompt([
            {
                type: "input",
                name: "inputName",
                message: "Project name:",
                default: "my-express-app",
            },
        ]);
        projectName = inputName;
    }

    let projectPath = path.join(process.cwd(), projectName);
    if (fs.existsSync(projectPath)) {
        const { overwrite } = await inquirer.prompt([
            {
                type: "confirm",
                name: "overwrite",
                message: `Directory "${projectName}" already exists. Remove and continue?`,
                default: false,
            },
        ]);
        if (!overwrite) {
            console.log(chalk.red("❌ Aborting, directory already exists."));
            process.exit(1);
        }
        fs.rmSync(projectPath, { recursive: true, force: true });
    }

    fs.mkdirSync(projectPath);
    process.chdir(projectPath);

    execSync(`${packageManager} init -y`, { stdio: "ignore" });

    const answers = await inquirer.prompt(prompts);

    // handle the dependencies 
    if (answers.features.length > 0) {
        answers.features.map(feature => {
            switch (feature) {
                case "eslint":
                    devDependencies.push(
                        "eslint",
                        "prettier",
                        "@typescript-eslint/parser",
                        "@typescript-eslint/eslint-plugin"
                    )
                    break;

                case "jest":
                    devDependencies.push("jest", "@types/jest", "ts-jest");
                    break;

                default:
                    dependencies.push(feature);
                    break;
            }
        })
    }

    if (answers.language === "TypeScript") {
        devDependencies.push("typescript", "@types/express", "@types/cors", "@types/body-parser", "tsc-alias");
        fs.writeFileSync(
            "tsconfig.json",
            JSON.stringify(
                {
                    compilerOptions: {
                        target: "ES2020",
                        module: "commonjs",
                        strict: true,
                        esModuleInterop: true,
                        skipLibCheck: true,
                        forceConsistentCasingInFileNames: true,
                        outDir: "dist",
                        paths: {
                            "@/*": ["./src/*"]
                        },
                    },
                    include: ["src"],
                },
                null,
                2
            )
        );
    }

    if (answers.features.includes("eslint")) {
        fs.writeFileSync(
            ".eslintrc.js",
            `module.exports = {
    parser: "${answers.language === "TypeScript" ? "@typescript-eslint/parser" : "espree"}",
    extends: [
    "eslint:recommended"${answers.language === "TypeScript" ? ', "plugin:@typescript-eslint/recommended"' : ""
            }
    ],
    rules: {}
};`,
        );
        fs.writeFileSync(".prettierrc", JSON.stringify({ semi: true, trailingComma: "all" }, null, 2));
    }

    // src folder + boilerplate
    fs.mkdirSync("src");
    const allDirs = returnDirs();
    allDirs.map(dir =>
        fs.mkdirSync(`src/${dir}`)
    );

    // write all the files
    let write = new WriteFiles(answers);
    write.writeAppFile();
    write.writeIndexFile();
    write.writeRoutesFile();
    write.writeControllersFile();
    write.writeSchemaFile();

    // Update package.json 
    let pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    if (answers.language != "TypeScript") {
        pkg.type = "module";
    }
    pkg.dependencies = pkg.dependencies || {};
    pkg.devDependencies = pkg.devDependencies || {};
    pkg.scripts = {
        start: answers.language === "TypeScript" ? "node dist/index.js" : "node src/index.js",
        lint: answers.features.includes("eslint") ? "eslint . --ext .ts,.js" : "echo 'no lint'",
        test: answers.features.includes("jest") ? "jest" : "echo 'no tests'",
    };

    if (answers.language === "TypeScript") {
        pkg.scripts = {
            build: "tsc && tsc-alias",
            ...pkg.scripts,
        }
    }

    const spinner = ora(`Setting things up...`).start();
    for (const dep of dependencies) {
        pkg.dependencies[dep] = `^${getLatestVersion(dep)}`;
    }
    for (const dep of devDependencies) {
        pkg.devDependencies[dep] = `^${getLatestVersion(dep)}`;
    }
    spinner.succeed("Success");

    fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));

    console.log(chalk.green.bold(`\n✅ Happy Hacking!`));
    console.log(chalk.cyan(`\nNext steps:`));
    console.log(`  cd ${projectName}`);
    console.log(`  ${installScript}`);
    if (answers.language === "TypeScript")
        console.log(`  ${packageManager} run build`);
    console.log(`  ${packageManager} run start`);
}

main()
    .catch((err) => console.error(chalk.red(err)));