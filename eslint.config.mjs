import tseslint from 'typescript-eslint';

export default tseslint.config(
	{ ignores: ['out/**', 'node_modules/**', '.vscode-test/**', 'work/**', 'artifacts/**'] },
	...tseslint.configs.recommended,
	{ rules: { 'eqeqeq': 'error', 'curly': 'error', '@typescript-eslint/no-non-null-assertion': 'off' } }
);
