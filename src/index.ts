export * from './builder/index.js';
export * from './utils.js';
export * from './prompts.js';
export * from './write.js';

import chalk from 'chalk';
import { ProjectBuilder as CLIBuilder } from './builder/index.js';

async function main() {
  const builder = new CLIBuilder();
  await builder
    .init()
    .then((b) => b.setupProject())
    .then((b) => b.finalize());
}

if (process.argv[1]?.endsWith('cli.js')) {
  main().catch((err) => console.error(chalk.red(err)));
}
