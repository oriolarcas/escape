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


function onDialogOK() {
  var strbundle = document.getElementById('strings-addDNSServer');

  var ip = document.getElementById('dns-ip').value;
  var desc = document.getElementById('dns-desc').value;

  if (!ip) {
    alert(strbundle.getString('must-specify-ip'));
    return false;
  }
  
  var exp = "^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)" +
      "\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)" +
      "\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)" +
      "\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$";
  if (!((new RegExp(exp)).test(ip))) {
    alert(strbundle.getString('ip-invalid'));
    return false;
  }

  var retVal = window.arguments[0];

  retVal.ret = {
    ip: ip,
    desc: desc
  };

  return true;
}
