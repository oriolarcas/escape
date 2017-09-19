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


/**
 * Represents an element of the whitelist
 */
function WhitelistElement(host, sni, encapsulation, exception) {
  this.host = host;
  if ((typeof sni !== 'undefined') && (sni !== null)) {
    this.sni = sni;
  } else {
    this.sni = WhitelistElement.randUrl();
    this.encapsulation = false;
    this.exception = false;
  }
  if (typeof encapsulation !== 'undefined') {
    this.encapsulation = encapsulation;
  } else {
    this.encapsulation = false;
  }
  if (typeof exception !== 'undefined') {
    this.exception = exception;
  } else {
    this.exception = false;
  }
  this.regExp = patternToRegExp(host);

}

function patternToRegExp(pattern) {
  var s = pattern;

  if ('^' === s.substr(0, 1) && '$' === s.substr(-1, 1)) {
    return new RegExp(s.substring(1, s.length - 1), 'i');
  }

  var res = "^";

  for (var i = 0 ; i < s.length ; i++) {
    switch(s[i]) {
    case "*" :
      res += ".*";
      break;

    case "." :
    case "?" :
    case "^" :
    case "$" :
    case "+" :
    case "{" :
    case "}" :
    case "[" :
    case "]" :
    case "|" :
    case "(" :
    case ")" :
    case "\\" :
      res += "\\" + s[i];
      break;

    case " " :
      break;

    default :
      res += s[i];
      break;
    }
  }
  return new RegExp(res + "$",'i');
}

WhitelistElement.randUrl = function() {
  return rand() + randTld();
};

var rand = function() {
  return Math.random().toString(36).substr(2);
};

