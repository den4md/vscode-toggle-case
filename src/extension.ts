import * as vscode from 'vscode';
import { CONFIG, getNextCase, transformSelection } from './utilities';

interface CycleSession {
	editor: vscode.TextEditor;
	version: number;
	selections: readonly vscode.Selection[];
	originalTexts: string[];
	currentCase: string;
}

export function activate(context: vscode.ExtensionContext) {
	let session: CycleSession | undefined;
	let queue = Promise.resolve();
	let operation: {
		editor: vscode.TextEditor;
		interrupted: boolean;
		changes: { start: number; end: number; text: string }[];
	} | undefined;

	const sameSelections = (left: readonly vscode.Selection[], right: readonly vscode.Selection[]) =>
		left.length === right.length && left.every((selection, index) =>
			selection.anchor.isEqual(right[index].anchor) && selection.active.isEqual(right[index].active));

	const transform = async (editor: vscode.TextEditor, requestedCase?: string) => {
		if (vscode.window.activeTextEditor !== editor || editor.document.isClosed) {
			return;
		}
		const document = editor.document;
		const selections = [...editor.selections];
		if (selections.every(selection => selection.isEmpty)) {
			session = undefined;
			return;
		}
		const previous = session;
		const continuing = previous?.editor === editor && previous.version === document.version &&
			sameSelections(previous.selections, selections);
		const originalTexts = continuing ? previous.originalTexts :
			selections.map(selection => document.getText(selection));
		const currentCase = continuing ? previous.currentCase : 'ORIGINAL';
		const config = vscode.workspace.getConfiguration('toggleCase.case', document.uri);
		const nextCase = requestedCase ?? getNextCase(currentCase, config);
		const format = CONFIG[nextCase];
		const ranges = selections.map((selection, index) => ({
			selection,
			start: document.offsetAt(selection.start),
			end: document.offsetAt(selection.end),
			text: selection.isEmpty ? '' : transformSelection(originalTexts[index], format.fn)
		}));
		const changes = ranges.filter(range => !range.selection.isEmpty)
			.sort((left, right) => left.start - right.start);
		// Refuse overlapping edits instead of risking partial changes or lost text.
		if (changes.some((change, index) => index > 0 && changes[index - 1].end > change.start)) {
			session = undefined;
			return;
		}
		const pending = { editor, interrupted: false, changes };
		operation = pending;
		session = undefined;
		try {
			const applied = await editor.edit(builder => {
				for (const change of changes) {
					builder.replace(change.selection, change.text);
				}
			}, { undoStopBefore: true, undoStopAfter: true });
			if (!applied || pending.interrupted || document.isClosed || vscode.window.activeTextEditor !== editor) {
				return;
			}
			// Keep every transformed fragment selected, accounting for changes in length
			// before it and retaining both reversed selections and empty cursors.
			editor.selections = ranges.map(range => {
				const shift = changes.filter(change => change.end <= range.start)
					.reduce((total, change) => total + change.text.length - (change.end - change.start), 0);
				const start = document.positionAt(range.start + shift);
				const end = document.positionAt(range.start + shift + range.text.length);
				return range.selection.isReversed ? new vscode.Selection(end, start) : new vscode.Selection(start, end);
			});
			session = { editor, version: document.version, selections: [...editor.selections], originalTexts, currentCase: nextCase };
			if (vscode.workspace.getConfiguration('toggleCase.notification', document.uri).get<boolean>('notifyOnChange')) {
				void vscode.window.showInformationMessage(`Changed to ${format.representation}`);
			}
		} finally {
			operation = undefined;
		}
	};

	const run = (requestedCase?: string) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return Promise.resolve();
		}
		// Repeated key presses must finish in order, including document edits.
		queue = queue.then(() => transform(editor, requestedCase)).catch((error: unknown) => {
			session = undefined;
			console.error('Newer Toggle Case:', error);
			void vscode.window.showErrorMessage('Newer Toggle Case could not apply the transformation.');
		});
		return queue;
	};

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.toggleCase', () => run()),
		...Object.values(CONFIG).filter(format => format.caseName !== 'ORIGINAL').map(format =>
			vscode.commands.registerCommand(`extension.changeCase.${format.configParam}`, () => run(format.caseName))),
		vscode.window.onDidChangeActiveTextEditor(() => {
			session = undefined;
			if (operation) {
				operation.interrupted = true;
			}
		}),
		vscode.window.onDidChangeTextEditorSelection(event => {
			if (operation?.editor === event.textEditor && event.kind !== undefined) {
				operation.interrupted = true;
			}
			if (session?.editor === event.textEditor && !sameSelections(session.selections, event.selections)) {
				session = undefined;
			}
		}),
		vscode.workspace.onDidChangeTextDocument(event => {
			if (session?.editor.document === event.document && event.contentChanges.length > 0) {
				session = undefined;
			}
			if (operation?.editor.document === event.document && event.contentChanges.some(change =>
				!operation?.changes.some(expected => expected.start === change.rangeOffset &&
					expected.end - expected.start === change.rangeLength && expected.text === change.text))) {
				operation.interrupted = true;
			}
		}),
		vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration('toggleCase.case')) {
				session = undefined;
			}
		})
	);
}
