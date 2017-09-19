// Copyright (c) 2010 Moxie Marlinspike <moxie@thoughtcrime.org>
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

var escape;
var settingsManager;
var whitelist;
var hosts;
var customDNSTab;
var customDNSIndex;

function onOptionsLoad() {
  escape = Components.classes['@ant0ine.g0ich0t.fr/escape;1']
    .getService().wrappedJSObject;
  settingsManager = escape.getSettingsManager();
  whitelist = settingsManager.getWhitelist().slice(0);
  hosts = settingsManager.getHosts().slice(0);
  customDNSTab = settingsManager.getCustomDNSTab().slice(0);
  customDNSIndex = settingsManager.getCustomDNSIndex();
  updateWhitelist();
  updateHosts();
  updateDNSConfig();
}

function onOptionsSave() {
  settingsManager.setCustomSelected(
      document.getElementById('dns-conf-cust').selected); 
  settingsManager.setLocalResolutionSelected(
      document.getElementById('dns-conf-loc').selected); 
  var index = document.getElementById('dns-menulist').selectedIndex;
  settingsManager.setCustomDNSIndex(index); 
  
  settingsManager.setWhitelist(whitelist);
  settingsManager.setHosts(hosts);
  settingsManager.setCustomDNSTab(customDNSTab);
  settingsManager.savePreferences();
  return true;
}

function getWhitelistElement(str) {
  for (var i=0; i<whitelist.length; i++) {
    if (whitelist[i].regExp.test(str)) 
      return this.whitelist[i];
  }
  return null;
}

function getHostConf(str) {
  for (var i=0; i<hosts.length; i++) {
    if (hosts[i].host === str) return hosts[i];
  }
  return null;
}

function issueEscapeDisabledNotification() {
  var observerService = Components.classes['@mozilla.org/observer-service;1']
    .getService(Components.interfaces.nsIObserverService);
  observerService.notifyObservers(observerService, 
      'escape-disabled', null);
}

function onAddWhitelistElement(host, sni, encapsulation, exception) {
  var strbundle = document.getElementById('strings-opt');
  var retVal = {ret: null};
  window.openDialog(
      'chrome://escape/content/addAndEditWhitelistElement.xul', 'addwl', 
      'modal', retVal, host, sni, encapsulation, exception).focus();

  if (retVal.ret) {
    var whitelistElement = getWhitelistElement(retVal.ret.host);
    if (whitelistElement) {
      alert(strbundle.getString('wl-match') + ' ' + whitelistElement.host);
      onAddWhitelistElement(retVal.ret.host, retVal.ret.sni, 
          retVal.ret.encapsulation, retVal.ret.exception);
    } else if (!retVal.ret.sni) {
      whitelist.push(settingsManager.createWhitelistElement(retVal.ret.host,
          null, false, retVal.ret.exception));
      if (retVal.ret.encapsulation) {
        alert(strbundle.getString('no-sni'));
      }
    } else {
      whitelist.push(settingsManager.createWhitelistElement(retVal.ret.host, 
          retVal.ret.sni, retVal.ret.encapsulation, retVal.ret.exception));
    }
    updateWhitelist();
  }
}

function onEditWhitelistElement(host, sni, encapsulation, exception) {
  var strbundle = document.getElementById('strings-opt');
  var tree = document.getElementById('whitelistTree');
  var whitelistElement = whitelist[tree.currentIndex];
  var retVal = {ret: null};
  var hhost = (host)? host : whitelistElement.host;
  var ssni = (sni)? sni : whitelistElement.sni;
  var eencapsulation = (encapsulation)? encapsulation : 
    whitelistElement.encapsulation;
  var eexception = (exception)? exception : whitelistElement.exception;
  window.openDialog(
      'chrome://escape/content/addAndEditWhitelistElement.xul', 'editwl', 
      'modal', retVal, hhost, ssni, eencapsulation, eexception).focus();
  if (retVal.ret) {
    var whitelistElementKnown = getWhitelistElement(retVal.ret.host);
    if (whitelistElementKnown && whitelistElementKnown !== whitelistElement) {
      alert(strbundle.getString('wl-match') +' '+ whitelistElementKnown.host);
      onEditWhitelistElement(retVal.ret.host, retVal.ret.sni, 
          retVal.ret.encapsulation, retVal.ret.exception);
    } else if (!retVal.ret.sni) {
      whitelist[tree.currentIndex] = settingsManager
        .createWhitelistElement(retVal.ret.host);
      if (retVal.ret.encapsulation) {
        alert(strbundle.getString('no-sni'));
      }
    } else {
      whitelist[tree.currentIndex] = settingsManager.createWhitelistElement(
          retVal.ret.host, retVal.ret.sni, retVal.ret.encapsulation, 
          retVal.ret.exception);
    }
    updateWhitelist();
  }
}

