/**
 * Shared base class for WandaScribe editor integrations.
 *
 * Holds all of the editor-agnostic logic: orchestrating panel/popup state,
 * building the Wanda prompts and calling the Wanda API. Editor-specific
 * concerns (reading the current selection, replacing text and computing
 * popup coordinates) are left abstract and implemented by subclasses such as
 * the wikitext textarea integration and the VisualEditor integration.
 */

class EditorIntegrationBase {
  constructor() {
    this.panelComponent = null;
    this.popupComponent = null;
    this.selectedText = '';
    this.spellCheckTimeout = null;
  }

  setComponents( panelComponent, popupComponent ) {
    this.panelComponent = panelComponent;
    this.popupComponent = popupComponent;
    this.init();
  }

  /**
   * Attach editor-specific selection listeners. Implementations should keep
   * `this.selectedText` up to date and call `panelComponent.setHasSelection()`.
   *
   * @abstract
   */
  init() {
    throw new Error( 'EditorIntegrationBase.init() must be implemented by a subclass' );
  }

  /**
   * Return the approximate { top, left } page coordinates where the suggestion
   * popup should be anchored for the current selection.
   *
   * @abstract
   * @return {{ top: number, left: number }}
   */
  getSelectionCoordinates() {
    throw new Error( 'EditorIntegrationBase.getSelectionCoordinates() must be implemented by a subclass' );
  }

  /**
   * Replace the current selection. When `originalWord` is provided only that
   * word is replaced within the selection (used for spelling corrections),
   * otherwise the whole selection is replaced with `suggestion`.
   *
   * @abstract
   * @param {string} suggestion
   * @param {string|null} originalWord
   */
  applySuggestion() {
    throw new Error( 'EditorIntegrationBase.applySuggestion() must be implemented by a subclass' );
  }

  /**
   * Apply a list of spelling corrections at once.
   *
   * @param {Array<{ original: string, replacement: string }>} corrections
   */
  applyAllSuggestions( corrections ) {
    if ( !Array.isArray( corrections ) ) {
      return;
    }
    corrections.forEach( ( correction ) => {
      this.applySuggestion( correction.replacement, correction.original );
    } );
  }

  async handleAction( actionType ) {
    if ( !this.selectedText ) {
      this.panelComponent.setLoading( false );
      return;
    }

    // Set loading state for panel only
    this.panelComponent.setLoading( true );

    try {
      let result;
      switch ( actionType ) {
        case 'spell-check':
          result = await this.checkSpelling( this.selectedText );
          break;
        case 'grammar-check':
          result = await this.checkGrammar( this.selectedText );
          break;
        case 'improve':
          result = await this.improveText( this.selectedText );
          break;
        case 'formal':
          result = await this.makeFormal( this.selectedText );
          break;
        case 'casual':
          result = await this.makeCasual( this.selectedText );
          break;
        case 'simplify':
          result = await this.simplifyText( this.selectedText );
          break;
        case 'expand':
          result = await this.expandText( this.selectedText );
          break;
        case 'summarize':
          result = await this.summarizeText( this.selectedText );
          break;
        default:
          throw new Error( 'Unknown action type' );
      }

      // Show popup with results after API call completes
      const coords = this.getSelectionCoordinates();
      this.popupComponent.show( this.selectedText, coords );

      if ( actionType === 'spell-check' && result.misspelled ) {
        this.popupComponent.setMisspellings( result.words || [] );
      } else if ( actionType === 'spell-check' && !result.misspelled ) {
        // No spelling errors found
        this.popupComponent.setSuccess( mw.message( 'wandascribe-no-spelling-errors' ).text() );
      } else if ( result.suggestion ) {
        // Check if the response indicates uncertainty
        const isUncertain = result.suggestion === "I'm not sure about that";

        if ( isUncertain ) {
          this.popupComponent.setSuggestion( result.suggestion, true ); // true = disable apply button
        } else {
          this.popupComponent.setSuggestion( result.suggestion, false );
        }
      } else if ( result.error ) {
        this.popupComponent.setError( result.error );
      } else {
        // No meaningful result
        this.popupComponent.setSuccess( mw.message( 'wandascribe-no-changes-needed' ).text() );
      }

      this.panelComponent.setLoading( false );
    } catch ( error ) {
      console.error( 'Action error:', error );

      // Show popup with error
      const coords = this.getSelectionCoordinates();
      this.popupComponent.show( this.selectedText, coords );
      this.popupComponent.setError( mw.message( 'wandascribe-error' ).text() );

      this.panelComponent.setLoading( false );
    }
  }

