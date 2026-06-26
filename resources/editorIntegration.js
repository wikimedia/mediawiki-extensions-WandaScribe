/**
 * Editor integration module for WandaScribe
 * Handles text selection, spell checking, and interaction with the wikitext editor
 */

const EditorIntegrationBase = require( './editorIntegrationBase.js' );

class EditorIntegration extends EditorIntegrationBase {
  constructor( textarea ) {
    super();
    this.textarea = textarea;
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.lastCursorPosition = 0;
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
