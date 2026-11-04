import * as changeCase from "change-case";
import { IConfig } from './models';

export const getNextCase = (currentCase: string, allowedCase: { [key: string]: unknown }) => {
	const allCases = Object.keys(CONFIG);
	const acceptedCases = allCases.filter((c: string) => c === 'ORIGINAL' || allowedCase[CONFIG[c].configParam]);
	const index = acceptedCases.indexOf(currentCase);
	if(index === -1 || index === acceptedCases.length - 1) {
		return acceptedCases[0];
	}
	return acceptedCases[index+1];
};

// The library defaults only recognize ASCII letters. Supply Unicode-aware
// boundaries to every word-based format so non-Latin words are never stripped.
const wordOptions = {
	splitRegexp: [
		/([\p{Ll}\p{N}]\p{M}*)(\p{Lu})/gu,
		/(\p{Lu}\p{M}*)(\p{Lu}\p{M}*\p{Ll})/gu
	],
	stripRegexp: /[^\p{L}\p{N}\p{M}]+/gu
};

export const toCamelCase = (text: string) => changeCase.camelCase(text, wordOptions);
export const toTitleCase = changeCase.capitalCaseTransform;
export const toCapitalCase = (text: string) => changeCase.capitalCase(text, wordOptions);
export const toConstantCase = (text: string) => changeCase.constantCase(text, wordOptions);
export const toDotCase = (text: string) => changeCase.dotCase(text, wordOptions);
export const toHeaderCase = (text: string) => changeCase.headerCase(text, wordOptions);
export const toKebabCase = (text: string) => changeCase.paramCase(text, wordOptions);
export const toPascalCase = (text: string) => changeCase.pascalCase(text, wordOptions);
export const toPathCase = (text: string) => changeCase.pathCase(text, wordOptions);
export const toSentenceCase = (text: string) => changeCase.sentenceCase(text, wordOptions);
export const toSnakeCase = (text: string) => changeCase.snakeCase(text, wordOptions);

export const CONFIG: {
	[x: string]: IConfig
} = {
	ORIGINAL: {
		caseName: 'ORIGINAL',
		configParam: 'original',
		representation: 'original',
		fn: (str: string) => str
	},
	UPPERCASE: {
	  caseName: 'UPPERCASE',
	  configParam: 'upperCase',
	  representation: 'UPPERCASE',
	  fn: (str: string) => str.toUpperCase()
	},
	LOWERCASE: {
	  caseName: 'LOWERCASE',
	  configParam: 'lowerCase',
	  representation: 'lowercase',
	  fn: (str: string) => str.toLowerCase()
	},
	TITLECASE: {
	  caseName: 'TITLECASE',
	  configParam: 'titleCase',
	  representation: 'Title Case',
	  fn: toTitleCase
	},
	CAMELCASE: {
	  caseName: 'CAMELCASE',
	  configParam: 'camelCase',
	  representation: 'camelCase',
	  fn: toCamelCase
	},
	CONSTANTCASE: {
	  caseName: 'CONSTANTCASE',
	  configParam: 'constantCase',
	  representation: 'CONSTANT_CASE',
	  fn: toConstantCase
	},
	DOTCASE: {
	  caseName: 'DOTCASE',
	  configParam: 'dotCase',
	  representation: 'dot.case',
	  fn: toDotCase
	},
	HEADERCASE: {
	  caseName: 'HEADERCASE',
	  configParam: 'headerCase',
	  representation: 'Header-Case',
	  fn: toHeaderCase
	},
	KEBABCASE: {
	  caseName: 'KEBABCASE',
	  configParam: 'kebabCase',
	  representation: 'kebab-case',
	  fn: toKebabCase
	},
	PASCALCASE: {
	  caseName: 'PASCALCASE',
	  configParam: 'pascalCase',
	  representation: 'PascalCase',
	  fn: toPascalCase
	},
	PATHCASE: {
	  caseName: 'PATHCASE',
	  configParam: 'pathCase',
	  representation: 'path/case',
	  fn: toPathCase
	},
	SENTENCECASE: { // merging
	  caseName: 'SENTENCECASE',
	  configParam: 'sentenceCase',
	  representation: 'Sentence case',
	  fn: toSentenceCase
	},
	SNAKECASE: {
	  caseName: 'SNAKECASE',
	  configParam: 'snakeCase',
	  representation: 'snake_case',
	  fn: toSnakeCase
	}
  };
export const transformSelection = (text: string, transform: (text: string) => string): string => {
	if (transform === CONFIG.ORIGINAL.fn) {
		return text;
	}
	return text.split(/(\r\n|\r|\n)/).map((part, index) => {
		if (index % 2 !== 0 || part.trim().length === 0) {
			return part;
		}
		const [, leading, body, trailing] = /^(\s*)(.*?)(\s*)$/.exec(part)!;
		const converted = transform(body);
		// Symbol-only selections must not disappear when a formatter has no words.
		return leading + (converted.length === 0 ? body : converted) + trailing;
	}).join('');
};
