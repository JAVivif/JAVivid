const btSites = [  {    domain: 'sukebei.nyaa.si',    name: 'Sukebei',    icon: 'https://\${domain}/static/favicon.png',    q: (q = '') => `https://\${domain}/?q=${q}&s=seeders`  },  {    domain: 'bthub29.xyz',    originalDomain: 'bthub.best',    name: 'BTHub',    icon: 'https://raw.githubusercontent.com/fwonggh/\${name}/master/favicon.ico',    q: (q = '') => `https://\${domain}/search/kw-${q}-1.html`,    renew: 'https://github.com/fwonggh/Bthub'  }]
;
const streamSites = [  { site: 'JAVGG.NET', name: 'JAVGG', webmaster: 'Thai', type: 'stream(fast-very),download', icon: 'https://javgg.net/wp-content/uploads/2020/07/140_Gg_logo_logos-512.png' },  { site: 'Jav.Guru', name: 'Jav Guru', type: 'stream(fast-very[FE]),download', icon: 'https://cdn.javsts.com/wp-content/uploads/2016/09/favicon.ico' },  { site: 'KissJAV.com', GFWed: true, type: 'stream,download(nr:login)' }]streamSites['dont fetch'] ={  'Slightly less resources': [    { site: 'JAV.LA', name: 'JAV.LA', type: 'stream(nr:tooManyADs),download', icon: 'https://jav.la/favicon-32x32.png' },    { site: 'SexTop.net', name: 'SEXTOP', webmaster: 'Vietnam', type: 'stream(fast-very),download', icon: 'https://sextop.net/wp-content/uploads/2018/11/icon.png' },    { site: 'nurupaul.com', name: 'NuruPaul', lang: 'Thai', borrow: 'SexTop.net', type: 'stream,download', icon: 'https://nurupaul.com/wp-content/uploads/2020/09/cropped-nuru_favicon00-08-32x32.png' }  ],  'Few resources': [    { site: 'JavyNow.com', type: 'stream(fast-very)' },    { site: 'JavSin.tv', type: 'stream(nr:slow)' }  ],  'Mirror sites': [    { site: 'JavDoe.tv', type: 'stream(nr:slow),download' },    { site: 'JAVFree.la', name: 'JAVFree.la', aff: 'JAV.LA', type: 'stream(nr:slow),download' },    { site: 'JAVFree.sh', name: 'JAVFree.sh', aff: 'JAV.LA', type: 'stream(nr:slow),download' }  ],  'Deteriorated': [    { site: 'HPJAV.tv', type: 'stream(AdBlock),download(AdBlock)' }  ]}
;
const proxyURLs = [...new Set([  '',  '',])].filter(Boolean)const URLForExRules = [  ''].filter(Boolean)
;
let localExRulesTextlocalExRulesText = `Updated on: 2020-06-08 17:52:44------------------------------------------------By Studio---------# Alice JAPAN  { DV(|AJ) } -> ,53;# CORE  { COR(B|E) } -> ,h_240;# EROTICA  { SERO } -> h_422;# Freedom  { NFDM } -> h_188;# Glory Quest  { GVG } -> 13;# h.m.p  { HODV } -> 5642, 41;# I.B.WORKS  { IBW } -> 504;# Janes  { DJSD } -> 29;# K M Produce  { UMSO } -> 84;# Max A  { SBMX, XV } -> 60;# MAXING  { MX(BD|GS) } -> h_068;# Media Brand  { SOPD } -> 301;# Media Station  { MDTM } -> 61;# Momotaro Eizo  { OPD } -> 15;# NCTR  { TRST } -> 5141;# NON  { Y(SN|TR) } -> h_127;# Orga  { TAMM } -> h_771;# Prestige  { AB(P|S), AKA, BLO, D(OM|TT), ERM, HAR, HCM, INU, JBS, KRVS, LLR, MAS, ONEZ, WPC } -> 118;# Real Works  { XRW } -> 172;# Scoop  { SC(OP|PX|VR) } -> h_565;# SOD Create  { DANDY, FAA, FSET, HAVD, HBAD, NHDTA, SD(ABP|MU), SSR, STAR, SW } -> 1;# TMA  { 26ID, T28 } -> 55  { ID } -> 5526;# U & K  { AUKG } -> 23;# V&R PRODUCE  { VR(TM|VR) } -> h_910  { VSPDS } -> 1;# Wanz Factory  { WANZ } -> ,3;;------------------------------------------------------------------------By Nav Label------------Amateur Girls:# S-Cute  { KIRAY, S(-|)CUTE } -> ::amateur  { SQTE } -> h_229, ::video;;------------------------------------------------------------------------Block list----------**** Do not include any of the following! ****# Tokyo Onko`