import chalk from 'chalk';
import {
  FEATURES,
  InitialDependencies,
  InitialDevDependencies,
  PromptAnswers,
  prompts as defaultPrompts,
} from '../prompts.js';
import {
  detectPackageManager,
  getLatestVersion,
  InitCommands,
  InstallCommands,
  LANGUAGE,
  PACKAGEMANAGER,
  returnDirs,
} from '../utils.js';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs';
import { WriteFiles } from '../write.js';
import ora from 'ora';
import { execSync } from 'child_process';

/**
 * @class SafeBuilder
 * @abstract
 * @description
 * Base builder class that provides safe execution of async/sync steps,
 * automatic rollback on error or interruption (SIGINT/SIGTERM),
 * and tracking of rollback steps.
 */
export abstract class SafeBuilder {
  protected projectPath!: string;
  private steps: (() => void)[] = [];
  private rolledBack = false;
  private setupSignals = false;

  /**
   * Track a rollback step for cleanup in case of error or interruption.
   * @param step - Function to execute during rollback
   */
  protected trackStep(step: () => void) {
    this.steps.push(step);
  }

  /**
   * Perform rollback by executing all tracked steps in reverse order.
   */
  async rollback() {
    if (this.rolledBack) return;
    console.log(chalk.yellow('\n⚠️  Rolling back...'));
    for (const step of this.steps.reverse()) {
      try {
        step();
      } catch (err) {
        console.error(chalk.red('Rollback step failed: ', err));
      }
    }
    this.rolledBack = true;
  }

  /**
   * Safely run an async function with rollback on error.
   * @param fn - Async function to execute
   */
  async safe<T>(fn: () => Promise<T>) {
    this.setupSignalHandlers();
    try {
      return await fn();
    } catch (err) {
      await this.rollback();
      throw err;
    }
  }

  /**
   * Safely run a synchronous function with rollback on error.
   * @param fn - Synchronous function to execute
   */
  safeSync(fn: () => void) {
    this.setupSignalHandlers();
    try {
      fn();
    } catch (err) {
      this.rollback();
      throw err;
    }
  }

  /**
   * Remove the project directory safely.
   */
  protected removeProjectDir() {
    if (this.projectPath && fs.existsSync(this.projectPath)) {
      fs.rmSync(this.projectPath, { recursive: true, force: true });
      console.log(chalk.yellow(`Removed directory: ${this.projectPath}`));
    }
  }

  /**
   * Setup handlers for SIGINT/SIGTERM to trigger rollback.
   */
  private setupSignalHandlers() {
    if (this.setupSignals) return;
    this.setupSignals = true;
    const handle = async () => {
      console.log(chalk.yellow('\n🚨 Interrupted! Cleaning up...'));
      await this.rollback();
      process.exit(1);
    };
    process.on('SIGINT', handle);
    process.on('SIGTERM', handle);
  }
}

/**
 * @class BuilderHelper
 * @abstract
 * @extends SafeBuilder
 * @description
 * Helper class providing prompts handling, custom step execution, and dependency management.
 * All custom builders or extended builders should use this as a base.
 */
export abstract class BuilderHelper extends SafeBuilder {
  protected prompts: typeof defaultPrompts;
  protected customSteps: (() => Promise<void> | void)[] = [];
  protected answers!: PromptAnswers;
  protected writeFiles!: WriteFiles;
  protected dependencies: string[];
  protected devDependencies: string[];

  /**
   * @param prompts - Optional prompts array. Defaults to defaultPrompts.
   */
  constructor(prompts?: typeof defaultPrompts) {
    super();
    this.prompts = prompts ?? defaultPrompts;
    this.dependencies = InitialDependencies;
    this.devDependencies = InitialDevDependencies;
  }

  /**
   * Collect user prompts safely.
   * @returns this - for method chaining
   */
  async collectPrompts() {
    await this.safe(async () => {
      this.answers = await inquirer.prompt(this.prompts);
      this.writeFiles = new WriteFiles(this.answers);
    });
    return this;
  }

