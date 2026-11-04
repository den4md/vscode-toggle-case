import * as assert from 'assert';
import * as vscode from 'vscode';
import { CONFIG, getNextCase, transformSelection } from '../../utilities';

const pause = () => new Promise(resolve => setTimeout(resolve, 40));
const selection = (start: number, end: number) => new vscode.Selection(0, start, 0, end);
const toggle = () => vscode.commands.executeCommand('extension.toggleCase');
const change = (format: string) => vscode.commands.executeCommand(`extension.changeCase.${format}`);

async function open(content: string, selections?: vscode.Selection[]) {
	const document = await vscode.workspace.openTextDocument({ content, language: 'plaintext' });
	const editor = await vscode.window.showTextDocument(document);
	editor.selections = selections ?? [new vscode.Selection(document.positionAt(0), document.positionAt(content.length))];
	await pause();
	return editor;
}

suite('Newer Toggle Case integration', () => {
	suiteSetup(async () => {
		assert.strictEqual(vscode.version, process.env.VSCODE_TEST_VERSION ?? '1.145.0');
		await vscode.workspace.getConfiguration('toggleCase.notification').update('notifyOnChange', false, true);
		await vscode.extensions.getExtension('den4md.toggle-case')!.activate();
	});

	setup(async () => {
		while (vscode.window.activeTextEditor) {
			await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
		}
		await pause();
	});

	test('first command reads the current selection without an earlier keyboard event', async () => {
		const editor = await open('hello World');
		await toggle();
		assert.strictEqual(editor.document.getText(), 'HELLO WORLD');
		assert.strictEqual(editor.document.getText(editor.selection), 'HELLO WORLD');
	});

	test('multiple reversed selections survive length changes and cycle back exactly', async () => {
		const original = 'first name | other example';
		const editor = await open(original, [selection(26, 13), selection(0, 10)]);
		await change('camelCase');
		assert.strictEqual(editor.document.getText(), 'firstName | otherExample');
		assert.deepStrictEqual(editor.selections.map(s => editor.document.getText(s)), ['otherExample', 'firstName']);
		assert.strictEqual(editor.selections[0].isReversed, true);
		await change('upperCase');
		assert.strictEqual(editor.document.getText(), 'FIRST NAME | OTHER EXAMPLE');
		for (let i = 0; i < Object.keys(CONFIG).length - 1; i++) {
			await toggle();
		}
		assert.strictEqual(editor.document.getText(), original);
	});

	test('rapid commands execute sequentially rather than using stale text', async () => {
		const editor = await open('Hello World');
		await Promise.all([toggle(), toggle(), toggle(), toggle()]);
		assert.strictEqual(editor.document.getText(), 'helloWorld');
		assert.strictEqual(editor.document.getText(editor.selection), 'helloWorld');
	});

	test('all-empty cursors are a no-op', async () => {
		const editor = await open('firstName lastName', [selection(2, 2), selection(13, 13)]);
		await toggle();
		await change('snakeCase');
		assert.strictEqual(editor.document.getText(), 'firstName lastName');
		assert.deepStrictEqual(editor.selections.map(s => s.active.character), [2, 13]);
	});

	test('mixed empty cursors track offsets without transforming their words', async () => {
		const editor = await open('first name | untouched', [selection(0, 10), selection(17, 17)]);
		await change('camelCase');
		assert.strictEqual(editor.document.getText(), 'firstName | untouched');
		assert.strictEqual(editor.selections[1].isEmpty, true);
		assert.strictEqual(editor.selections[1].active.character, 16);
		await change('upperCase');
		assert.strictEqual(editor.document.getText(), 'FIRST NAME | untouched');
		assert.strictEqual(editor.selections[1].active.character, 17);
	});

	for (const eol of ['\n', '\r\n']) {
		test(`multiline selections preserve indentation, whitespace and ${JSON.stringify(eol)}`, async () => {
			const editor = await open(`  first name  ${eol}\tother value\t${eol}${eol}   `);
			await change('camelCase');
			assert.strictEqual(editor.document.getText(), `  firstName  ${eol}\totherValue\t${eol}${eol}   `);
		});
	}

	test('editing the document starts a new cycle', async () => {
		const editor = await open('old text');
		await toggle();
		await editor.edit(builder => builder.replace(editor.selection, 'fresh words'));
		editor.selection = selection(0, 11);
		await pause();
		await toggle();
		assert.strictEqual(editor.document.getText(), 'FRESH WORDS');
	});

	test('changing selection starts a new cycle even if it returns to the same range', async () => {
		const editor = await open('first second', [selection(0, 5)]);
		await change('camelCase');
		editor.selection = selection(6, 12);
		await pause();
		editor.selection = selection(0, 5);
		await pause();
		await toggle();
		assert.strictEqual(editor.document.getText(), 'FIRST second');
	});

	test('editor switches cannot paste text from another document', async () => {
		const first = await open('first text');
		await toggle();
		const second = await open('different text');
		await toggle();
		assert.strictEqual(second.document.getText(), 'DIFFERENT TEXT');
		await vscode.window.showTextDocument(first.document);
		await pause();
		await toggle();
		assert.strictEqual(first.document.getText(), 'FIRST TEXT');
	});

	test('each transformation is one undo step and redo restores it', async () => {
		const editor = await open('first name last name', [selection(0, 10), selection(11, 20)]);
		await change('camelCase');
		await change('snakeCase');
		assert.strictEqual(editor.document.getText(), 'first_name last_name');
		await vscode.commands.executeCommand('undo');
		assert.strictEqual(editor.document.getText(), 'firstName lastName');
		await vscode.commands.executeCommand('undo');
		assert.strictEqual(editor.document.getText(), 'first name last name');
		await vscode.commands.executeCommand('redo');
		assert.strictEqual(editor.document.getText(), 'firstName lastName');
	});

	test('unicode length changes move later selections correctly', async () => {
		const editor = await open('straße test', [selection(0, 6), selection(7, 11)]);
		await toggle();
		assert.strictEqual(editor.document.getText(), 'STRASSE TEST');
		assert.deepStrictEqual(editor.selections.map(s => editor.document.getText(s)), ['STRASSE', 'TEST']);
	});

	test('symbol-only selections cannot disappear', async () => {
		const editor = await open('___', [selection(0, 3)]);
		await change('camelCase');
		assert.strictEqual(editor.document.getText(), '___');
	});

	test('no active editor is a no-op', async () => {
		await toggle();
		await change('kebabCase');
		assert.strictEqual(vscode.window.activeTextEditor, undefined);
	});

	test('a read-only document rejects edits without changing its contents', async () => {
		const provider = vscode.workspace.registerTextDocumentContentProvider('toggle-case-test', {
			provideTextDocumentContent: () => 'Read Only Text'
		});
		try {
			const document = await vscode.workspace.openTextDocument(vscode.Uri.parse('toggle-case-test:/readonly'));
			const editor = await vscode.window.showTextDocument(document);
			editor.selection = selection(0, 14);
			await pause();
			await toggle();
			assert.strictEqual(document.getText(), 'Read Only Text');
			const editable = await open('fresh text');
			await toggle();
			assert.strictEqual(editable.document.getText(), 'FRESH TEXT');
		} finally {
			provider.dispose();
		}
	});

	const expectedFormats: { [format: string]: string } = {
		upperCase: 'HELLO WORLD | OTHER WORDS',
		lowerCase: 'hello world | other words',
		titleCase: 'Hello world | Other words',
		camelCase: 'helloWorld | otherWords',
		constantCase: 'HELLO_WORLD | OTHER_WORDS',
		dotCase: 'hello.world | other.words',
		headerCase: 'Hello-World | Other-Words',
		kebabCase: 'hello-world | other-words',
		pascalCase: 'HelloWorld | OtherWords',
		pathCase: 'hello/world | other/words',
		sentenceCase: 'Hello world | Other words',
		snakeCase: 'hello_world | other_words'
	};
	for (const [format, expected] of Object.entries(expectedFormats)) {
		test(`direct command ${format} transforms every selection`, async () => {
			const editor = await open('hello world | other words', [selection(0, 11), selection(14, 25)]);
			await change(format);
			assert.strictEqual(editor.document.getText(), expected);
			assert.strictEqual(editor.selections.length, 2);
		});
	}

	test('full cycle returns the exact original between separate user commands', async () => {
		const editor = await open('  original_Weird-CASE  ');
		const original = editor.document.getText();
		for (let i = 0; i < Object.keys(CONFIG).length; i++) {
			await toggle();
			await pause();
		}
		assert.strictEqual(editor.document.getText(), original);
	});

	test('a disabled format is skipped using actual VS Code configuration', async () => {
		const config = vscode.workspace.getConfiguration('toggleCase.case');
		await config.update('upperCase', false, true);
		try {
			const editor = await open('Mixed Case');
			await toggle();
			assert.strictEqual(editor.document.getText(), 'mixed case');
		} finally {
			await config.update('upperCase', undefined, true);
		}
	});

	test('disabled formats are skipped and ORIGINAL is always available', () => {
		assert.strictEqual(getNextCase('ORIGINAL', { snakeCase: true }), 'SNAKECASE');
		assert.strictEqual(getNextCase('SNAKECASE', { snakeCase: true }), 'ORIGINAL');
		assert.strictEqual(getNextCase('ORIGINAL', {}), 'ORIGINAL');
		assert.strictEqual(getNextCase('HEADERCASE', { kebabCase: true }), 'ORIGINAL');
		assert.strictEqual(getNextCase('KEBABCASE', { kebabCase: true }), 'ORIGINAL');
	});

	test('line transformation preserves mixed EOL sequences', () => {
		assert.strictEqual(transformSelection(' first name\r\n\tother name\nlast name\r', CONFIG.CAMELCASE.fn),
			' firstName\r\n\totherName\nlastName\r');
	});
});
