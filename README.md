# Create Express App

A **flexible Express.js project scaffolding tool** with optional **TypeScript**, **ESLint**, **Jest**, and more.

---

## 🚀 Quick Start

Create a new Express project directly with `npx`, `yarn dlx`, `pnpm dlx`, or `bunx`:

```bash
npx @mrknown404/create-express-app <app-name>

yarn dlx @mrknown404/create-express-app <app-name>

pnpm dlx @mrknown404/create-express-app <app-name>

bunx @mrknown404/create-express-app <app-name>
```

Or install globally and run:

```bash
npm i -g @mrknown404/create-express-app
```

Then execute:

```bash
npx create-express-app <app-name>

yarn dlx create-express-app <app-name>

pnpm dlx create-express-app <app-name>

bunx create-express-app <app-name>
```

---

## ⚡ Features

* Initialize **JavaScript** or **TypeScript** Express projects.
* Select optional features:

  * ESLint + Prettier
  * Jest testing framework
  * Zod schema validation
* Automatic project structure creation (`src`, `controllers`, `routes`, `schemas`).
* Safe execution with **rollback** on errors or interruptions.
* Fully customizable via prompts or programmatic config.

---

## 🛠 Installation (Wrapper Usage)

Install the package locally in your project:

```bash
npm i @mrknown404/create-express-app

yarn add @mrknown404/create-express-app

pnpm add @mrknown404/create-express-app

bun add @mrknown404/create-express-app
```

---

## 📦 Using ProjectBuilder Programmatically

### 1️⃣ Using Default Prompts

```typescript
import { ProjectBuilder } from '@mrknown404/create-express-app';

async function main() {
  const builder = new ProjectBuilder();
  await builder
    .init()         // Initialize project folder & package.json
    .then(b => b.setupProject()) // Setup dependencies, TypeScript, ESLint, source files
    .then(b => b.finalize());    // Print next steps
}

main();
```

---

### 2️⃣ Adding Custom Steps

Add custom setup steps to run after default project setup:

```typescript
import { ProjectBuilder } from '@mrknown404/create-express-app';

async function main() {
  const builder = new ProjectBuilder();

  builder.addStep(async () => {
    console.log("🔧 Running custom setup step...");
    // Example: create README or .env file
  });

  await builder.init()
    .then(b => b.setupProject())
    .then(b => b.runCustomSteps()) // Execute all custom steps
    .then(b => b.finalize());
}

main();
```

---

### 3️⃣ Using Custom Prompts

Override default interactive prompts:

```typescript
import { ProjectBuilder } from '@mrknown404/create-express-app';

const customPrompts = [
  {
    type: 'list',
    name: 'language',
    message: 'Pick your preferred language:',
    choices: ['JavaScript', 'TypeScript'],
  },
  {
    type: 'checkbox',
    name: 'features',
    message: 'Select features:',
    choices: [
      { name: 'ESLint', value: 'eslint' },
      { name: 'Jest', value: 'jest' },
    ],
  },
];

async function main() {
  const builder = new ProjectBuilder(customPrompts);

  await builder.init()
    .then(b => b.collectPrompts()) // Collects values from custom prompts
    .then(b => b.setupProject())
    .then(b => b.finalize());
}

main();
```

---

### 4️⃣ Using Programmatic Config (No Prompts)

Skip interactive prompts entirely and provide configuration directly:

```typescript
import { ProjectBuilder } from '@mrknown404/create-express-app';
import { FEATURES, LANGUAGE } from '@mrknown404/create-express-app';

async function main() {
  const builder = new ProjectBuilder({
    language: LANGUAGE.TYPESCRIPT,
    features: [FEATURES.ESLINT, FEATURES.JEST],
  });

  await builder.init()
    .then(b => b.setupProject())
    .then(b => b.finalize());
}

main();
```

---

## 📂 Generated Project Structure

```
my-express-app/
├─ src/
│  ├─ controllers/
│  ├─ middlewares/
│  ├─ routes/
│  ├─ schemas/
│  ├─ types/
│  ├─ index.ts (or index.js)
│  └─ app.ts (or app.js)
├─ package.json
├─ tsconfig.json (if TypeScript)
├─ .eslintrc.js (if ESLint)
└─ .gitignore
```

---

## 🛡 Error Handling & Rollbacks

* All operations are wrapped in **safe methods** with automatic rollback.
* Interruptions (`SIGINT` / `SIGTERM`) trigger cleanup.

---

## 🌟 Advanced Customization

Extend `BuilderHelper` for fully custom workflows:

* `addStep(fn)` — Add custom setup steps.
* `runCustomSteps()` — Execute all registered steps.
* `createFile(path, content)` — Safely create files.
* `addDependencies(...deps)` / `addDevDependencies(...deps)` — Manage packages programmatically.

---

## License

[MIT](https://github.com/TheShiveshNetwork/create-express-app/blob/main/LICENSE)