function onRemoveWhitelistElement() {
  var tree = document.getElementById('whitelistTree');
  whitelist.splice(tree.currentIndex, 1);
  updateWhitelist();
}

function onClearWhitelist() {
  whitelist = [];
  updateWhitelist();
}

function updateWhitelist(sortColumn, sortDirection) {
  var tree = document.getElementById('whitelistTree');

  if (sortColumn === 'sni') {
    whitelist.sort(function (a, b) {
      if (a.sni > b.sni)
        return 1;
      if (a.sni < b.sni)
        return -1;
      return 0;
    });
  } else if (sortColumn === 'encapsulation'){
    whitelist.sort(function (a, b) {
      if (a.encapsulation > b.encapsulation)
        return 1;
      if (a.encapsulation < b.encapsulation)
        return -1;
      return 0;
    });
  } else if (sortColumn === 'exception'){
    whitelist.sort(function (a, b) {
      if (a.exception > b.exception)
        return 1;
      if (a.exception < b.exception)
        return -1;
      return 0;
    });
  } else {
    whitelist.sort(function (a, b) {
      if (a.host > b.host)
        return 1;
      if (a.host < b.host)
        return -1;
      return 0;
    });
  } 

  if (sortDirection === 'ASC') whitelist.reverse();


  tree.view = {
    rowCount: whitelist.length,

    getCellText : function(row, column) {

      if      (column.id === 'whitelist')    return whitelist[row].host;
      else if (column.id === 'sni') return whitelist[row].sni;
      else if (column.id === 'encapsulation') 
        return whitelist[row].encapsulation;
      else if (column.id === 'exception') return whitelist[row].exception;
    },

    setTree: function(treebox){this.treebox = treebox; },
    isContainer: function(row){return false;},
    isSeparator: function(row){ return false; },
    isSorted: function(){ return false; },
    isEditable: function(row, column) {return false;},
    getLevel: function(row){ return 0; },
    getImageSrc: function(row,col){ return null; },
    getRowProperties: function(row,props){},
    getCellProperties: function(row,col,props){},
    getColumnProperties: function(colid,col,props){},
    cycleHeader: function(col){}
  };
}


function sortWhitelist(column) {
  var id = column.getAttribute('id');
  var sortDirection = column.getAttribute('sortDirection');
  var sortColumn = 'host';
  
  sortDirection = (sortDirection === 'ASC')? 'DESC' : 'ASC';


  if      (id === 'whitelist')    sortColumn = 'host';
  else if (id === 'sni') sortColumn = 'sni';
  else if (id === 'encapsulation') sortColumn = 'encapsulation';
  else if (id === 'exception') sortColumn = 'exception';

  updateWhitelist(sortColumn, sortDirection);
  column.setAttribute('sortDirection', sortDirection);
}

function onAddHost(host, ip) {
  var strbundle = document.getElementById('strings-opt');
  var retVal = {ret: null};
  window.openDialog('chrome://escape/content/addAndEditHost.xul', 
      'addhost', 'modal', retVal, host, ip).focus();
 
  if (retVal.ret) {
    var hostConf = getHostConf(retVal.ret.host);
    if (hostConf) {
      alert(strbundle.getString('host-in-the-list'));
      onAddHost(retVal.ret.host, retVal.ret.ip);
    } else {
      hosts.push({"host":retVal.ret.host, "ip":retVal.ret.ip});
    }
    updateHosts();
  }
}

