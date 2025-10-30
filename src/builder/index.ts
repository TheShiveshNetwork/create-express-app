import chalk from 'chalk';
import {
  IPromptOrConfig,
  InitialDependencies,
  InitialDevDependencies,
  PromptAnswers,
  prompts as defaultPrompts,
} from '../prompts.js';
import {
  detectPackageManager,
  execAsync,
  FEATURES,
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
  private steps: (() => Promise<void>)[] = [];
  private rolledBack = false;
  private setupSignals = false;

  /**
   * Track a rollback step for cleanup in case of error or interruption.
   * @param step - Function to execute during rollback
   */
  protected trackStep(step: () => void | Promise<void>) {
    this.steps.push(async () => step());
  }

  /**
   * Perform rollback by executing all tracked steps in reverse order.
   */
  async rollback() {
    if (this.rolledBack) return;
    if (this.projectPath && process.cwd().startsWith(this.projectPath)) {
      process.chdir(process.cwd());
    }
    console.log(chalk.yellow('\n⚠️ Rolling back...'));
    for (const step of this.steps.reverse()) {
      try {
        await step();
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
  protected promptOrConfig!: PromptAnswers;
  protected dependencies: string[];
  protected devDependencies: string[];
  protected config?: Partial<PromptAnswers>;
  protected projectBasePath?: string;

  constructor(promptOrConfig?: IPromptOrConfig) {
    super();
    if (this.isPrompts(promptOrConfig)) {
      this.prompts = promptOrConfig;
    } else if (this.isConfig(promptOrConfig)) {
      this.config = promptOrConfig;
      this.prompts = defaultPrompts;
    } else {
      this.prompts = defaultPrompts;
    }
    this.dependencies = [...InitialDependencies];
    this.devDependencies = [...InitialDevDependencies];
    if (promptOrConfig && !Array.isArray(promptOrConfig)) {
      this.promptOrConfig = {
        ...this.extractPromptDefaults(this.prompts),
        ...promptOrConfig,
      } as PromptAnswers;
    }
  }

  private isPrompts(
    value: typeof defaultPrompts | Partial<PromptAnswers> | undefined,
  ): value is typeof defaultPrompts {
    return Array.isArray(value);
  }

  private isConfig(
    value: typeof defaultPrompts | Partial<PromptAnswers> | undefined,
  ): value is Partial<PromptAnswers> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Extracts `default` values from the prompts array so we can merge them
   * with a user-supplied partial config. If a default is a function, we call
   * it with the currently-collected defaults (best-effort).
   */
  private extractPromptDefaults(prompts: typeof defaultPrompts): Partial<PromptAnswers> {
    const defaults: Partial<PromptAnswers> = {};
    for (const q of prompts) {
      if (!q?.name) continue;
      let def: unknown = (q as { default?: unknown }).default;
      if (typeof def === 'function') {
        try {
          def = def(defaults);
        } catch {
          def = undefined;
        }
      }
      switch (q.name) {
        case 'language':
          if (def !== undefined && Object.values(LANGUAGE).includes(def as LANGUAGE)) {
            defaults.language = def as LANGUAGE;
          }
          break;
        case 'features':
          if (def !== undefined && Array.isArray(def)) {
            defaults.features = def as FEATURES[];
          }
          break;
      }
    }
    return defaults;
  }

  /**
   * Set the base path where project folder will be created.
   */
  setProjectBasePath(basePath: string) {
    this.projectBasePath = path.resolve(basePath);
    return this;
  }

  /**
   * Optionally set config after construction. Config always takes precedence
   * over prompts when present.
   */
  setConfig(config: Partial<PromptAnswers>) {
    this.config = config;
    return this;
  }

  /**
   * Collect user prompts safely, or use provided config.
   * Priority: config (if present) -> prompts (interactive)
   * @returns this - for method chaining
   */
  async collectPrompts() {
    await this.safe(async () => {
      if (this.config) {
        const defaults = this.extractPromptDefaults(this.prompts);
        this.promptOrConfig = { ...defaults, ...this.config } as PromptAnswers;
      } else if (!this.promptOrConfig) {
        this.promptOrConfig = await inquirer.prompt(this.prompts);
      }
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
   * @param name - Name/description of the command
   * @param cmd - Command string to execute
   * @returns this - for chaining
   */
  async runCommand(name: string, cmd: string) {
    return this.safe(async () => {
      const spinner = ora(`Running command: ${name}...`).start();
      try {
        const { stderr } = await execAsync(cmd, { cwd: this.projectPath });
        if (stderr) {
          console.error(stderr.trim());
        }
        spinner.succeed(`Command ${name} succeeded`);
        return this;
      } catch (err: unknown) {
        spinner.fail(`Command ${name} failed`);
        console.error(`Command failed: ${cmd}`);
        if (err instanceof Error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e: any = err;
          if (e.stdout) console.log(e.stdout.trim());
          if (e.stderr) console.error(e.stderr.trim());
          throw new Error(`Command "${cmd}" failed with code ${e.code || 'unknown'}: ${e.message}`);
        }
        throw new Error(`Command "${cmd}" failed with unknown error`);
      }
    });
  }

  /**
   * Safely create a file, ensuring its directory exists.
   * @param filePath - Path to file
   * @param content - File content
   * @returns this - for chaining
   */
  async createFile(filePath: string, content: string) {
    const dir = path.dirname(filePath);
    this.safe(async () => {
      this.trackStep(async () => {
        try {
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            console.log(chalk.yellow(`Rolled back file: ${filePath}`));
          }
        } catch (error) {
          console.error(chalk.red(`Failed to remove file during rollback: ${filePath}`, error));
        }
        if (!fs.existsSync(dir)) fs.promises.mkdir(dir, { recursive: true });
      });
      await fs.promises.writeFile(filePath, content);
    });
    return this;
  }

  /**
   * Add dependencies to package.json
   * @param deps - Dependency names
   * @returns this - for chaining
   */
  protected addDependencies(...deps: string[]) {
    this.dependencies.push(...deps);
    return this;
  }

  /**
   * Add devDependencies to package.json
   * @param deps - DevDependency names
   * @returns this - for chaining
   */
  protected addDevDependencies(...deps: string[]) {
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
  public scriptName: string;
  public projectName!: string;
  private packageManager: PACKAGEMANAGER;
  private writeFiles!: WriteFiles;

  constructor(promptOrConfig?: IPromptOrConfig) {
    super(promptOrConfig);
    this.packageManager = detectPackageManager();
    this.scriptName = '🚀 Create Express App';
  }

  /**
   * Initialize project: set name, create folder, init package.json
   */
  async init() {
    console.log(chalk.green.bold(`\n${this.scriptName}\n`));
    this.projectName = this.projectName || process.argv[2] || (await this.askProjectName());
    const basePath = this.projectBasePath || process.cwd();
    this.projectPath = path.join(basePath, this.projectName);
    await this.safe(async () => {
      await this.handleExistingDir();
    });
    await this.collectPrompts();
    this.writeFiles = new WriteFiles(this.promptOrConfig);
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
    const basePath = this.projectBasePath || process.cwd();
    this.projectPath = path.join(basePath, this.projectName);
    this.trackStep(async () => {
      try {
        if (fs.existsSync(this.projectPath)) {
          process.chdir(basePath);
          await fs.promises.rm(this.projectPath, { recursive: true, force: true });
          console.log(chalk.yellow(`Rollback: removed directory ${this.projectPath}`));
        }
      } catch (err) {
        console.error(chalk.red('Failed to remove project directory during rollback:', err));
      }
    });
    if (fs.existsSync(this.projectPath)) {
      await this.safe(async () => {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Directory "${this.projectName}" already exists. Remove and continue?`,
            default: false,
          },
        ]);
        if (!overwrite) {
          console.log(chalk.red('Aborting, directory already exists.'));
          throw new Error('User aborted');
        }
        process.chdir(basePath);
        await fs.promises.rm(this.projectPath, { recursive: true, force: true });
      });
    }
    await fs.promises.mkdir(this.projectPath, { recursive: true });
    process.chdir(this.projectPath);
  }

  private async initPackageJson() {
    this.trackStep(() => {
      if (fs.existsSync('package.json')) fs.rmSync('package.json', { force: true });
    });
    await this.safe(async () => {
      await this.runCommand('Initializing package.json', InitCommands[this.packageManager]);
    });
  }

  async setupProject() {
    await this.safe(async () => this.initPackageJson());
    this.handleDependencies();
    this.setupTypeScript();
    this.setupEslint();
    this.createSourceFiles();
    await this.updatePackageJson();
    return this;
  }

  /**
   * Map selected features to dependencies/devDependencies
   */
  protected handleDependencies() {
    this.promptOrConfig.features.map((feature: FEATURES) => {
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

  protected setupTypeScript() {
    if (this.promptOrConfig.language === LANGUAGE.TYPESCRIPT) {
      this.devDependencies.push(
        'typescript',
        '@types/express',
        '@types/cors',
        '@types/body-parser',
        'tsc-alias',
      );
      this.safeSync(() => {
        this.trackStep(() => fs.rmSync('tsconfig.json', { force: true }));
        this.writeFiles.writeTsConfig();
      });
    }
    return this;
  }

  protected setupEslint() {
    if (this.promptOrConfig.features.includes(FEATURES.ESLINT)) {
      this.safeSync(() => {
        this.trackStep(() => {
          ['.eslintrc.js', '.prettierrc', '.eslintignore'].forEach((file) => {
            if (fs.existsSync(file)) fs.rmSync(file, { force: true });
          });
        });
        this.writeFiles.writeEslintFiles();
      });
    }
    return this;
  }

  /**
   * Create project source directories and files
   */
  protected createSourceFiles() {
    this.safeSync(() => {
      const srcPath = path.join(this.projectPath, 'src');
      this.trackStep(() => fs.rmSync(srcPath, { recursive: true, force: true }));
      fs.mkdirSync('src');
      const allDirs = returnDirs(this.promptOrConfig.language);
      allDirs.forEach((dir) => fs.mkdirSync(`src/${dir}`));
    });
    this.safeSync(() => {
      const files = [
        '.gitignore',
        'src/app.js',
        'src/index.js',
        'src/routes.js',
        'src/controllers.js',
        'src/schema.js',
      ];
      this.trackStep(() => {
        files.forEach((file) => fs.existsSync(file) && fs.rmSync(file, { force: true }));
      });
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
  protected async updatePackageJson() {
    const spinner = ora('Setting things up...').start();
    try {
      await this.safe(async () => {
        this.trackStep(() => {
          if (fs.existsSync('package.json')) {
            fs.rmSync('package.json', { force: true });
            console.log(chalk.yellow('Rollback: removed package.json'));
          }
        });
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
        if (this.promptOrConfig.language !== LANGUAGE.TYPESCRIPT) pkg.type = 'module';
        pkg.dependencies = pkg.dependencies || {};
        pkg.devDependencies = pkg.devDependencies || {};
        pkg.scripts = {
          start:
            this.promptOrConfig.language === LANGUAGE.TYPESCRIPT
              ? 'node dist/index.js'
              : 'node src/index.js',
          lint: this.promptOrConfig.features.includes(FEATURES.ESLINT)
            ? 'eslint . --ext .ts,.js'
            : "echo 'no lint'",
          test: this.promptOrConfig.features.includes(FEATURES.JEST) ? 'jest' : "echo 'no tests'",
        };
        if (this.promptOrConfig.language === LANGUAGE.TYPESCRIPT) {
          pkg.scripts = { build: 'tsc && tsc-alias', ...pkg.scripts };
        }
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
        this.createFile('package.json', JSON.stringify(pkg, null, 2));
      });
      spinner.succeed('Success');
    } catch (error) {
      spinner.fail('Project setup failed!');
      throw error;
    }
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
    if (this.promptOrConfig.language === LANGUAGE.TYPESCRIPT) {
      console.log(`  ${this.packageManager} run build`);
    }
    console.log(`  ${this.packageManager} run start`);
  }
}
