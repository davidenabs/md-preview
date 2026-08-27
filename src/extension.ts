import * as vscode from 'vscode';
import { MarkdownPreviewPanel } from './MarkdownPreviewPanel';

export function activate(context: vscode.ExtensionContext) {
  // Command to create a new markdown file with default frontmatter/template
  const createCmd = vscode.commands.registerCommand('md-preview.createFile', async () => {
    const template = `---
title: "New Document"
date: "${new Date().toISOString().split('T')[0]}"
---

# New Document

Start typing here...
`;
    
    // Create an untitled document
    const doc = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: template
    });
    
    // Show it in the editor
    await vscode.window.showTextDocument(doc);
  });

  // Command to open the preview panel
  const previewCmd = vscode.commands.registerCommand('md-preview.showPreview', () => {
    MarkdownPreviewPanel.createOrShow(context.extensionUri);
  });

  context.subscriptions.push(createCmd, previewCmd);
}

export function deactivate() {}
