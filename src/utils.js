import { execSync } from "child_process";

export function getLatestVersion(pkg) {
    return execSync(`npm view ${pkg} version`).toString().trim();
}

export function cleanup(projectPath) {
    if (fs.existsSync(projectPath)) {
        fs.rmSync(projectPath, { recursive: true, force: true });
    }
}

export function detectPackageManager() {
    const ua = process.env.npm_config_user_agent || "";
    if (ua.startsWith("yarn")) return "yarn";
    if (ua.startsWith("pnpm")) return "pnpm";
    if (ua.startsWith("bun")) return "bun";
    return "npm";
}

export function runInstallScript() {
    const pm = detectPackageManager();
    const commands = {
        npm: "npm install",
        yarn: "yarn install",
        pnpm: "pnpm install",
        bun: "bun install",
    };
    return commands[pm];
}

export function getFileExtension(lang) {
    return lang === "TypeScript" ? ".ts" : ".js";
}

export function returnDirs(lang) {
    let dirs = [
        "routes",
        "middlewares",
        "controllers",
        "schemas",
    ]
    if (lang === "TypeScript") dirs.push("types");
    return dirs;
}