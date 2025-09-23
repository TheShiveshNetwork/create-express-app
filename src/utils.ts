import { exec, execSync } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';

export enum LANGUAGE {
  TYPESCRIPT = 'TypeScript',
  JAVASCRIPT = 'JavaScript',
}

export enum EXTENSIONS {
  TYPESCRIPT = '.ts',
  JAVASCRIPT = '.js',
}

export const LanguageExtension: Record<LANGUAGE, EXTENSIONS> = {
  [LANGUAGE.TYPESCRIPT]: EXTENSIONS.TYPESCRIPT,
  [LANGUAGE.JAVASCRIPT]: EXTENSIONS.JAVASCRIPT,
};

export enum PACKAGEMANAGER {
  YARN = 'yarn',
  NPM = 'npm',
  PNPM = 'pnpm',
  BUN = 'bun',
}

export const InstallCommands: Record<PACKAGEMANAGER, string> = {
  [PACKAGEMANAGER.YARN]: 'yarn install',
  [PACKAGEMANAGER.NPM]: 'npm install',
  [PACKAGEMANAGER.PNPM]: 'pnpm install',
  [PACKAGEMANAGER.BUN]: 'bun install',
};

export const InitCommands: Record<PACKAGEMANAGER, string> = {
  [PACKAGEMANAGER.YARN]: 'yarn init -y',
  [PACKAGEMANAGER.NPM]: 'npm init -y',
  [PACKAGEMANAGER.PNPM]: 'pnpm init',
  [PACKAGEMANAGER.BUN]: 'bun init',
};

const execAsync = promisify(exec);

export async function getLatestVersion(pkg: string): Promise<string> {
  const { stdout } = await execAsync(`npm view ${pkg} version`);
  return stdout.trim();
}

export function cleanup(projectPath: string) {
  if (fs.existsSync(projectPath)) {
    fs.rmSync(projectPath, { recursive: true, force: true });
  }
}

export function detectPackageManager(): PACKAGEMANAGER {
  const ua = process.env.npm_config_user_agent || '';
  for (const pm of Object.values(PACKAGEMANAGER)) {
    if (ua.startsWith(pm)) {
      return pm;
    }
  }
  return PACKAGEMANAGER.NPM;
}

export function runInstallScript() {
  const pm = detectPackageManager();
  execSync(InstallCommands[pm]);
}

export function getFileExtension(lang: LANGUAGE): EXTENSIONS {
  return LanguageExtension[lang];
}

export function returnDirs(lang: LANGUAGE) {
  const dirs = ['routes', 'middlewares', 'controllers', 'schemas'];
  if (lang === LANGUAGE.TYPESCRIPT) dirs.push('types');
  return dirs;
}
