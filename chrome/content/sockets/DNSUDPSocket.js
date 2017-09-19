// Copyright (C) 2014 Antoine Goichot <https://github.com/goichot/>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>


/*
 * Some functions were developped by Joshua Tauberer <http://razor.occams.info>
 * https://github.com/JoshData/thunderbird-spf/blob/master/content/dns.js
 */


function DNSUDPSocket(DNSServer, port) {
  this.fd = NSPR.lib.PR_OpenUDPSocket(NSPR.lib.PR_AF_INET);

  var netAddressBuffer = NSPR.lib.PR_Malloc(1024);
  this.addr = ctypes.cast(netAddressBuffer, NSPR.types.PRNetAddr.ptr);

  var status = NSPR.lib.PR_StringToNetAddr(DNSServer, this.addr);
  if (status !== 0) throw 'Error PR_StringToNetAddr';

  status = NSPR.lib.PR_SetNetAddr(NSPR.lib.PR_IpAddrNull, NSPR.lib.PR_AF_INET, 
      port, this.addr);
  if (status !== 0) throw 'Error PR_SetNetAddr';

  this.DNSServer = DNSServer;
  this.port = port;
}

DNSUDPSocket.prototype.responseFromQuery = function(host) {
  this.query(host);
  return this.response();
};

DNSUDPSocket.prototype.query = function(host) {
  this.host = host;
//Joshua Tauberer
  var query =
    // HEADER
    "00" + // ID
    String.fromCharCode(1) + // QR=0, OPCODE=0, AA=0, TC=0, RD=1 (Recur desired)
    String.fromCharCode(0) + // all zeroes
    DNS_wordToStr(1) +       // 1 query
    DNS_wordToStr(0) +       // ASCOUNT=0
    DNS_wordToStr(0) +       // NSCOUNT=0
    DNS_wordToStr(0);        // ARCOUNT=0

  var hostparts = host.split(".");
  for (var hostpartidx = 0; hostpartidx < hostparts.length; hostpartidx++)
    query += DNS_octetToStr(hostparts[hostpartidx].length) + 
      hostparts[hostpartidx];

  query += DNS_octetToStr(0);
  query += DNS_wordToStr(1); //Recordtype :A
  query += DNS_wordToStr(1); // IN

  return this.send(query);
};

DNSUDPSocket.prototype.response = function() {
  var data = this.recv();
  var responseHeader = "";

  while (responseHeader.length < 14 && data.length > 0) {
    responseHeader += data.charAt(0);
    data = data.substr(1);
  }

  if (responseHeader.length === 14) {
    var responseBody = data;
    return this.DNS_getRDData(responseHeader + responseBody);
  } else return null;
};

DNSUDPSocket.prototype.send = function(msg) {
  return NSPR.lib.PR_SendTo(this.fd, NSPR.lib.buffer(msg), msg.length, 0, 
      this.addr, NSPR.lib.PR_INTERVAL_NO_WAIT);
};

DNSUDPSocket.prototype.recv = function(n) {
  if (typeof n === 'undefined' || n === null) n = 65507;
  else if (n <= 0) return null;

  var read, buffer = new NSPR.lib.unsigned_buffer(n);
  read = NSPR.lib.PR_RecvFrom(this.fd, buffer, n, 0, this.addr, 
      NSPR.lib.PR_INTERVAL_MAX);
  var data ='';
  for (var i = 0; i < read; i++)
    data +=String.fromCharCode(buffer[i]);

  return data;
};

DNSUDPSocket.prototype.close = function() {
  NSPR.lib.PR_Close(this.fd);
};

DNSUDPSocket.prototype.DNS_getRDData = function(str) {
//Joshua Tauberer
  var qcount = DNS_strToWord(str.substr(4, 2));
  var ancount = DNS_strToWord(str.substr(6, 2));
  var aucount = DNS_strToWord(str.substr(8, 2));
  var adcount = DNS_strToWord(str.substr(10, 2));

  var ctx = { str : str, idx : 12 };

  var i;
  var j;
  var rec;

  if (qcount !== 1)   return null;
  if (ancount > 128) return null;
  if (aucount > 128) return null;
  if (adcount > 128) return null;


  
  for (i = 0; i < qcount; i++) {
    dom = DNS_readDomain(ctx);
    type = DNS_strToWord(str.substr(ctx.idx, 2)); 
    ctx.idx += 2;
    cls = DNS_strToWord(str.substr(ctx.idx, 2)); 
    ctx.idx += 2;
  }

  var results = Array(ancount);
  for (i = 0; i < ancount; i++) {
    rec = DNS_readRec(ctx);
    if (!rec.recognized) return null;
    results[i] = rec.rddata;    
  }

  var authorities = Array(aucount);
  for (i = 0; i < aucount; i++) {
    rec = DNS_readRec(ctx);
    authorities[i] = rec;
  }
  
  for (i = 0; i < adcount; i++) {
    rec = DNS_readRec(ctx);
    if (rec.type === "A") {
      for (j = 0; j < results.length; j++) {
        if (results[j].host && results[j].host === rec.dom) {
          if (results[j].address === null) results[j].address = Array(0);
          results[j].address[results[j].address.length] = rec.rddata;
        }
      }
    }
  }
  if (results.length > 0) 
// We have an answer.
    return results;
    
   else {
    // No answer.  If there is an NS authority, recurse.
    for (var k = 0; k < aucount; k++) {
      if (authorities[k].type === "NS" && 
          authorities[k].rddata !== this.DNSServer) {
        var sock = new DNSUDPSocket(authorities[i].rddata, this.port);
        var res = sock.responseFromQuery(this.host);
        sock.close();
        results = results.concat(res);
      }
    }
    // No authority was able to help us.
    return null;
  }
};

