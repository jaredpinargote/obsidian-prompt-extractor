import { App, Editor, MarkdownView, Modal, Plugin, PluginSettingTab, Setting, MetadataCache, TFile } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
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
				const fileMetadata = metadataCache.getCache(filePath);
		
				if (!fileMetadata || !fileMetadata.links) {
					console.log("No outgoing links found.");
					return;
				}
		
				const maxTotalChars = 16000;
				const maxCharsPerLink = Math.floor(maxTotalChars / fileMetadata.links.length);
				let allContents = "";
		
				for (const link of fileMetadata.links) {
					const linkedFileName = link.link;
					const linkedFilePath = linkedFileName + ".md"; // Assuming .md files
		
					const linkedFile = this.app.vault.getAbstractFileByPath(linkedFilePath);
		
					if (linkedFile && linkedFile instanceof TFile) {
						let content = await this.app.vault.read(linkedFile);
						content = content.substring(0, maxCharsPerLink); // Limit the content length
						allContents += content + "\n\n";
		
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
				let maxContentLength = 16000 - currentFileContent.length;
				let allContents = currentFileContent + "\n\n"; // Start with current file content
		
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
		
					allContents += snippet + "\n\n";
		
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
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
