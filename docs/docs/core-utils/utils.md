---
sidebar_position: 1
---

# Utils

This module provides utility functions, enums, and types for project setup and management.

## Enums

| Name | Description |
|------|-------------|
| `LANGUAGE` | Supported languages: `TypeScript` or `JavaScript`. |
| `EXTENSIONS` | File extensions for each language (`.ts` or `.js`). |
| `PACKAGEMANAGER` | Supported package managers (`npm`, `yarn`, `pnpm`, `bun`). |
| `FEATURES` | Optional features for the project (`eslint`, `zod`, `jest`). |

## Constants

| Name | Type | Description |
|------|------|-------------|
| `LanguageExtension` | `Record<LANGUAGE, EXTENSIONS>` | Maps each language to its file extension. |
| `InstallCommands` | `Record<PACKAGEMANAGER, string>` | Default install commands for each package manager. |
| `InitCommands` | `Record<PACKAGEMANAGER, string>` | Default init commands for each package manager. |
| `FeaturesList` | `readonly Feature[]` | List of selectable project features (`ESLint`, `Zod`, `Jest`). |
| `prompts` | `readonly any[]` | Default inquirer prompts for project language and features. |
| `InitialDependencies` | `string[]` | Default runtime dependencies (`express`, `cors`, etc.). |
| `InitialDevDependencies` | `string[]` | Default dev dependencies (initially empty). |

## Functions

| Name | Parameters | Return Type | Description |
|------|------------|-------------|-------------|
| `execAsync` | N/A | `Promise<ExecResult>` | Promisified `exec` for async shell commands. |
| `getLatestVersion(pkg: string)` | `pkg` - package name | `Promise<string>` | Returns the latest version of an npm package. |
| `cleanup(projectPath: string)` | `projectPath` - path to project | `void` | Remove a project directory recursively. |
| `detectPackageManager()` | None | `PACKAGEMANAGER` | Detects the package manager in use or defaults to npm. |
| `runInstallScript()` | None | `void` | Runs the default install command using the detected package manager. |
| `getFileExtension(lang: LANGUAGE)` | `lang` - language | `EXTENSIONS` | Returns the file extension for the specified language. |
| `returnDirs(lang: LANGUAGE)` | `lang` - language | `string[]` | Returns default source directories based on language. |

## Types

| Name | Description |
|------|-------------|
| `PromptAnswers` | Type representing the collected answers from prompts: includes `language` and `features`. |

## Class: `WriteFiles`

### Constructor

| Parameters | Description |
|------------|-------------|
| `answers: PromptAnswers` | User-selected language and features. |

### Public Methods

| Method | Description |
|--------|-------------|
| `writeGitignore()` | Creates `.gitignore` with standard entries. |
| `writeEslintFiles()` | Writes `.eslintrc.js` and `.prettierrc` if ESLint is enabled. |
| `writeTsConfig()` | Writes `tsconfig.json` if TypeScript is selected. |
| `writeAppFile()` | Creates `src/app.js` or `src/app.ts`. |
| `writeIndexFile()` | Creates `src/index.js` or `src/index.ts`. |
| `writePingRoute()` | Creates a ping route file in `src/routes`. |
| `writeSampleRoute()` | Creates a sample route file in `src/routes`. |
| `writeRoutesFile()` | Creates the main `src/routes/index` file and adds sample routes. |
| `writeSampleController()` | Creates a sample controller file. |
| `writeControllersFile()` | Creates `src/controllers/index` and sets up controller class. |
| `writeSchemaFile()` | Writes `src/schemas/index` if Zod feature is enabled. |

