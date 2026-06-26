# WandaScribe - AI Writing Assistant for MediaWiki

WandaScribe is a MediaWiki extension that provides literary assistance by utilizing the LLM capability of the [Wanda extension](https://www.mediawiki.org/wiki/Extension:Wanda). It helps users write better content in both the default wikitext edit window and the [VisualEditor](https://www.mediawiki.org/wiki/Extension:VisualEditor), with features like spell check, grammar check, text improvement, and more.

## Features

- **Real-time Spelling Assistance**: Shows suggestions for misspelled words near the cursor as you type
- **Grammar Checking**: Identifies and suggests corrections for grammatical errors
- **Text Improvement**: AI-powered suggestions to make your text clearer and more engaging
- **Tone Adjustment**: Convert text between formal and casual tones
- **Text Simplification**: Make complex text easier to understand
- **Text Expansion**: Add more details and context to brief text
- **Summarization**: Create concise summaries of longer text
- **Integrated UI**: Assistance panel appears in the editor with easy-to-use buttons
- **Non-intrusive Popup**: Suggestions appear in a popup near your selection
- **VisualEditor Support**: The same assistance panel and suggestions are available while editing with VisualEditor

## Requirements

- MediaWiki 1.42.0 or later
- PHP 7.4 or later
- [Wanda extension](https://www.mediawiki.org/wiki/Extension:Wanda) (required dependency)
- Vue.js (provided by MediaWiki)
- Codex design system (provided by MediaWiki)

## Installation

1. Download or clone this extension to your MediaWiki `extensions/` directory:

```bash
cd extensions
git clone https://github.com/naresh-kumar-babu/WandaScribe.git
```

2. Make sure the Wanda extension is installed and configured properly

3. Add the following to your `LocalSettings.php`:

```php
wfLoadExtension( 'WandaScribe' );
```

4. Navigate to Special:Version on your wiki to verify that the extension is successfully installed

## Configuration

WandaScribe uses the Wanda extension's configuration. Make sure Wanda is properly configured with an LLM provider:

```php
// Example Wanda configuration
$wgWandaLLMProvider = 'ollama'; // or 'openai', 'anthropic', 'azure', 'gemini'
$wgWandaLLMModel = 'gemma:2b';
$wgWandaLLMApiKey = 'your-api-key-here'; // if required by provider
$wgWandaLLMApiEndpoint = 'http://localhost:11434/api/';
```

For detailed Wanda configuration, see the [Wanda extension documentation](https://www.mediawiki.org/wiki/Extension:Wanda).

## Usage

### In the Wikitext Editor

1. **Navigate to any edit page** on your wiki
2. The **WandaScribe assistance panel** will appear above or near the editor
3. **Select text** in the editor that you want to improve
4. **Click one of the assistance buttons**:
   - **Check Spelling**: Identifies misspelled words and suggests corrections
   - **Check Grammar**: Finds grammatical errors and suggests fixes
   - **Improve Text**: Enhances clarity and engagement
   - **Make Formal**: Converts text to a formal tone
   - **Make Casual**: Converts text to a casual tone
   - **Simplify**: Makes text easier to understand
   - **Expand**: Adds more details and context
   - **Summarize**: Creates a concise summary

5. A **suggestion popup** will appear showing:
   - The original text
   - The AI-generated suggestion
   - Options to **Apply** or **Dismiss** the suggestion

6. Click **Apply** to replace the selected text with the suggestion

### Real-time Spell Check

As you type, WandaScribe monitors your text and:
- Detects potential misspellings when you press space or punctuation
- Shows a popup with suggestions near the cursor
- Allows you to quickly correct mistakes

> Real-time spell check is only available in the wikitext editor. In VisualEditor, use the **Check Spelling** button on a selection instead.

### In VisualEditor

When the [VisualEditor extension](https://www.mediawiki.org/wiki/Extension:VisualEditor) is installed, WandaScribe automatically registers itself as a VisualEditor plugin — no extra configuration is required.

1. **Open any page in VisualEditor** ("Edit" rather than "Edit source")
2. The **WandaScribe assistance panel** appears above the editing surface
3. **Select text** in the document
4. **Click one of the assistance buttons** (same actions as the wikitext editor)
5. Review the suggestion in the popup and click **Apply** to replace the selected text

Applied suggestions go through VisualEditor's own edit history, so they can be undone with Ctrl+Z / the undo button like any other change.

## Troubleshooting

### Panel doesn't appear
- Check that you're on an edit page (action=edit)
- Verify Wanda extension is installed and loaded
- Check browser console for JavaScript errors

### "Wanda not available" error
- Ensure Wanda extension is installed: `Special:Version`
- Check Wanda configuration in `LocalSettings.php`
- Verify LLM provider is properly configured

### No suggestions or errors
- Check Wanda's LLM configuration
- Test Wanda's chat feature at `Special:Wanda`
- Review MediaWiki debug logs

### Slow performance
- Adjust LLM timeout settings in Wanda config
- Use a faster LLM model
- Consider using a local Ollama instance

## Privacy and Security

- All text processing is done through the Wanda extension's LLM integration
- Data is sent to the configured LLM provider (Ollama, OpenAI, etc.)
- For sensitive wikis, use self-hosted Ollama to keep data private
- No text is stored by WandaScribe itself

## Limitations

- Requires Wanda extension to be installed and configured
- Performance depends on the LLM provider's speed
- Quality of suggestions depends on the LLM model used
- In VisualEditor, suggestions are applied as plain text, so any rich formatting (links, bold, templates, etc.) inside the replaced selection is removed
- Real-time (as-you-type) spell check is only available in the wikitext editor, not in VisualEditor

## Support

- **Documentation**: https://www.mediawiki.org/wiki/Extension:WandaScribe
- **Issues**: Report bugs and feature requests on the issue tracker
- **Wanda Extension**: https://www.mediawiki.org/wiki/Extension:Wanda

## See Also

- [Extension:Wanda](https://www.mediawiki.org/wiki/Extension:Wanda) - Required dependency
- [Wikimedia Codex](https://doc.wikimedia.org/codex/) - Design system

---