var randTld = function() {
  var tlds = ['.ac','.academy','.accountants','.active','.actor','.ad','.ae',
    '.aero','.af','.ag','.agency','.ai','.airforce','.al','.am','.an','.ao',
    '.aq','.ar','.archi','.army','.arpa','.as','.asia','.associates','.at',
    '.attorney','.au','.audio','.autos','.aw','.ax','.axa','.az','.ba','.bar',
    '.bargains','.bayern','.bb','.bd','.be','.beer','.berlin','.best','.bf',
    '.bg','.bh','.bi','.bid','.bike','.bio','.biz','.bj','.bl','.black',
    '.blackfriday','.blue','.bm','.bmw','.bn','.bo','.boutique','.bq','.br',
    '.brussels','.bs','.bt','.build','.builders','.buzz','.bv','.bw','.by',
    '.bz','.bzh','.ca','.cab','.camera','.camp','.capetown','.capital','.cards',
    '.care','.career','.careers','.cash','.cat','.catering','.cc','.cd',
    '.center','.ceo','.cf','.cg','.ch','.cheap','.christmas','.church','.ci',
    '.citic','.ck','.cl','.claims','.cleaning','.clinic','.clothing','.club',
    '.cm','.cn','.co','.codes','.coffee','.college','.cologne','.com',
    '.community','.company','.computer','.condos','.construction','.consulting',
    '.contractors','.cooking','.cool','.coop','.country','.cr','.credit',
    '.creditcard','.cruises','.cu','.cv','.cw','.cx','.cy','.cz','.dance',
    '.dating','.de','.degree','.democrat','.dental','.dentist','.desi',
    '.diamonds','.digital','.direct','.directory','.discount','.dj','.dk','.dm',
    '.dnp','.do','.domains','.durban','.dz','.ec','.edu','.education','.ee',
    '.eg','.eh','.email','.engineer','.engineering','.enterprises','.equipment',
    '.er','.es','.estate','.et','.eu','.eus','.events','.exchange','.expert',
    '.exposed','.fail','.farm','.feedback','.fi','.finance','.financial',
    '.fish','.fishing','.fitness','.fj','.fk','.flights','.florist','.fm','.fo',
    '.foo','.foundation','.fr','.frogans','.fund','.furniture','.futbol','.ga',
    '.gal','.gallery','.gb','.gd','.ge','.gf','.gg','.gh','.gi','.gift',
    '.gives','.gl','.glass','.global','.globo','.gm','.gmo','.gn','.gop','.gov',
    '.gp','.gq','.gr','.graphics','.gratis','.green','.gripe','.gs','.gt','.gu',
    '.guide','.guitars','.guru','.gw','.gy','.hamburg','.haus','.hiphop','.hiv',
    '.hk','.hm','.hn','.holdings','.holiday','.homes','.horse','.host','.house',
    '.hr','.ht','.hu','.id','.ie','.il','.im','.immobilien','.in','.industries',
    '.info','.ink','.institute','.insure','.int','.international',
    '.investments','.io','.iq','.ir','.is','.it','.je','.jetzt','.jm','.jo',
    '.jobs','.joburg','.jp','.juegos','.kaufen','.ke','.kg','.kh','.ki','.kim',
    '.kitchen','.kiwi','.km','.kn','.koeln','.kp','.kr','.kred','.kw','.ky',
    '.kz','.la','.land','.lawyer','.lb','.lc','.lease','.li','.life',
    '.lighting','.limited','.limo','.link','.lk','.loans','.london','.lotto',
    '.lr','.ls','.lt','.lu','.luxe','.luxury','.lv','.ly','.ma','.maison',
    '.management','.mango','.market','.marketing','.mc','.md','.me','.media',
    '.meet','.menu','.mf','.mg','.mh','.miami','.mil','.mini','.mk','.ml','.mm',
    '.mn','.mo','.mobi','.moda','.moe','.monash','.mortgage','.moscow',
    '.motorcycles','.mp','.mq','.mr','.ms','.mt','.mu','.museum','.mv','.mw',
    '.mx','.my','.mz','.na','.nagoya','.name','.navy','.nc','.ne','.net',
    '.neustar','.nf','.ng','.nhk','.ni','.ninja','.nl','.no','.np','.nr','.nu',
    '.nyc','.nz','.okinawa','.om','.onl','.org','.organic','.pa','.paris',
    '.partners','.parts','.pe','.pf','.pg','.ph','.photo','.photography',
    '.photos','.physio','.pics','.pictures','.pink','.pk','.pl','.place',
    '.plumbing','.pm','.pn','.post','.pr','.press','.pro','.productions',
    '.properties','.ps','.pt','.pub','.pw','.py','.qa','.qpon','.quebec','.re',
    '.recipes','.red','.rehab','.reise','.reisen','.ren','.rentals','.repair',
    '.report','.republican','.rest','.reviews','.rich','.rio','.ro','.rocks',
    '.rodeo','.rs','.ru','.ruhr','.rw','.ryukyu','.sa','.saarland','.sb','.sc',
    '.schule','.scot','.sd','.se','.services','.sg','.sh','.shiksha','.shoes',
    '.si','.singles','.sj','.sk','.sl','.sm','.sn','.so','.social','.software',
    '.sohu','.solar','.solutions','.soy','.space','.sr','.ss','.st','.su',
    '.supplies','.supply','.support','.surf','.surgery','.suzuki','.sv','.sx',
    '.sy','.systems','.sz','.tattoo','.tax','.tc','.td','.technology','.tel',
    '.tf','.tg','.th','.tienda','.tips','.tirol','.tj','.tk','.tl','.tm','.tn',
    '.to','.today','.tokyo','.tools','.town','.toys','.tp','.tr','.trade',
    '.training','.travel','.tt','.tv','.tw','.tz','.ua','.ug','.uk','.um',
    '.university','.uno','.us','.uy','.uz','.va','.vacations','.vc','.ve',
    '.vegas','.ventures','.versicherung','.vet','.vg','.vi','.viajes','.villas',
    '.vision','.vlaanderen','.vn','.vodka','.vote','.voting','.voto','.voyage',
    '.vu','.wang','.watch','.webcam','.website','.wed','.wf','.wien','.wiki',
    '.works','.ws','.wtc','.wtf','.xyz','.yachts','.ye','.yokohama','.yt','.za',
    '.zm','.zone','.zw'];

  var i = Math.floor(Math.random() * tlds.length);

  return tlds[i];
};
