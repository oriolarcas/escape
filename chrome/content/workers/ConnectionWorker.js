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
 * Antoine GOICHOT <https://github.com/goichot/>
 */

/**
  * This ChromeWorker is responsible for establishing an SSL connection
  * to the destination server, validating the target's SSL certificate
  * and then establishing an SSL connection with the client.
  *
  * It then passes off the pair of established connections to its parent,
  * which hands them to the ShuffleWorker for all further shuffling.
  *
  * This is setup by the ConnectionManager in 'components.'
  *
  **/

importScripts(
  'chrome://escape/content/Logger.js',
  'chrome://escape/content/ctypes/NSPR.js',
  'chrome://escape/content/ctypes/NSS.js',
  'chrome://escape/content/ctypes/SSL.js',
  'chrome://escape/content/ctypes/Serialization.js',
  'chrome://escape/content/sockets/ServerSocket.js',
  'chrome://escape/content/sockets/ClientSocket.js',
  'chrome://escape/content/sockets/DNSUDPSocket.js',
  'chrome://escape/content/proxy/HttpProxyServer.js',
  'chrome://escape/content/ssl/CertificateInfo.js',
  'chrome://escape/content/ssl/CertificateManager.js');

function sendClientResponse(localSocket, certificateManager, certificateInfo) {
  localSocket.writeBytes(
      NSPR.lib.buffer('HTTP/1.1 200 Connection established\r\n\r\n'), 39);
  localSocket.negotiateSSL(certificateManager, certificateInfo);
}

onmessage = function(event) {
  var localSocket = null;
  var targetSocket = null;

  try {
    if (typeof event.data.logging === 'boolean') 
      CV9BLog.print_all = event.data.logging;

    CV9BLog.worker_conn('Got message...');

    NSPR.initialize(event.data.nsprFile);
    NSS.initialize(event.data.nssFile);
    SSL.initialize(event.data.sslFile);

    var certificateManager = new CertificateManager(event.data.certificates);
    localSocket = new ServerSocket(null, event.data.clientSocket);
    var destination = new HttpProxyServer(localSocket).getConnectDestination();

    var ip = event.data.directIP;

    if (ip === null && event.data.isCustomSelected) {
      var dnsSocket = new DNSUDPSocket(event.data.customDNS, 53);
      var dst = destination.host;
      if (event.data.encapsulation) dst = event.data.sni;
      var result = dnsSocket.responseFromQuery(dst);
      dnsSocket.close();
      if (result !== null) {
        for (var i = 0; i < result.length; i++) {
          if (dnsSocket.DNS_IsDottedQuad(result[i])) {
            ip = result[i];
            break;
          }
        }
      }
    }

    if (event.data.encapsulation)
      targetSocket = new ClientSocket(event.data.sni, destination.port, ip);
    else 
      targetSocket = new ClientSocket(destination.host, destination.port, ip);
    
    var dest = event.data.sni !== null ? event.data.sni : destination.host;
    var certificate = targetSocket.negotiateSSL(dest);
    var certificateInfo = new CertificateInfo(certificate);

    var results = {
      'status' : true,
      'target' : destination.host + ':' + destination.port
    };

    // Such override allows totally invalid certificates to be used,
    //  e.g. if CN and SubjectAltNames had nothing to do with the hostname/ip.
    if (event.data.encapsulation || event.data.exception) {
      certificateInfo.commonName = new NSS.lib.buffer(destination.host);
      certificateInfo.altNames = null;
    }

    certificateInfo.encodeVerificationDetails(results);

    this.sendClientResponse(localSocket, certificateManager, certificateInfo);
    postMessage({
      'clientFd' : Serialization.serializePointer(localSocket.fd),
      'serverFd' : Serialization.serializePointer(targetSocket.fd),
      'host' : destination.host,
      'cert' : Serialization.serializePointer(certificate) 
    });

    CV9BLog.worker_conn('Done');
  } catch (e) {
    CV9BLog.worker_conn.error(e);
    if (localSocket !== null) localSocket.close();
    if (targetSocket !== null) targetSocket.close();
    CV9BLog.worker_conn('Moving on from exception...');
  }
};
