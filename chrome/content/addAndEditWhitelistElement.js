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


function onDialogLoad() {
  var host = document.getElementById('host');
  var sni = document.getElementById('sni');
  var encapsulation = document.getElementById('encapsulation');
  var exception = document.getElementById('exception');
  host.value = (window.arguments[1])? window.arguments[1] : '';
  sni.value =  (window.arguments[2])? window.arguments[2] : '';
  encapsulation.checked =  (window.arguments[3])? window.arguments[3] : false;
  exception.checked =  (window.arguments[4])? window.arguments[4] : false;
}


function onDialogOK() {
  var strbundle = document.getElementById('strings-addAndEditWLElment');

  var host = document.getElementById('host').value;
  var sni = document.getElementById('sni').value;
  var encapsulation = document.getElementById('encapsulation').checked;
  var exception = document.getElementById('exception').checked;

  if (!host) {
    alert(strbundle.getString('must-specify-host'));
    return false;
  }
  

  var retVal = window.arguments[0];

  retVal.ret = {
    host: host,
    sni: sni,
    encapsulation: encapsulation,
    exception: exception
  };

  return true;
}