function DNS_readDomain(ctx) {
//Joshua Tauberer
  var domainname = "";
  var ctr = 20;
  while (ctr-- > 0) {
    var l = ctx.str.charCodeAt(ctx.idx++);
    if (l === 0) break;
    
    if (domainname !== "") domainname += ".";
    
    if ((l >> 6) === 3) {
      // Pointer
      var ptr = ((l & 63) << 8) + ctx.str.charCodeAt(ctx.idx++);
      var ctx2 = { str : ctx.str, idx : ptr };
      domainname += DNS_readDomain(ctx2);
      break;
    } else {
      domainname += ctx.str.substr(ctx.idx, l);
      ctx.idx += l;
    }
  }
  return domainname;
}

function DNS_readRec(ctx) {
//Joshua Tauberer
  var rec = {};
  var ctr;
  var txtlen;
  
  rec.dom = DNS_readDomain(ctx);
  rec.type = DNS_strToWord(ctx.str.substr(ctx.idx, 2)); 
  ctx.idx += 2;
  rec.cls = DNS_strToWord(ctx.str.substr(ctx.idx, 2)); 
  ctx.idx += 2;
  rec.ttl = DNS_strToWord(ctx.str.substr(ctx.idx, 2)); 
  ctx.idx += 4; // 32bit
  rec.rdlen = DNS_strToWord(ctx.str.substr(ctx.idx, 2)); 
  ctx.idx += 2;
  rec.recognized = 1;
  
  var ctxnextidx = ctx.idx + rec.rdlen;
  
  if (rec.type === 16) {
    rec.type = "TXT";
    rec.rddata = "";
    ctr = 10;
    while (rec.rdlen > 0 && ctr-- > 0) {
      txtlen = DNS_strToOctet(ctx.str.substr(ctx.idx,1));
      ctx.idx++; 
      rec.rdlen--;
      rec.rddata += ctx.str.substr(ctx.idx, txtlen); 
      ctx.idx += txtlen; 
      rec.rdlen -= txtlen;
    }
  } else if (rec.type === 1) {
    // Return as a dotted-quad
    rec.type = "A";
    rec.rddata = ctx.str.substr(ctx.idx, rec.rdlen);
    rec.rddata = rec.rddata.charCodeAt(0) + "." + rec.rddata.charCodeAt(1) + 
      "." + rec.rddata.charCodeAt(2) + "." + rec.rddata.charCodeAt(3);
  } else if (rec.type === 15) {
    rec.type = "MX";
    rec.rddata = {};
    rec.rddata.preference = DNS_strToWord(ctx.str.substr(ctx.idx,2)); 
    ctx.idx += 2;
    rec.rddata.host = DNS_readDomain(ctx);
  } else if (rec.type === 2) {
    rec.type = "NS";
    rec.rddata = DNS_readDomain(ctx);
  } else if (rec.type === 12) {
    rec.type = "PTR";
    rec.rddata = DNS_readDomain(ctx);
  } else if (rec.type === 5) {
    rec.type = "CNAME";
    rec.rddata = ctx.str.substr(ctx.idx, rec.rdlen);
    rec.rddata = DNS_readDomain(ctx); 
  } else {
    rec.recognized = 0;
  }
  
  ctx.idx = ctxnextidx;
  
  return rec;
}

function DNS_strToWord(str) {
//Joshua Tauberer
  return str.charCodeAt(1) + (str.charCodeAt(0) << 8);
}

function DNS_strToOctet(str) {
//Joshua Tauberer
  return str.charCodeAt(0);
}

function DNS_wordToStr(word) {
//Joshua Tauberer
  return DNS_octetToStr((word >> 8) % 256) + DNS_octetToStr(word % 256);
}

function DNS_octetToStr(octet) {
//Joshua Tauberer
  return String.fromCharCode(octet);
}

DNSUDPSocket.prototype.DNS_IsDottedQuad = function(ip) {
  var exp = "^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)" +
  "\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)" +
  "\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)" +
  "\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$";
  return ((new RegExp(exp)).test(ip));
};