  /**
   * Add a custom step to run after prompts or default builder steps.
   * @param step - Function that returns void or Promise<void>
   * @returns this - for method chaining
   */
  addStep(step: () => Promise<void> | void) {
    this.customSteps.push(step);
    return this;
  }

  /**
   * Run all registered custom steps safely.
   * @returns this - for method chaining
   */
  async runCustomSteps() {
    for (const step of this.customSteps) {
      await this.safe(async () => {
        await step();
      });
    }
    return this;
  }

  /**
   * Run a shell command safely.
   * @param cmd - Command string to execute
   * @returns this - for chaining
   */
  async runCommand(cmd: string) {
    await this.safe(async () => {
      execSync(cmd);
    });
    return this;
  }

  /**
   * Safely create a file, ensuring its directory exists.
   * @param filePath - Path to file
   * @param content - File content
   * @returns this - for chaining
   */
  createFile(filePath: string, content: string) {
    this.safeSync(() => {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, content);
    });
    return this;
  }

  /**
   * Add dependencies to package.json
   * @param deps - Dependency names
   * @returns this - for chaining
   */
  addDependencies(...deps: string[]) {
    this.dependencies.push(...deps);
    return this;
  }

  /**
   * Add devDependencies to package.json
   * @param deps - DevDependency names
   * @returns this - for chaining
   */
  addDevDependencies(...deps: string[]) {
    this.devDependencies.push(...deps);
    return this;
  }
}

/**
 * @class ProjectBuilder
 * @extends BuilderHelper
 * @description
 * Default vanilla builder for Express projects.
 * Supports method chaining for standard project steps:
 * `init()`, `collectPrompts()`, `handleDependencies()`,
 * `setupTypeScript()`, `setupEslint()`, `createSourceFiles()`,
 * `updatePackageJson()`, `finalize()`.
 *
 * Can be extended for custom workflows using BuilderHelper methods:
 * `addStep()`, `runCustomSteps()`, `createFile()`, etc.
 */
export class ProjectBuilder extends BuilderHelper {
  private projectName!: string;
  private packageManager: PACKAGEMANAGER;

  constructor() {
    super();
    this.packageManager = detectPackageManager();
  }

  /**
   * Initialize project: set name, create folder, init package.json
   */
  async init() {
    console.log(chalk.green.bold('\n🚀 Create Express App\n'));
    await this.safe(async () => {
      this.projectName = process.argv[2] || (await this.askProjectName());
      this.projectPath = path.join(process.cwd(), this.projectName);
    });
    await this.safe(async () => {
      await this.handleExistingDir();
      this.trackStep(() => this.removeProjectDir());
    });
    await this.safe(async () => this.initPackageJson());
    return this;
  }

