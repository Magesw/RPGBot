var cancer = {
	"a": ["&#x1F170;","&#x24B6;","&#x24D0;","&alpha;","&#xFF21;","&#xFF41;","&#x15E9;","&Delta;","&#xE04;","&alpha;","&#x3AC;","&Atilde;","&afr;","&#x1D4EA;","&ascr;","&#x1D4D0;","&#x1D400;","&#x1D41A;","&Aopf;","&aopf;","&#x1D43;","&#x250;"],
	"b": ["&#x1F171;","&#x24B7;","&#x24D1;","&vcy;","&#xFF22;","&#xFF42;","&#x15F7;","&beta;","&#xE52;","&vcy;","&vcy;","&beta;","&bfr;","&#x1D4EB;","&bscr;","&#x1D4D1;","&#x1D401;","&#x1D41B;","&Bopf;","&bopf;","&#x1D47;","q"],
	"c": ['&#x24B8;','&#x24D2;','&cent;','&#xFF23;','&#xFF43;','&#x1455;','&Cacute;','&varsigma;','&Ccaron;','&varsigma;','&cfr;','&#x1D4EC;','&cscr;','&#x1D4D2;','&#x1D402;','&#x1D41C;','&complexes;','&copf;','&#x1D9C;','&#x254;'],
	"d": ['&#x24D3;','&#x24B9;','&part;','&#xFF24;','&#xFF44;','&#x15EA;','&Dstrok;','&#xE54;','&part;','&dstrok;','&Dcaron;','&dfr;','&#x1D4ED;','&dscr;','&#x1D4D3;','&#x1D403;','&#x1D41D;','&Dopf;','&dopf;','&#x1D48;','p'],
	"e": ['&#x24BA;','&#x24D4;','&jukcy;','&#xFF25;','&#xFF45;','&#x15F4;','&euro;','&jukcy;','&epsilon;','&#x3AD;','&#x1EB8;','&efr;','&#x1D486;','&#x1D452;','&#x1D4D4;','&#x1D404;','&#x1D41E;','&Eopf;','&eopf;','&#x1D49;','&#x1DD;'],
	"f": ['&#x24BB;','&#x24D5;','&fnof;','&#xFF26;','&#xFF46;','&#x15B4;','&Fscr;','&Tstrok;','&#x493;','&#x191;','&#x493;','&ffr;','&#x1D487;','&fscr;','&#x1D4D5;','&#x1D405;','&#x1D41F;','&Fopf;','&fopf;','&#x1DA0;','&#x25F;'],

};

var helper = require("./Helper.js");
var fix = require('entities');

var cancerify = function(str){
	var x2 = "";
	for(i=0;i<str.length;i++){
		if(cancer.hasOwnProperty(str[i].toLowerCase())){
			var arr = cancer[str[i].toLowerCase()];
			x2 += fix.decodeHTML(arr[helper.rInt(0, arr.length)]);
		}else{
			x2 += str[i]; 
		} 
	}
	return x2;
}

exports.cancer = cancerify;