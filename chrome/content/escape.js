// Copyright (c) 2011 Moxie Marlinspike <moxie@thoughtcrime.org>
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation; either version 3 of the
// License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
// USA

/*
 * Contributors : 
 * Moxie Marlinspike <moxie@thoughtcrime.org>
 * Mike Kazantsev <http://fraggod.net>
 * Antoine Goichot <https://github.com/goichot/>
 */

/**
  * This class is the main entrypoint for the Escape front-end.
  * It is responspible for kicking off the back-end, and initializing
  * the front end visual components.
  *
  **/

Components.utils.import('resource://gre/modules/NetUtil.jsm');
Components.utils.import('resource://gre/modules/ctypes.jsm');

var Escape = {

  escapeManager: null,

  onLoad: function(event) {
    this.installToolbarIcon();
    this.initializeEscapeManager();
    this.initializeNSSAndNSPR();
    this.updateLocalStatus();
    this.initializeTabWatcher();
    this.initializeObserver();
  },

  displayCertificate: function() {
    var host = gBrowser.selectedBrowser.currentURI.host;
    var ptr = this.escapeManager.certificateManager.originalCerts[host];
    var certificate = Serialization.deserializeCERTCertificate(ptr);
    var base64CertData = CertificateInfo.encodeOriginalCertificate(certificate);
    var x509CertDB = Components.classes["@mozilla.org/security/x509certdb;1"]
      .getService(Components.interfaces.nsIX509CertDB);
    var x509Cert = x509CertDB.constructX509FromBase64(base64CertData);
    var cd = Components.classes["@mozilla.org/nsCertificateDialogs;1"]
      .getService(Components.interfaces.nsICertificateDialogs);
    cd.viewCert(window, x509Cert);
  },

  initializeTabWatcher: function() {
    var container = gBrowser.tabContainer;
    var escape = this;

    container.addEventListener('TabSelect', function(event) {
        CV9BLog.ui('On tab selected...');
        try {
          try {
            var host = gBrowser.selectedBrowser.currentURI.host;
            document.getElementById('display-cert-label').collapsed = 
              (typeof escape.escapeManager.certificateManager
                  .originalCerts[host] === 'undefined');
          } catch(e) {
            document.getElementById('display-cert-label').collapsed = "true";
          }
        } catch (e) { CV9BLog.ui.error(e); }
      }, false);
  },

  initializeEscapeManager: function() {
    this.escapeManager = 
      Components.classes['@ant0ine.g0ich0t.fr/escape;1']
    .getService().wrappedJSObject;
  },
  
  initializeNSSAndNSPR: function() {
    NSS.initialize(this.escapeManager.nssFile.path);
    NSPR.initialize(this.escapeManager.nsprFile.path);
  },

  initializeObserver: function() {
    var observerService = Components.classes['@mozilla.org/observer-service;1']
    .getService(Components.interfaces.nsIObserverService);

    observerService.addObserver(this, 'extension-disabled', false);
  },


  observe: function(subject, topic, data) {
    CV9BLog.ui('Observe called!');
    if (topic === 'extension-disabled') {
      this.setDisabledStatus();
    }
  },

  onToolBarClick: function(event) {
    if (event.target.id === 'escape-button' ||
        event.target.id === 'escape-menu-toggle')
    {
      CV9BLog.ui('onToolBarClick');
      this.updateSystemStatus();
      this.updateLocalStatus();
    }

  },

  onContentLoad: function(event) {
    try {
      var host = gBrowser.selectedBrowser.currentURI.host;
      document.getElementById('display-cert-label').collapsed = 
        (typeof this.escapeManager.certificateManager
            .originalCerts[host] === 'undefined');
    } catch(e) {}
  },

  updateSystemStatus: function() {
    this.escapeManager.setEnabled(!this.escapeManager.isEnabled());
  },

  updateLocalStatus: function() {
    if (this.escapeManager.isEnabled())
      this.setEnabledStatus();
    else
      this.setDisabledStatus();
  },

  setEnabledStatus: function() {
    var strbundle = document.getElementById('strings-main');
    document.getElementById('escape-menu-toggle').label = 
      strbundle.getString('menu-toggle-disable');
    document.getElementById('escape-button').image = 
      'chrome://escape/content/images/status-enabled.png';
  },

  setDisabledStatus: function() {
    var strbundle = document.getElementById('strings-main');
    document.getElementById('escape-menu-toggle').label = 
      strbundle.getString('menu-toggle-enable');
    document.getElementById('escape-button').image = 
      'chrome://escape/content/images/status-disabled.png';
  },

  installToolbarIcon: function() {
    var toolbutton = document.getElementById('escape-button');
    if (toolbutton && toolbutton.parentNode.localName !== 'toolbarpalette')
      return;

    var toolbar = document.getElementById('nav-bar');
    if (!toolbar || typeof toolbar.insertItem !== 'function')
      return;

    toolbar.insertItem('escape-button', null, null, false);
    toolbar.setAttribute('currentset', toolbar.currentSet);
    document.persist(toolbar.id, 'currentset');
  },
};

window.addEventListener('load', function(e) { Escape.onLoad(e); }, false);
window.document.addEventListener('DOMContentLoaded', 
    function(e) {Escape.onContentLoad(e);}, true);
