import { LANGUAGE } from './utils.js';

export type Feature = {
  name: string;
  value: FEATURES;
};

export enum FEATURES {
  ESLINT = 'eslint',
  ZOD = 'zod',
  JEST = 'jest',
}

export const FeaturesList = [
  { name: 'ESLint + Prettier', value: FEATURES.ESLINT },
  { name: 'Zod', value: FEATURES.ZOD },
  { name: 'Jest', value: FEATURES.JEST },
] as const satisfies readonly Feature[];

const LanguageChoices = Object.values(LANGUAGE) as readonly LANGUAGE[];

export const prompts = [
  {
    type: 'list',
    name: 'language',
    message: 'Which language do you want?',
    choices: LanguageChoices,
  },
  {
    type: 'checkbox',
    name: 'features',
    message: 'Select features to include:',
    choices: FeaturesList,
  },
] as const;

export const InitialDependencies = ['express', 'cors', 'body-parser', 'dotenv'];
export const InitialDevDependencies: string[] = [];

type ExtractChoiceValue<T> = T extends { value: infer V } ? V : T;

type ExtractPromptValue<T> = T extends { type: 'checkbox'; choices: readonly (infer C)[] }
  ? ExtractChoiceValue<C>[]
  : T extends { type: 'list' | 'input'; choices: readonly (infer C)[] }
    ? ExtractChoiceValue<C>
    : never;

export type PromptAnswers = {
  [P in (typeof prompts)[number] as P['name']]: ExtractPromptValue<P>;
};
