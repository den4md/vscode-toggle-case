import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
	const extensionDevelopmentPath = path.resolve(__dirname, '../../');
	await runTests({
		extensionDevelopmentPath,
		extensionTestsPath: path.resolve(__dirname, './suite/index'),
		version: process.env.VSCODE_TEST_VERSION ?? '1.145.0',
		vscodeExecutablePath: process.env.VSCODE_EXECUTABLE_PATH,
		launchArgs: [
			'--disable-extensions',
			'--disable-workspace-trust',
			'--skip-welcome',
			'--skip-release-notes',
			`--user-data-dir=${path.join(extensionDevelopmentPath, '.vscode-test/test-user-data')}`,
			`--extensions-dir=${path.join(extensionDevelopmentPath, '.vscode-test/test-extensions')}`
		]
	});
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
