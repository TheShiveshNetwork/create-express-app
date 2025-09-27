---
sidebar_position: 2
---

# Methods

This page documents all the **public methods** of `ProjectBuilder` including parameters, return type, and a short description.

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `init()` | None | `Promise<this>` | Initialize the project: sets project name, folder, prompts, and prepares for setup. |
| `collectPrompts()` | None | `Promise<this>` | Collect user prompts or use provided config for project setup. |
| `addStep(step: () => Promise<void> \| void)` | `step` - a function to run as a custom step | `this` | Add a custom setup step to execute after default setup. |
| `runCustomSteps()` | None | `Promise<this>` | Execute all registered custom steps safely. |
| `runCommand(name: string, cmd: string)` | `name` - description of command, `cmd` - command string | `Promise<this>` | Safely run a shell command inside the project directory. |
| `createFile(filePath: string, content: string)` | `filePath` - path of the file, `content` - file content | `this` | Safely create a file, ensuring its parent directories exist. |
| `addDependencies(...deps: string[])` | `deps` - list of dependency names | `this` | Add runtime dependencies to `package.json`. |
| `addDevDependencies(...deps: string[])` | `deps` - list of devDependency names | `this` | Add development dependencies to `package.json`. |
| `finalize()` | None | `void` | Complete project setup and print next steps to the console. |