  private async askProjectName(): Promise<string> {
    const { inputName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'inputName',
        message: 'Project name:',
        default: 'my-express-app',
      },
    ]);
    return inputName;
  }

  private async handleExistingDir() {
    if (fs.existsSync(this.projectPath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Directory "${this.projectName}" already exists. Remove and continue?`,
          default: false,
        },
      ]);
      if (!overwrite) {
        console.log(chalk.red('❌ Aborting, directory already exists.'));
        process.exit(1);
      }
      this.trackStep(() => this.removeProjectDir());
      this.safeSync(() => fs.rmSync(this.projectPath, { recursive: true, force: true }));
    }
    this.trackStep(() => this.removeProjectDir());
    this.safeSync(() => fs.mkdirSync(this.projectPath));
    process.chdir(this.projectPath);
  }

  private initPackageJson() {
    this.trackStep(() => fs.rmSync('package.json', { force: true }));
    this.safeSync(() => this.runCommand(InitCommands[this.packageManager]));
    return this;
  }

  /**
   * Map selected features to dependencies/devDependencies
   */
  handleDependencies() {
    this.answers.features.map((feature: FEATURES) => {
      switch (feature) {
        case FEATURES.ESLINT:
          this.addDevDependencies(
            'eslint',
            'prettier',
            '@typescript-eslint/parser',
            '@typescript-eslint/eslint-plugin',
          );
          break;
        case FEATURES.JEST:
          this.addDevDependencies('jest', '@types/jest', 'ts-jest');
          break;
        default:
          this.addDependencies(feature);
          break;
      }
    });
    return this;
  }

  /**
   * Setup TypeScript if selected in prompts
   */
  setupTypeScript() {
    if (this.answers.language === LANGUAGE.TYPESCRIPT) {
      this.devDependencies.push(
        'typescript',
        '@types/express',
        '@types/cors',
        '@types/body-parser',
        'tsc-alias',
      );
      this.safeSync(() => this.writeFiles.writeTsConfig());
    }
    return this;
  }

  /**
   * Setup ESLint files if selected in prompts
   */
  setupEslint() {
    if (this.answers.features.includes(FEATURES.ESLINT)) {
      this.safeSync(() => this.writeFiles.writeEslintFiles());
    }
    return this;
  }

  /**
   * Create project source directories and files
   */
  createSourceFiles() {
    this.safeSync(() => {
      fs.mkdirSync('src');
      const allDirs = returnDirs(this.answers.language);
      allDirs.forEach((dir) => fs.mkdirSync(`src/${dir}`));
    });
    this.safeSync(() => {
      this.writeFiles.writeGitignore();
      this.writeFiles.writeAppFile();
      this.writeFiles.writeIndexFile();
      this.writeFiles.writeRoutesFile();
      this.writeFiles.writeControllersFile();
      this.writeFiles.writeSchemaFile();
    });
    return this;
  }

  /**
   * Update package.json with dependencies, devDependencies, and scripts
   */
  async updatePackageJson() {
    await this.safe(async () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      if (this.answers.language !== LANGUAGE.TYPESCRIPT) {
        pkg.type = 'module';
      }
      pkg.dependencies = pkg.dependencies || {};
      pkg.devDependencies = pkg.devDependencies || {};
      pkg.scripts = {
        start:
          this.answers.language === LANGUAGE.TYPESCRIPT
            ? 'node dist/index.js'
            : 'node src/index.js',
        lint: this.answers.features.includes(FEATURES.ESLINT)
          ? 'eslint . --ext .ts,.js'
          : "echo 'no lint'",
        test: this.answers.features.includes(FEATURES.JEST) ? 'jest' : "echo 'no tests'",
      };
      if (this.answers.language === LANGUAGE.TYPESCRIPT) {
        pkg.scripts = {
          build: 'tsc && tsc-alias',
          ...pkg.scripts,
        };
      }

      const spinner = ora('Setting things up...').start();

      await Promise.all(
        this.dependencies.map(async (dep) => {
          pkg.dependencies[dep] = `^${await getLatestVersion(dep)}`;
        }),
      );
      await Promise.all(
        this.devDependencies.map(async (dep) => {
          pkg.devDependencies[dep] = `^${await getLatestVersion(dep)}`;
        }),
      );

      spinner.succeed('Success');
      this.createFile('package.json', JSON.stringify(pkg, null, 2));
    });
    return this;
  }

  /**
   * Finalize project setup: print next steps to console
   */
  finalize() {
    console.log(chalk.green.bold('\n✅ Happy Hacking!'));
    console.log(chalk.cyan('\nNext steps:'));
    console.log(`  cd ${this.projectName}`);
    console.log(`  ${InstallCommands[this.packageManager]}`);
    if (this.answers?.language === LANGUAGE.TYPESCRIPT) {
      console.log(`  ${this.packageManager} run build`);
    }
    console.log(`  ${this.packageManager} run start`);
  }
}
