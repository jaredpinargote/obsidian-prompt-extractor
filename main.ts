import { App, Editor, MarkdownView, Modal, Plugin, PluginSettingTab, Setting, MetadataCache, TFile } from 'obsidian';

interface MyPluginSettings {
    mySetting: string;
    maxContentLength: number; // Added setting for max content length
	outlinkDepth: number; // New setting for outlink depth
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default',
    maxContentLength: 16000, // Default value for max content length
	outlinkDepth: 1 // Default value for outlink depth
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'outlink-prompt',
			name: 'Outlink Prompt',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (!view.file) {
					console.log("No file is currently active.");
					return;
				}
		
				const filePath = view.file.path;
				const metadataCache = this.app.metadataCache;
				let allLinkedFiles = new Set();
		
				// Recursive function to collect unique outlinks
				const collectOutlinks = async (path: string, depth: number): Promise<void> => {
					if (depth === 0) return;
				
					const fileMetadata = metadataCache.getCache(path);
					if (!fileMetadata || !fileMetadata.links) return;
				
					for (const link of fileMetadata.links) {
						// Assuming the link is a string and ends with '.md'
						if (typeof link.link === 'string') {
							const linkedFilePath = link.link + ".md";
							if (!allLinkedFiles.has(linkedFilePath)) {
								allLinkedFiles.add(linkedFilePath);
								await collectOutlinks(linkedFilePath, depth - 1);
							}
						}
					}
				};
				
		
				await collectOutlinks(filePath, this.settings.outlinkDepth);
		
				const maxTotalChars = this.settings.maxContentLength;
				const maxCharsPerLink = Math.floor(maxTotalChars / allLinkedFiles.size);
				let allContents = "# Context\n";
		
				for (const linkedFilePath of allLinkedFiles) {
					// Type assertion to ensure linkedFilePath is treated as a string
					const path = linkedFilePath as string;
					const linkedFile = this.app.vault.getAbstractFileByPath(path);
				
					if (linkedFile && linkedFile instanceof TFile) {
						let content = await this.app.vault.read(linkedFile);
						content = content.substring(0, maxCharsPerLink); // Limit the content length
						allContents += "## " + linkedFile.basename + "\n" + content + "\n\n";
				
						if (allContents.length > maxTotalChars) {
							allContents = allContents.substring(0, maxTotalChars); // Enforce total max length
							break; // Stop processing further links if max length is reached
						}
					}
				}				
		
				// Copy concatenated content to clipboard
				navigator.clipboard.writeText(allContents)
					.then(() => console.log("Content copied to clipboard!"))
					.catch(err => console.error("Error copying content to clipboard: ", err));
			}
		});
			

		this.addCommand({
			id: 'backlink-prompt',
			name: 'Backlink Prompt',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (!view.file) {
					console.log("No file is currently active.");
					return;
				}
		
				const currentFileName = view.file.basename.toLowerCase();
				const currentFileContent = await this.app.vault.read(view.file);
				// let maxContentLength = 16000 - currentFileContent.length;
				let maxContentLength = this.settings.maxContentLength;
				let allContents = "# Snippets\n"; // Start with current file content
		
				const backlinkInstances = [];
				const files = this.app.vault.getFiles();
		
				// First pass: collect backlink instances
				for (const file of files) {
					if (!(file instanceof TFile)) continue;
				
					const fileMetadata = this.app.metadataCache.getCache(file.path); // Corrected here
					if (!fileMetadata || !fileMetadata.links) continue;
				
					for (const link of fileMetadata.links) {
						if (!link.displayText) continue;
						if (link.displayText.toLowerCase() === currentFileName) {
							backlinkInstances.push({ file, linkPosition: link.position });
						}
					}
				}
		
				if (backlinkInstances.length === 0) {
					console.log("No backlinks found.");
					return;
				}
		
				const maxSnippetLength = Math.floor(maxContentLength / backlinkInstances.length);
		
				// Second pass: extract snippets
				for (const instance of backlinkInstances) {
					const fileContent = await this.app.vault.read(instance.file);
					const snippetStart = Math.max(instance.linkPosition.start.offset - Math.floor(maxSnippetLength / 2), 0);
					const snippetEnd = Math.min(instance.linkPosition.end.offset + Math.floor(maxSnippetLength / 2), fileContent.length);
					const snippet = fileContent.substring(snippetStart, snippetEnd);
		
					allContents += "## " + instance.file.name + "\n" + snippet + "\n\n";
		
					if (allContents.length > maxContentLength) {
						console.log("Reached maximum content length for clipboard.");
						break;
					}
				}
		
				navigator.clipboard.writeText(allContents)
					.then(() => console.log("Content copied to clipboard!"))
					.catch(err => console.error("Error copying content to clipboard: ", err));
			}
		});

		this.addCommand({
			id: 'backlink-prompt',
			name: 'Backlink Prompt',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (!view.file) {
					console.log("No file is currently active.");
					return;
				}
		
				const currentFileName = view.file.basename.toLowerCase();
				const currentFileContent = await this.app.vault.read(view.file);
				// let maxContentLength = 16000 - currentFileContent.length;
				let maxContentLength = this.settings.maxContentLength;
				let allContents = "# Snippets\n"; // Start with current file content
		
				const backlinkInstances = [];
				const files = this.app.vault.getFiles();
		
				// First pass: collect backlink instances
				for (const file of files) {
					if (!(file instanceof TFile)) continue;
				
					const fileMetadata = this.app.metadataCache.getCache(file.path); // Corrected here
					if (!fileMetadata || !fileMetadata.links) continue;
				
					for (const link of fileMetadata.links) {
						if (!link.displayText) continue;
						if (link.displayText.toLowerCase() === currentFileName) {
							backlinkInstances.push({ file, linkPosition: link.position });
						}
					}
				}
		
				if (backlinkInstances.length === 0) {
					console.log("No backlinks found.");
					return;
				}
		
				const maxSnippetLength = Math.floor(maxContentLength / backlinkInstances.length);
		
				// Second pass: extract snippets
				for (const instance of backlinkInstances) {
					const fileContent = await this.app.vault.read(instance.file);
					const snippetStart = Math.max(instance.linkPosition.start.offset - Math.floor(maxSnippetLength / 2), 0);
					const snippetEnd = Math.min(instance.linkPosition.end.offset + Math.floor(maxSnippetLength / 2), fileContent.length);
					const snippet = fileContent.substring(snippetStart, snippetEnd);
		
					allContents += "## " + instance.file.name + "\n" + snippet + "\n\n";
		
					if (allContents.length > maxContentLength) {
						console.log("Reached maximum content length for clipboard.");
						break;
					}
				}
		
				navigator.clipboard.writeText(allContents)
					.then(() => console.log("Content copied to clipboard!"))
					.catch(err => console.error("Error copying content to clipboard: ", err));
			}
		});
		
		
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		
		new Setting(containerEl)
			.setName('Max Content Length')
			.setDesc('Maximum length of the content')
			.addText(text => text
				.setValue(String(this.plugin.settings.maxContentLength))
				.onChange(async (value) => {
					this.plugin.settings.maxContentLength = Number(value) || DEFAULT_SETTINGS.maxContentLength;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Outlink Depth')
			.setDesc('Depth of outlink scanning (1 to Max Integer)')
			.addText(text => text
				.setValue(String(this.plugin.settings.outlinkDepth))
				.onChange(async (value) => {
					const intValue = Math.max(1, Math.min(Number(value), Number.MAX_SAFE_INTEGER));
					this.plugin.settings.outlinkDepth = intValue;
					await this.plugin.saveSettings();
				}));
	}
}
