import chalk from "chalk";
import { ProjectBuilder } from "./builder/index.js";

async function main() {
    const builder = new ProjectBuilder();
    await builder
        .init()
        .then(b => b.handleDependencies())
        .then(b => b.setupTypeScript())
        .then(b => b.setupEslint())
        .then(b => b.createSourceFiles())
        .then(b => b.updatePackageJson())
        .then(b => b.finalize());
}

main().catch((err) => console.error(chalk.red(err)));
