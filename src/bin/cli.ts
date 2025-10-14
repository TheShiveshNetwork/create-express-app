#!/usr/bin/env node
import chalk from 'chalk';
import { ProjectBuilder } from '../builder/index.js';

async function main() {
  const builder = new ProjectBuilder();
  await builder
    .init()
    .then((b) => b.setupProject())
    .then((b) => b.finalize());
}

main().catch((err) => {
  console.error(chalk.red(err));
  process.exit(1);
});
