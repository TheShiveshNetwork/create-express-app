---
sidebar_position: 1
---

# Usage

`ProjectBuilder` provides a powerful base for scaffolding Express applications. You can use it with default prompts, add your own custom steps, or completely override prompts and provide programmatic configuration.

## Using Default Prompts

You can use `ProjectBuilder` out of the box with the default prompts.

```typescript
import { ProjectBuilder } from '@mrknown404/create-express-app';

async function main() {
  const builder = new ProjectBuilder();
  await builder
    .init()             // Initialize project folder & package.json
    .then(b => b.collectPrompts()) // Collect default prompts
    .then(b => b.setupProject())   // Setup dependencies, TypeScript, ESLint, source files
    .then(b => b.finalize());      // Print next steps
}

main();
```

This is the quickest way to scaffold a project while still having optional features.

## Adding Custom Steps

You can extend the builder to run custom setup steps after the default workflow.

```typescript
import { ProjectBuilder } from '@mrknown404/create-express-app';

async function main() {
  const builder = new ProjectBuilder();

  builder.addStep(async () => {
    console.log('🔧 Creating a custom README...');
    builder.createFile('README.md', '# My Custom Project');
  });

  await builder
    .init()
    .then(b => b.collectPrompts())
    .then(b => b.setupProject())
    .then(b => b.runCustomSteps()) // Executes custom steps
    .then(b => b.finalize());
}

main();
```

You can add as many steps as you want using `addStep` and they will run safely with rollback support.

## Using Custom Prompts

You can override default prompts with your own custom prompts.

```typescript
import { ProjectBuilder } from '@mrknown404/create-express-app';

const customPrompts = [
  {
    type: 'list',
    name: 'language',
    message: 'Choose a language:',
    choices: ['JavaScript', 'TypeScript'],
  },
  {
    type: 'checkbox',
    name: 'features',
    message: 'Select optional features:',
    choices: [
      { name: 'ESLint', value: 'eslint' },
      { name: 'Jest', value: 'jest' },
    ],
  },
];

async function main() {
  const builder = new ProjectBuilder(customPrompts);

  await builder
    .init()
    .then(b => b.collectPrompts())  // Collects values from custom prompts
    .then(b => b.setupProject())
    .then(b => b.finalize());
}

main();
```

This allows you to fully control the questions users see during scaffolding.

## Programmatic Configuration (Skip Prompts)

You can completely skip interactive prompts by providing configuration directly.

```typescript
import { ProjectBuilder } from '@mrknown404/create-express-app';
import { FEATURES, LANGUAGE } from '@mrknown404/create-express-app';

async function main() {
  const builder = new ProjectBuilder({
    language: LANGUAGE.TYPESCRIPT,
    features: [FEATURES.ESLINT, FEATURES.JEST],
  });

  await builder
    .init()
    .then(b => b.setupProject())
    .then(b => b.finalize());
}

main();
```

This is ideal for CI/CD workflows or automated scaffolding scripts.

---

## Summary

`ProjectBuilder` can be used in three ways:

* Default prompts for quick scaffolding.
* Custom steps for extending functionality.
* Fully customized prompts or programmatic config for automated workflows.

All steps are safe, with rollback on errors or interruptions.