  async checkSpelling( text ) {
    const instruction = `Check the spelling of the following text. If there are misspelled words, list them with suggestions. If the text is correct, respond with "No spelling errors found."

Respond in stringified JSON format which is easy to parse programmatically. It should not have any extra text or type annotation of the code block.

Example response:
{
  "misspelled": true/false,
  "words": [{"word": "...", "suggestions": ["...", "..."]}]
}`;

    return await this.callWandaAPI( text, instruction );
  }

  async checkGrammar( text ) {
    const instruction = `Check the grammar of the following text and suggest corrections if needed. If the grammar is correct, respond with "No grammar errors found."

IMPORTANT: Return ONLY the corrected text or the confirmation message. Do NOT include any preamble like "Here is the corrected version" or "The corrected text is". Start directly with the corrected text.`;

    const response = await this.callWandaAPI( text, instruction );
    return {
      suggestion: response.includes( 'No grammar errors' ) ? null : response
    };
  }

  async improveText( text ) {
    const instruction = `Improve the following text by making it clearer, more engaging, and better structured while maintaining its original meaning.

IMPORTANT: Return ONLY the improved text. Do NOT include any preamble, explanations, or phrases like "Here is the improved version". Start directly with the improved text.`;

    const response = await this.callWandaAPI( text, instruction );
    return { suggestion: response };
  }

  async makeFormal( text ) {
    const instruction = `Rewrite the following text in a formal tone suitable for professional or academic contexts.

IMPORTANT: Return ONLY the formal version of the text. Do NOT include any preamble, explanations, or phrases like "Here is the formal version". Start directly with the formal text.`;

    const response = await this.callWandaAPI( text, instruction );
    return { suggestion: response };
  }

  async makeCasual( text ) {
    const instruction = `Rewrite the following text in a casual, conversational tone.

IMPORTANT: Return ONLY the casual version of the text. Do NOT include any preamble, explanations, or phrases like "Here is the casual version". Start directly with the casual text.`;

    const response = await this.callWandaAPI( text, instruction );
    return { suggestion: response };
  }

  async simplifyText( text ) {
    const instruction = `Simplify the following text to make it easier to understand while keeping the core message.

IMPORTANT: Return ONLY the simplified text. Do NOT include any preamble, explanations, or phrases like "Here is the simplified version". Start directly with the simplified text.`;

    const response = await this.callWandaAPI( text, instruction );
    return { suggestion: response };
  }

  async expandText( text ) {
    const instruction = `Expand the following text by adding more details, explanations, and context.

IMPORTANT: Return ONLY the expanded text. Do NOT include any preamble, explanations, or phrases like "Here is the expanded version". Start directly with the expanded text.`;

    const response = await this.callWandaAPI( text, instruction );
    return { suggestion: response };
  }

  async summarizeText( text ) {
    const instruction = `Summarize the following text concisely while capturing the main points.

IMPORTANT: Return ONLY the summary. Do NOT include any preamble, explanations, or phrases like "Here is the summary". Start directly with the summary.`;

    const response = await this.callWandaAPI( text, instruction );
    return { suggestion: response };
  }

  async callWandaAPI( message, customprompt ) {
    try {
      const api = new mw.Api();
      const data = await api.post( {
        action: 'wandachat',
        format: 'json',
        message: message,
        customprompt: customprompt,
        skipesquery: true,
        usepublicknowledge: true,
        temperature: '0',
        maxtokens: 10000
      } );

      if ( data && data.response ) {
        // Try to parse JSON response for spell check
        try {
          // Strip markdown code blocks if present (```json ... ```)
          let responseText = data.response.trim();
          const codeBlockMatch = responseText.match( /```(?:json)?\s*\n?([\s\S]*?)\n?```/ );
          if ( codeBlockMatch ) {
            responseText = codeBlockMatch[ 1 ].trim();
          }

          const jsonResponse = JSON.parse( responseText );
          return jsonResponse;
        } catch ( e ) {
          // Not JSON, return as plain text (also strip markdown if present)
          let responseText = data.response.trim();
          const codeBlockMatch = responseText.match( /```(?:\w+)?\s*\n?([\s\S]*?)\n?```/ );
          if ( codeBlockMatch ) {
            responseText = codeBlockMatch[ 1 ].trim();
          }
          return responseText;
        }
      } else {
        throw new Error( 'No response from Wanda API' );
      }
    } catch ( error ) {
      console.error( 'Wanda API error:', error );
      this.panelComponent.setWandaAvailable( false );
      throw error;
    }
  }
}

module.exports = EditorIntegrationBase;