function onEditHost(host, ip) {
  var strbundle = document.getElementById('strings-opt');
  var tree = document.getElementById('hostsTree');
  var hostConf = hosts[tree.currentIndex];
  var retVal = {ret: null};
  var hhost = (host)? host : hostConf.host;
  var iip = (ip)? ip : hostConf.ip;
  
  window.openDialog('chrome://escape/content/addAndEditHost.xul', 
      'edithost', 'modal', retVal, hhost, iip).focus();
  if (retVal.ret) {
    var hostConfKnown = getHostConf(retVal.ret.host);
    if (hostConfKnown && hostConfKnown !== hostConf) {
      alert(strbundle.getString('host-in-the-list'));
      onEditHost(retVal.ret.host, retVal.ret.ip); 
    } else {
      hosts[tree.currentIndex] = {"host":retVal.ret.host, "ip":retVal.ret.ip};
    }
    updateHosts();
  }
}

function onRemoveHost() {
  var tree = document.getElementById('hostsTree');
  hosts.splice(tree.currentIndex, 1);
  updateHosts();
}

function onClearHost() {
  hosts = [];
  updateHosts();
}

function onAddDNSServer() {
  //var strbundle = document.getElementById('strings-opt');
  var retVal = {ret: null};
  window.openDialog('chrome://escape/content/addDNSServer.xul', 
      'adddns', 'modal', retVal).focus();
 
  if (retVal.ret) {
    var desc = retVal.ret.desc !== "" ? ' (' + retVal.ret.desc + ')' : "";
    customDNSTab.push(retVal.ret.ip + desc);
    updateDNSConfig();
    var menulistElement = document.getElementById('dns-menulist');
    menulistElement.selectedIndex = menulistElement.itemCount -1;
  }
}

function onRemoveDNSServer() {
  var menulistElement = document.getElementById('dns-menulist');
  if(menulistElement.itemCount > 1) {
    var index = menulistElement.selectedIndex;
    customDNSTab.splice(index, 1);
    updateDNSConfig();
  }
}


function updateDNSConfig() {
  if (settingsManager.isCustomSelected())
    document.getElementById('dns-conf').selectedItem = 
      document.getElementById('dns-conf-cust');
  
  if (settingsManager.isLocalResolutionSelected())
    document.getElementById('dns-conf').selectedItem = 
      document.getElementById('dns-conf-loc');

  var menupopupElement = document.getElementById('dns-menupopup');
  
  while(menupopupElement.hasChildNodes())
    menupopupElement.removeChild(menupopupElement.firstChild);
  
  var XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
  for (var i = 0; i< customDNSTab.length; i++) {
    var item = document.createElementNS(XUL_NS, "menuitem");
    item.setAttribute("label", customDNSTab[i]);
    menupopupElement.appendChild(item);
  }
  document.getElementById('dns-menulist').selectedIndex = customDNSIndex;
}

function updateHosts(sortColumn, sortDirection) {
  var tree = document.getElementById('hostsTree');

  if (sortColumn === 'ip') {
    hosts.sort(function (a, b) {
      if (a.ip > b.ip)
        return 1;
      if (a.ip < b.ip)
        return -1;
      return 0;
    });
  } else hosts.sort(function (a, b) {
      if (a.host > b.host)
        return 1;
      if (a.host < b.host)
        return -1;
      return 0;
    });

  if (sortDirection === 'ASC') hosts.reverse();


  tree.view = {
    rowCount: hosts.length,

    getCellText : function(row, column) {

      if      (column.id === 'host')    return hosts[row].host;
      else if (column.id === 'ip') return hosts[row].ip;
    },

    setTree: function(treebox){this.treebox = treebox; },
    isContainer: function(row){return false;},
    isSeparator: function(row){ return false; },
    isSorted: function(){ return false; },
    isEditable: function(row, column) {return false;},
    getLevel: function(row){ return 0; },
    getImageSrc: function(row,col){ return null; },
    getRowProperties: function(row,props){},
    getCellProperties: function(row,col,props){},
    getColumnProperties: function(colid,col,props){},
    cycleHeader: function(col){}
  };
}


function sortHosts(column) {
  var id = column.getAttribute('id');
  var sortDirection = column.getAttribute('sortDirection');
  var sortColumn = 'host';
  
  sortDirection = (sortDirection === 'ASC')? 'DESC' : 'ASC';


  if      (id === 'ip')    sortColumn = 'ip';
  else if (id === 'host') sortColumn = 'host';

  updateHosts(sortColumn, sortDirection);
  column.setAttribute('sortDirection', sortDirection);
}
