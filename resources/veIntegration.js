/**
 * VisualEditor integration module for WandaScribe.
 *
 * Mirrors the wikitext textarea integration but operates on the VisualEditor
 * surface model instead of a <textarea>. Selections are read from the surface
 * fragment and suggestions are applied as VisualEditor transactions so that
 * they participate in VisualEditor's own undo / redo history.
 *
 * Note: VisualEditor documents are rich (annotations, links, templates), but
 * WandaScribe works on plain text. Suggestions are therefore inserted as plain
 * text, which means any annotations within the replaced range are dropped.
 * This is an acceptable trade-off for a writing assistant; rich-content aware
 * replacement is intentionally out of scope.
 */

const EditorIntegrationBase = require( './editorIntegrationBase.js' );

class VeIntegration extends EditorIntegrationBase {
  /**
   * @param {ve.init.Target} target The active VisualEditor target
   */
  constructor( target ) {
    super();
    this.target = target;
    // Fragment representing the selection at the time an action was triggered.
    // VisualEditor fragments auto-adjust through later transactions, so this
    // stays valid even after the document is edited.
    this.selectionFragment = null;
    this.onSelect = null;
  }

  getSurfaceModel() {
    const surface = this.target.getSurface();
    return surface ? surface.getModel() : null;
  }

  init() {
    const surfaceModel = this.getSurfaceModel();
    if ( !surfaceModel ) {
      return;
    }

    // Keep the selected text / fragment in sync with the surface selection.
    this.onSelect = () => this.handleSelection();
    surfaceModel.on( 'select', this.onSelect );

    // Initialise from the current selection (usually empty).
    this.handleSelection();
  }

  /**
   * Detach surface listeners. Called when VisualEditor is deactivated.
   */
  destroy() {
    const surfaceModel = this.getSurfaceModel();
    if ( surfaceModel && this.onSelect ) {
      surfaceModel.off( 'select', this.onSelect );
    }
    this.onSelect = null;
    if ( this.spellCheckTimeout ) {
      clearTimeout( this.spellCheckTimeout );
    }
  }

  handleSelection() {
    const surfaceModel = this.getSurfaceModel();
    if ( !surfaceModel ) {
      return;
    }

    const fragment = surfaceModel.getFragment();
    const text = fragment.getText();

    this.selectionFragment = fragment;
    this.selectedText = text;

    if ( this.panelComponent && this.panelComponent.setHasSelection ) {
      this.panelComponent.setHasSelection( text.length > 0 );
    }
  }

  applySuggestion( suggestion, originalWord ) {
    if ( !suggestion || !this.selectionFragment ) {
      return;
    }

    let newText;
    if ( originalWord ) {
      // Replace only the misspelled word(s) within the selected text.
      const wordRegex = new RegExp( '\\b' + originalWord.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) + '\\b', 'g' );
      newText = this.selectionFragment.getText().replace( wordRegex, suggestion );
    } else {
      // Replace the entire selection.
      newText = suggestion;
    }

    // Insert as plain text and leave the cursor after the inserted content.
    // insertContent() goes through the surface model, so the change is
    // undoable via VisualEditor's history.
    this.selectionFragment.insertContent( newText );
    this.selectionFragment.collapseToEnd().select();

    // Refresh our tracked selection to match the new cursor position.
    this.handleSelection();

    const surface = this.target.getSurface();
    if ( surface && surface.getView() ) {
      surface.getView().focus();
    }
  }

  getSelectionCoordinates() {
    // Approximate: anchor the popup to the surface element, matching the
    // wikitext integration's behaviour. (A pixel-accurate selection rectangle
    // is not needed for the popup and the surface element is always present.)
    const surface = this.target.getSurface();
    const view = surface ? surface.getView() : null;

    if ( view && view.$element && view.$element[ 0 ] ) {
      const rect = view.$element[ 0 ].getBoundingClientRect();
      return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + 20
      };
    }

    return { top: window.scrollY + 20, left: window.scrollX + 20 };
  }
}

module.exports = VeIntegration;
