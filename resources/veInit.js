/**
 * VisualEditor bootstrap for WandaScribe.
 *
 * Loaded as a VisualEditor plugin module. When VisualEditor finishes
 * activating it mounts the same assistance panel and suggestion popup used by
 * the wikitext editor, wired up to a VisualEditor-specific integration.
 * Everything is torn down again when VisualEditor is deactivated.
 */

const Vue = require( 'vue' );
const AssistancePanel = require( './components/AssistancePanel.vue' );
const SuggestionPopup = require( './components/SuggestionPopup.vue' );
const VeIntegration = require( './veIntegration.js' );

( function () {
  'use strict';

  // Holds everything created for the current activation so it can be cleaned up.
  let active = null;

  function teardown() {
    if ( !active ) {
      return;
    }

    if ( active.integration && active.integration.destroy ) {
      active.integration.destroy();
    }
    if ( active.panelApp ) {
      active.panelApp.unmount();
    }
    if ( active.popupApp ) {
      active.popupApp.unmount();
    }
    if ( active.panelContainer && active.panelContainer.parentNode ) {
      active.panelContainer.parentNode.removeChild( active.panelContainer );
    }
    if ( active.popupContainer && active.popupContainer.parentNode ) {
      active.popupContainer.parentNode.removeChild( active.popupContainer );
    }

    document.body.classList.remove( 'wandascribe-active' );
    active = null;
  }

  function setup() {
    // Avoid double-mounting if activation fires more than once.
    if ( active ) {
      return;
    }

    const target = ve.init.target;
    if ( !target ) {
      return;
    }
    const surface = target.getSurface();
    if ( !surface ) {
      return;
    }

    // Create container for the assistance panel and insert it above the
    // editing surface.
    const panelContainer = document.createElement( 'div' );
    panelContainer.id = 'wandascribe-panel-container';
    panelContainer.className = 'wandascribe-panel-container';
    surface.$element.before( panelContainer );

    // Create container for the suggestion popup.
    const popupContainer = document.createElement( 'div' );
    popupContainer.id = 'wandascribe-popup-container';
    document.body.appendChild( popupContainer );

    const integration = new VeIntegration( target );

    const panelApp = Vue.createMwApp( AssistancePanel, {
      onActionRequested: ( actionType ) => {
        integration.handleAction( actionType );
      }
    } );
    const panelInstance = panelApp.mount( panelContainer );

    const popupApp = Vue.createMwApp( SuggestionPopup, {
      onApplySuggestion: ( suggestion, originalWord ) => {
        integration.applySuggestion( suggestion, originalWord );
      },
      onApplyAllSuggestions: ( corrections ) => {
        integration.applyAllSuggestions( corrections );
      },
      onDismissed: () => {
        // Popup already hides itself
      }
    } );
    const popupInstance = popupApp.mount( popupContainer );

    integration.setComponents( panelInstance, popupInstance );

    document.body.classList.add( 'wandascribe-active' );

    active = {
      integration: integration,
      panelApp: panelApp,
      popupApp: popupApp,
      panelContainer: panelContainer,
      popupContainer: popupContainer
    };
  }

  // ve.activationComplete fires once the surface is ready for editing.
  mw.hook( 've.activationComplete' ).add( setup );

  // Clean up when VisualEditor is closed so we don't leave a stale panel or
  // duplicate it on the next activation.
  mw.hook( 've.deactivationComplete' ).add( teardown );
}() );
