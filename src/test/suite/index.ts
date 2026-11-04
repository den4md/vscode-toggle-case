import * as path from 'path';
import * as fs from 'fs';
import Mocha from 'mocha';

export function run(): Promise<void> {
	const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 10000 });
	for (const file of fs.readdirSync(__dirname).filter(file => file.endsWith('.test.js'))) {
		mocha.addFile(path.join(__dirname, file));
	}
	return new Promise((resolve, reject) => {
		mocha.run(failures => failures > 0 ? reject(new Error(`${failures} tests failed.`)) : resolve());
	});
}
