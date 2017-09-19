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
  * This class manages the current Escape settings
  * It serializes settings
  * to and from disk, and hands out configuration information to the
  * running process.
  *
  **/


function SettingsManager() {
  this.enabled = true;
  this.customDNSTab = ["8.8.8.8 (Google Primary DNS Server)",
                       "8.8.4.4 (Google Secondary DNS Server)",
                       "208.67.222.222 (OpenDNS Primary DNS Server)",
                       "208.67.220.220 (OpenDNS Secondary DNS Server)",
                       "216.146.35.35 (DynDNS Secondary DNS Server)",
                       "216.146.36.36 (DynDNS Secondary DNS Server)"];
  this.customSelected = false;
  this.localResolutionSelected = false;
  this.customDNSIndex = 0;
  this.whitelist = [];
  this.whitelist.push(
      new WhitelistElement("*youtube.com*", "mail.google.com", true));
  this.whitelist.push(new WhitelistElement("*facebook.com*"));
  this.whitelist.push(new WhitelistElement("*google.fr*"));
  this.whitelist.push(
      new WhitelistElement("^(.*\\.)?addons\\.mozilla\\.org.*$"));

  this.hosts = [{"host":"facebook.com", "ip":"173.252.110.27"},
                {"host":"twitter.com", "ip":"199.16.156.6"},
                {"host":"dropbox.com", "ip":"108.160.165.62"}
               ];

  Components.classes['@mozilla.org/security/x509certdb;1']
    .getService(Components.interfaces.nsIX509CertDB);

  this.loadPreferences();
}

SettingsManager.prototype.isEnabled = function() {
  return this.enabled;
};

SettingsManager.prototype.setEnabled = function(val) {
  this.enabled = val;
};

SettingsManager.prototype.isCustomSelected = function() {
  return this.customSelected;
};

SettingsManager.prototype.setCustomSelected = function(val) {
  this.customSelected = val;
};

SettingsManager.prototype.isLocalResolutionSelected = function() {
  return this.localResolutionSelected;
};

SettingsManager.prototype.setLocalResolutionSelected = function(val) {
  this.localResolutionSelected = val;
};

SettingsManager.prototype.getCustomDNSTab = function() {
  return this.customDNSTab;
};

SettingsManager.prototype.setCustomDNSTab = function(val) {
  this.customDNSTab = val;
};

SettingsManager.prototype.getCustomDNSIndex = function() {
  return this.customDNSIndex;
};

SettingsManager.prototype.setCustomDNSIndex = function(val) {
  this.customDNSIndex = val;
};

SettingsManager.prototype.getCustomDNS = function() {
  return this.customDNSTab[this.customDNSIndex];
};

SettingsManager.prototype.getHosts = function(val) {
  return this.hosts;
};

SettingsManager.prototype.setHosts = function(val) {
  this.hosts = val;
};

SettingsManager.prototype.setWhitelist = function(whitelist) {
  this.whitelist = whitelist;
};

SettingsManager.prototype.getWhitelist = function() {
  return this.whitelist;
};

SettingsManager.prototype.createWhitelistElement = function(host, sni, 
    encapsulation, exception) {
  return new WhitelistElement(host, sni, encapsulation, exception);
};

SettingsManager.prototype.getWhitelistElement = function(str) {
  for (var i=0; i<this.whitelist.length; i++) {
    if (this.whitelist[i].regExp.test(str)) return this.whitelist[i];
  }
  return null;
};

SettingsManager.prototype.getHostConf = function(str) {
  for (var i=0; i<this.hosts.length; i++) {
    if (this.hosts[i].host === str) return this.hosts[i];
  }
  return null;
};

SettingsManager.prototype.getSettingsFile = function() {
  var directoryService = 
    Components.classes['@mozilla.org/file/directory_service;1']
  .getService(Components.interfaces.nsIProperties);

  var file = directoryService.get('ProfD', Components.interfaces.nsIFile);
  file.append('escape.xml');

  return file;
};

SettingsManager.prototype.getSettingsInputStream = function(file) {
  var inputStream = 
    Components.classes['@mozilla.org/network/file-input-stream;1']
  .createInstance(Components.interfaces.nsIFileInputStream);
  inputStream.init(file, -1, -1, 
      Components.interfaces.nsIFileInputStream.CLOSE_ON_EOF);

  return inputStream;
};

SettingsManager.prototype.getSettingsOutputStream = function() {
  var file = this.getSettingsFile();
  var outputStream = 
    Components.classes['@mozilla.org/network/file-output-stream;1']
  .createInstance(Components.interfaces.nsIFileOutputStream);
  outputStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
  return outputStream;
};

