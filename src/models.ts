export interface IConfig {
	caseName: string;
	configParam: string;
	representation: string;
	fn: (text: string) => string;
}