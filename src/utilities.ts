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

export const toCamelCase = changeCase.camelCase;
export const toTitleCase = changeCase.capitalCaseTransform;
export const toCapitalCase = changeCase.capitalCase;
export const toConstantCase = changeCase.constantCase;
export const toDotCase = changeCase.dotCase;
export const toHeaderCase = changeCase.headerCase;
export const toKebabCase = changeCase.paramCase;
export const toPascalCase = changeCase.pascalCase;
export const toPathCase = changeCase.pathCase;
export const toSentenceCase = changeCase.sentenceCase;
export const toSnakeCase = changeCase.snakeCase;

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