SettingsManager.prototype.getInputSettingsObject = function() {
  var file = this.getSettingsFile();
  if (!file.exists()) return null;

  var inputStream = this.getSettingsInputStream(file);
  var parser = Components.classes['@mozilla.org/xmlextras/domparser;1']
  .createInstance(Components.interfaces.nsIDOMParser);
  var object = parser.parseFromStream(inputStream, null, 
      file.fileSize, 'text/xml');
  if (!object || object.documentElement.nodeName === 'parsererror') return null;

  return object;
};

SettingsManager.prototype.savePreferences = function() {
  var outputStream = this.getSettingsOutputStream();
  var serializer = Components.classes['@mozilla.org/xmlextras/xmlserializer;1']
  .createInstance(Components.interfaces.nsIDOMSerializer);
  var xmlDocument = Components.classes['@mozilla.org/xml/xml-document;1']
  .createInstance(Components.interfaces.nsIDOMDocument);

  var rootElement = xmlDocument.createElement('escape');
  rootElement.setAttribute('enabled', this.enabled);
  
  rootElement.setAttribute('isCustomSelected', this.customSelected);
  rootElement.setAttribute('isLocalResolutionSelected', 
      this.localResolutionSelected);
  rootElement.setAttribute('customDNSIndex', this.customDNSIndex);
  
  var xmlWhitelistElement = xmlDocument.createElement('whitelist');
  rootElement.appendChild(xmlWhitelistElement);

  for (var i=0; i<this.whitelist.length; i++) {
    var element = xmlDocument.createElement('whitelistElement');
    element.setAttribute('host', this.whitelist[i].host);
    element.setAttribute('sni',  this.whitelist[i].sni);
    element.setAttribute('encapsulation',  this.whitelist[i].encapsulation);
    element.setAttribute('exception',  this.whitelist[i].exception);

    xmlWhitelistElement.appendChild(element);
  }
  
  var hostsElement = xmlDocument.createElement('hosts');
  rootElement.appendChild(hostsElement);

  for (i=0; i<this.hosts.length; i++) {
    var elm = xmlDocument.createElement('hostsElement');
    elm.setAttribute('host', this.hosts[i].host);
    elm.setAttribute('ip',  this.hosts[i].ip);

    hostsElement.appendChild(elm);
  }
  
  var customDNSTabElm = xmlDocument.createElement('customsDNS');
  rootElement.appendChild(customDNSTabElm);

  for (i=0; i<this.customDNSTab.length; i++) {
    var elmt = xmlDocument.createElement('customDNS');
    elmt.setAttribute('value', this.customDNSTab[i]);

    customDNSTabElm.appendChild(elmt);
  }

  outputStream.write('<?xml version="1.0" encoding="UTF-8"?>\n', 39);
  serializer.serializeToStream(rootElement, outputStream, 'UTF-8');
};

SettingsManager.prototype.loadPreferences = function() {
  var settings = this.getInputSettingsObject();
  if (settings) {
    var rootElement = settings.getElementsByTagName('escape');
    this.enabled = (rootElement.item(0).getAttribute('enabled') === 'true');
    
    this.customSelected = (
        rootElement.item(0).getAttribute('isCustomSelected') === 'true');
    this.localResolutionSelected = (
        rootElement.item(0).
        getAttribute('isLocalResolutionSelected') === 'true');
    this.customDNSIndex = parseInt(
        rootElement.item(0).getAttribute('customDNSIndex'),10);

    var xmlWhitelistElement = settings.getElementsByTagName('whitelistElement');

    if (xmlWhitelistElement.length !== 0) {
      this.whitelist = [];
      for (var i=0;i<xmlWhitelistElement.length;i++) {
        var element = xmlWhitelistElement.item(i);
        var host = element.getAttribute('host');
        var sni = element.getAttribute('sni');
        var encapsulation = (element.getAttribute('encapsulation') === 'true');
        var exception = (element.getAttribute('exception') === 'true');

        var whitelistElement = new WhitelistElement(host, sni, encapsulation, 
            exception);

        this.whitelist.push(whitelistElement);
      }
    }
    
    var hostsElements = settings.getElementsByTagName('hostsElement');

    if (hostsElements.length !== 0) {
      this.hosts = [];
      for (var k=0; k<hostsElements.length; k++) {
        var elm = hostsElements.item(k);
        var h = elm.getAttribute('host');
        var ip = elm.getAttribute('ip');

        this.hosts.push({"host":h, "ip":ip});
      }
    }
    
    var customDNSElements = settings.getElementsByTagName('customDNS');

    if (customDNSElements.length !== 0) {
      this.customDNSTab = [];
      for (var j=0; j < customDNSElements.length; j++) {
        this.customDNSTab.push(customDNSElements.item(j).getAttribute('value'));
      }
    } else this.customDNSIndex = 0;
  }
};
