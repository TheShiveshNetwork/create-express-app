export const prompts = [
  {
    type: "list",
    name: "language",
    message: "Which language do you want?",
    choices: ["TypeScript", "JavaScript"],
  },
  {
    type: "checkbox",
    name: "features",
    message: "Select features to include:",
    choices: [
      { name: "ESLint + Prettier", value: "eslint" },
      { name: "Zod (validation)", value: "zod" },
      { name: "Jest (testing)", value: "jest" },
      { name: "Dotenv (env variables)", value: "dotenv" },
    ],
  },
];
