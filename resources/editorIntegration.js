/**
 * Editor integration module for WandaScribe
 * Handles text selection, spell checking, and interaction with the wikitext editor
 */

class EditorIntegration {
  constructor( textarea ) {
    this.textarea = textarea;
    this.panelComponent = null;
    this.popupComponent = null;
    this.selectedText = '';
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.lastCursorPosition = 0;
    this.spellCheckTimeout = null;
  }

  setComponents( panelComponent, popupComponent ) {
    this.panelComponent = panelComponent;
    this.popupComponent = popupComponent;
    this.init();
  }

  init() {
    // Monitor text selection
    this.textarea.addEventListener( 'mouseup', () => this.handleSelection() );
    this.textarea.addEventListener( 'keyup', () => this.handleSelection() );
    this.textarea.addEventListener( 'select', () => this.handleSelection() );

    // Monitor cursor position for spell check
    this.textarea.addEventListener( 'keyup', ( e ) => this.handleCursorMovement( e ) );
    this.textarea.addEventListener( 'click', ( e ) => this.handleCursorMovement( e ) );
  }

  handleSelection() {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const text = this.textarea.value.substring( start, end );

    this.selectedText = text;
    this.selectionStart = start;
    this.selectionEnd = end;

    // Update panel component using method instead of direct property assignment
    if ( this.panelComponent && this.panelComponent.setHasSelection ) {
      this.panelComponent.setHasSelection( text.length > 0 );
    }
  }

  handleCursorMovement( event ) {
    const cursorPos = this.textarea.selectionStart;

    // Clear previous timeout
    if ( this.spellCheckTimeout ) {
      clearTimeout( this.spellCheckTimeout );
    }

    // Debounce spell check on space or punctuation
    if ( event.key === ' ' || event.key === '.' || event.key === ',' ) {
      this.spellCheckTimeout = setTimeout( () => {
        this.checkWordAtCursor( cursorPos );
      }, 500 );
    }

    this.lastCursorPosition = cursorPos;
  }

  async checkWordAtCursor( position ) {
    const text = this.textarea.value;
    const beforeCursor = text.substring( 0, position );
    const afterCursor = text.substring( position );

    // Find word boundaries
    const wordStart = beforeCursor.search( /\S+$/ );
    const wordEndMatch = afterCursor.match( /^\S*/ );
    const wordEnd = wordEndMatch ? position + wordEndMatch[ 0 ].length : position;

    if ( wordStart === -1 ) {
      return;
    }

    const word = text.substring( wordStart, wordEnd ).trim();

    if ( word.length < 2 ) {
      return;
    }

    // Check spelling with Wanda
    try {
      const result = await this.checkSpelling( word );
      
      if ( result && result.misspelled ) {
        // Show popup with misspellings
        const coords = this.getCaretCoordinates( position );
        this.popupComponent.show( word, coords );
        this.popupComponent.setMisspellings( [ {
          word: word,
          suggestions: result.suggestions || []
        } ] );
      } else if ( result && !result.misspelled ) {
        // Word is spelled correctly, show success message
        const coords = this.getCaretCoordinates( position );
        this.popupComponent.show( word, coords );
        this.popupComponent.setSuccess( mw.message( 'wandascribe-no-spelling-errors' ).text() );
        // Auto-hide after 2 seconds
        setTimeout( () => {
          this.popupComponent.hide();
        }, 2000 );
      }
    } catch ( error ) {
      console.error( 'Spell check error:', error );
    }
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

  applySuggestion( suggestion, originalWord ) {
    if ( !suggestion ) {
      return;
    }

    let before, after, newPosition;

    if ( originalWord ) {
      const selectedText = this.textarea.value.substring( this.selectionStart, this.selectionEnd );
      const wordRegex = new RegExp( '\\b' + originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g' );
      const replacedText = selectedText.replace( wordRegex, suggestion );

      before = this.textarea.value.substring( 0, this.selectionStart );
      after = this.textarea.value.substring( this.selectionEnd );
  const newValue = before + replacedText + after;
  this.applyTextChangeWithHistory( newValue );

  newPosition = this.selectionStart + replacedText.length;
    } else {
      // For other suggestions: replace entire selection
      before = this.textarea.value.substring( 0, this.selectionStart );
      after = this.textarea.value.substring( this.selectionEnd );
  const newValue = before + suggestion + after;
  this.applyTextChangeWithHistory( newValue );

  // Update cursor position
  newPosition = this.selectionStart + suggestion.length;
    }

    this.textarea.setSelectionRange( newPosition, newPosition );
    this.textarea.focus();

    // Trigger change event for MediaWiki
    const event = new Event( 'input', { bubbles: true } );
    this.textarea.dispatchEvent( event );
  }

  /**
   * Apply text change in a way that plays nicely with the browser's
   * undo / redo stack. Where supported, use execCommand on an input
   * element so that Ctrl+Z will undo the change like a normal edit.
   *
   * Fallback to direct value assignment if execCommand is unavailable
   * or fails for any reason.
   *
   * @param {string} newValue
   */
  applyTextChangeWithHistory( newValue ) {
    try {
      this.textarea.focus();
      const supportsCommands = typeof document.queryCommandSupported === 'function';

      if ( supportsCommands && document.queryCommandSupported( 'insertText' ) ) {
        this.textarea.select();
        const ok = document.execCommand( 'insertText', false, newValue );
        if ( ok ) {
          return;
        }
      }
    } catch ( e ) {
      console.warn( 'applyTextChangeWithHistory: falling back to direct value set', e );
    }

    this.textarea.value = newValue;
  }

  getSelectionCoordinates() {
    // Get approximate coordinates for the selection
    const rect = this.textarea.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX + 20
    };
  }

  getCaretCoordinates( position ) {
    // Approximate caret position
    const rect = this.textarea.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX + 20
    };
  }
}

module.exports = EditorIntegration;
