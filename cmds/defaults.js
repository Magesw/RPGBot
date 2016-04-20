/*

 Copyright Mackan90096 and Sven65 [thormax5@gmail.com]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

*/

var helper = require("../util/Helper.js");
var fs = require("fs");
var filter = require('fuzzaldrin');

var settings = require("../settings.json");
var users = require("../data/users.json");
var items = require("../data/items.json");
var mobs = require("../data/mobs.json");


var itmObj = [];

for(i=0;i<Object.keys(items).length;i++){
	itmObj.push(items[Object.keys(items)[i]]);
}

var adventures = {};

function createAdventure(user){
	var usr = users[user];
	var level = usr["level"];

	if(level > mobs["maxlevel"]){
		level = helper.rInt(1, mobs["maxlevel"]);
	}else{
		level = helper.rInt(1, level);
	}

	var mbs = Object.keys(mobs["level-"+level]["mobs"]);

	var i = mbs[helper.rInt(0, mbs.length-1)];

	var mob = mobs["level-"+level]["mobs"][i];
	adventures[user] = helper.extend({}, mob);
}

function getWep(item){
	return items[item];
};

function adventure(args, message, bot){
	if(!adventures.hasOwnProperty(message.author.id)){
		console.log("created adventure");
		createAdventure(message.author.id);
	}
	var num = helper.rInt(1, 6);
	var user = message.author.id;
	var userLoose = 0;
	var advLoose = 0;
	var xp = 0;

	var adv = adventures[user];
	var wep = getWep(users[user]["weapon"])["weapon"];

	if(num == 1){
		userLoose = Math.round(helper.rInt(adv["dmg"]["min"], (adv["dmg"]["max"])));
		advLoose = Math.round(helper.rInt(wep["dmg"]["min"], (wep["dmg"]["max"]*0.2)));
	}else if(num == 2){
		userLoose = Math.round(helper.rInt(adv["dmg"]["min"], (adv["dmg"]["max"]*0.4)));
		advLoose = Math.round(helper.rInt(wep["dmg"]["min"], (wep["dmg"]["max"]*0.3)));
	}else if(num == 3){
		userLoose = Math.round(helper.rInt(adv["dmg"]["min"], (adv["dmg"]["max"]*0.5)));
		advLoose = Math.round(helper.rInt(wep["dmg"]["min"], (wep["dmg"]["max"]*0.4)));
	}else if(num == 4){
		userLoose = Math.round(helper.rInt(adv["dmg"]["min"], (adv["dmg"]["max"]*0.7)));
		advLoose = Math.round(helper.rInt(wep["dmg"]["min"], (wep["dmg"]["max"]*0.8)));
	}else if(num == 5){
		userLoose = Math.round(helper.rInt(adv["dmg"]["min"], (adv["dmg"]["max"]*0.8)));
		advLoose = Math.round(helper.rInt(wep["dmg"]["min"], (wep["dmg"]["max"]*0.9)));
	}else if(num == 6){
		userLoose = Math.round(helper.rInt(adv["dmg"]["min"], (adv["dmg"]["max"]*0.9)));
		advLoose = Math.round(helper.rInt(wep["dmg"]["min"], (wep["dmg"]["max"])));
	}

	if(adv.hasOwnProperty("boost")){
		if(adv["boost"].hasOwnProperty("strength")){
			if(adv["boost"]["last"] > 0){
				users[user]["stats"]["strength"] = users[user]["stats"]["strength"]*adv["boost"]["strength"];	
				adv["boost"]["last"]--;
			}else{
				delete adv["boost"];
			}
			
		}
	}

	advLoose += Math.floor(Math.sqrt(users[user]["stats"]["strength"])*0.25);
	userLoose -= Math.floor(Math.sqrt(users[user]["stats"]["defense"])*0.25);

	users[user]["hp"] -= userLoose;
	adv["hp"] -= advLoose;

	if(users[user]["hp"] <= 0){
		var lGold = 0;
		if(users[user]["gold"] >= 10){
			lGold = helper.rInt(0, users[user]["gold"]);
		}

		users[user]["gold"] -= lGold;
		users[user]["hp"] = Math.round(users[user]["maxhp"]*0.25);
		users[user]["deaths"]++;

		fs.writeFile("./data/users.json", JSON.stringify(users), 'utf8', function(err){
			if(err){ throw err; }
			delete adventures[message.author.id];
			delete adv;

			var head = "======== [R.I.P "+message.author.name+"] ========";
			var msg = head+"\n";
			msg += "Losses: "+lGold+"G.";

			var tmpm = "";

			for(i=0;i<head.length;i++){
				tmpm += "=";
			}

			msg += "\n"+tmpm+"\n";

			msg += "http://sven65.github.io/RPGBot/images/RIP.png";

			bot.sendMessage(message.channel, msg);
			
			
		});
		return;
	}
	
	if(adv["hp"] <= 0){
		var luck = users[user]["stats"]["luck"];
		var level = users[user]["level"];

		var gWin = Math.round(((Math.sqrt(luck)+level)*0.5)*helper.rInt(adv["drops"]["gold"]["min"], adv["drops"]["gold"]["max"]));
		var xpWin = Math.round(((Math.sqrt(luck)+level)*0.5)*helper.rInt(adv["drops"]["xp"]["min"], adv["drops"]["xp"]["max"]));
		var levelup = 25*users[user]["level"]*(1+users[user]["level"]);

		users[user]["gold"] += gWin;
		users[user]["xp"] += xpWin;
		users[user]["kills"]++;

		if(users[user]["xp"] >= levelup){
			users[user]["level"]++;
			users[user]["maxhp"] += 50;
			users[user]["points"] += 5;
		}

		fs.writeFile("./data/users.json", JSON.stringify(users), 'utf8', function(err){
			if(err){ console.dir(err); }
			if(delete adventures[message.author.id]){ console.dir("OK"); 
				delete adventures[message.author.id];
				msg = "The enemy "+adv["name"]+" of "+message.author.name+" has been slain! "+message.author.name+" has been awarded with "+gWin+" gold and "+xpWin+" XP.";
				if(users[user]["xp"] >= levelup){
					msg += "\n"+message.author.name+" Leveled up! They've been awarded with 5 attribute points and their max HP has increased by 50!";
				}
				bot.sendMessage(message.channel, msg);
				return;

			}else{
				return;
			}
		});
		return;
	}
	
	fs.writeFile("./data/users.json", JSON.stringify(users), 'utf8', function(err){
		if(err){ console.dir(err); }
		var head = "======== ["+message.author.name+"'s adventure] ========";
		var msg = head+"\n";
		msg+= "Rolled a "+num+". Lost "+userLoose+"HP. Dealt "+advLoose+"HP damage.\n";
		msg+= message.author.name+" has "+users[user]["hp"]+"/"+users[user]["maxhp"]+"HP left.\n";
		msg+= "The enemy "+adv["name"]+" has "+adv["hp"]+"/"+adv["maxhp"]+" HP left.\n";

		var tmpm = "";

		for(i=0;i<head.length;i++){
			tmpm += "=";
		}

		msg+= tmpm+"\n";
		msg+= "Type ``"+settings["prefix"]["main"]+"adventure 1`` to run or ``"+settings["prefix"]["main"]+"adventure 2`` to fight again.";

		bot.sendMessage(message.channel, msg);
	});
}

function create(user){

	users[user] = {
		"items": ["1"],
		"hp": 50,
		"maxhp": 50,
		"level": 1,
		"xp": 0,
		"gold": 0,
		"kills": 0,
		"deaths": 0,
		"points": 5,
		"weapon": "2",
		"stats": {
			"strength": 0,
			"defense": 0,
			"charisma": 0,
			"luck": 0
		}
	};
	saveUsers();
}

function saveUsers(){
	fs.writeFile("./data/users.json", JSON.stringify(users), 'utf8', function(err){
		if(err){ console.dir(err); }
	});
}

function use(item, message, bot){
	var user = message.author.id;
	var itm = items[item];
	if(users[user]["level"] >= itm["level"]){
		if(users[user]["items"].indexOf(item) > -1){
			users[user]["items"].splice(users[user]["items"].indexOf(item), 1);
			
			if(itm["type"] == "potion"){
				var msg = message.author.name+" used a potion and got ";
				if(itm["potion"].hasOwnProperty("heal")){
					var heal = itm["potion"]["heal"];
					if(users[user]["hp"]+heal > users[user]["maxhp"]){
						heal -= users[user]["hp"];
					}

					users[user]["hp"] += heal;

					msg += heal+"HP regenerated.";
				}else if(itm["potion"].hasOwnProperty("boost")){
					if(itm["potion"]["boost"].hasOwnProperty("strength")){
						if(adventures.hasOwnProperty(user)){
							if(itm["potion"]["temp"]){
								adventures["boost"] = {"strength": adventures["boost"]["strength"], "last": itm["potion"]["last"]};
								msg += "a "+adventures["boost"]["strength"]+"x strength boost for "+itm["potion"]["last"]+" turns. ";
							}
						}
					}
				}

				saveUsers();
				bot.sendMessage(message.channel, msg);

			}
		}else{
			bot.sendMessage(message.channel, message.author.name+" tried to use a item they don't have.");
		}
	}else{
		bot.sendMessage(message.channel, message.author.name+" tried to use a item they're not skilled enough to use.");
	}
}

function buy(item, message, bot){
	var user = message.author.id;
	if(Object.keys(items).indexOf(item) > -1){

		var itm = items[item];

		var msg = "";

		if(users[user]["level"] >= itm["level"]){

			if(items[item]["cost"] > 0){

				var charisma = users[user]["stats"]["charisma"];
				var cost = Math.round(items[item]["cost"]-(charisma*0.2));

				if(cost <= 0){
					cost = 1;
				}

				if(users[user]["gold"] >= items[item]["cost"]){
					users[user]["gold"] -= items[item]["cost"];
					if(items[item]["type"] == "weapon"){
						users[user]["weapon"] = item;
					}else{
						users[user]["items"].push(item);
					}
					
					msg = message.author.name+" bought "+items[item]["prefix"]+" "+items[item]["name"]+" for "+items[item]["cost"]+" gold.";
				}else{
					msg = message.author.name+" tried to buy an item but didn't have enough gold.";
				}


				saveUsers();
				bot.sendMessage(message.channel, msg);
			}
		}else{
			bot.sendMessage(message.channel, message.author.name+" tried to buy an item they're not skilled enough to use.");
		}
	}else{
		bot.sendMessage(message.channel, message.author.name+" tried to buy an unknown item.");
	}
}

var defaults = {
	"info": {
		process: function(args, message, bot){
			var msg = "RPGBot Version "+settings["version"]+" - Made by "+bot.users.get("id", settings["owner"]).name;
			msg += "\nThanks to "+bot.users.get("id", "158049329150427136").name+" for helping with graphics.";
			msg += "\nYou can join the official server at http://discord.gg/0xhM8npvQxiBcZqm";
			bot.sendMessage(message.channel, msg);
		},
		"desc": "Shows info about the bot.",
		"usage": "info",
		"cooldown": 10
	},
	"help": {
		process: function(args, message, bot){
			if(args.length >= 2){
				var cmd = args[1];
				var index = Object.keys(defaults).indexOf(cmd);
				if(index > -1){
					var helpMsg = "__**"+helper.capFirst(cmd)+"**__\n\n";
					helpMsg += "**Description: **"+defaults[cmd].desc+"\n\n";
					helpMsg += "**Usage: **"+settings['prefix']["main"]+""+defaults[cmd].usage;

					bot.sendMessage(message.channel, helpMsg);
				}
			}else{
				var msg = "Hi! I'm "+bot.user.name+"! For a list of the commands I recognize, you can type ``"+settings['prefix']['main']+"commands``";
				if(settings["prefix"]["botname"]){
					msg += ", ``"+bot.user.name+" commands`` or ``@"+bot.user.name+" commands``";
				}
				bot.sendMessage(message.channel, msg);
			}
		},
		"desc": "Shows help message",
		"usage": "help ``[command]``",
		"cooldown": 10
	},
	"commands": {
		process: function(args, message, bot){
			var cms = [];

			var def = Object.keys(defaults).sort();

			for(i=0;i<def.length;i++){
				if(!defaults[def[i]].hasOwnProperty("unlisted")){
					cms.push("``"+helper.capFirst(def[i])+"``");
				}
			}

			var helpMsg = "__**Commands:**__\n\n";
			helpMsg += cms.join(", ");
		    bot.sendMessage(message.channel, helpMsg);
		},
		"desc": "Shows commands",
		"usage": "commands",
		"cooldown": 10
	},
	"stats": {
		process: function(args, message, bot){
			var user = message.author.id;
			var head = "======== ["+message.author.name+"'s stats] ========";
			var msg = head+"\n";
			var usr;
			if(Object.keys(users).indexOf(user) > -1){
				usr = users[user];
			}else{
				create(user);
				msg += "Welcome new player. Please use ``"+settings['prefix']['main']+"assign (attribute) (points)`` to assign your "+users[user]["points"]+" attribute points.";
				usr = users[user];
			}

			var itms = [];

			for(i=0;i<usr["items"].length;i++){
				var search = usr["items"][i];
				var count = usr["items"].reduce(function(n, val){
			    	return n+(val === search);
				}, 0);
				var ps = count+" x "+items[usr["items"][i]]["name"];
				if(itms.indexOf(ps) == -1){
					itms.push(ps);
				}
			}

			msg += "\nHealth: "+usr["hp"]+"/"+usr["maxhp"]+"HP.";
			msg += "\nItems: "+itms.sort().join(", ")+" Weapon: "+getWep(usr["weapon"])["name"];
			msg += "\nLevel "+usr["level"]+" ("+usr["xp"]+"/"+(25*users[user]["level"]*(1+users[user]["level"]))+"XP) | "+usr['gold']+"G";
			msg += "\nKilled "+usr["kills"]+" enemies. Slain "+usr["deaths"]+" times.";
			msg += "\nStrength: "+usr["stats"]["strength"]+", Defense: "+usr["stats"]["defense"]+", Charisma: "+usr["stats"]["charisma"]+", Luck: "+usr["stats"]["luck"]+". Unassigned: "+usr["points"]+" points.";

			var tmpm = "";

			for(i=0;i<head.length;i++){
				tmpm += "=";
			}

			msg+= "\n"+tmpm;

			bot.sendMessage(message.channel, msg);
			saveUsers();
		},
		"desc": "Shows your RPG stats",
		"usage": "stats",
		"cooldown": 10
	},
	"adventure": {
		process: function(args, message, bot){
			if(args.length >= 2){
				if(Object.keys(users).indexOf(message.author.id) == -1){
					create(user);
					saveUsers();
				}

				if(Object.keys(adventures).indexOf(message.author.id) > -1){
					if(args[1] == "1" || args[1] == 0){
						delete adventures[message.author.id];					
						bot.sendMessage(message.channel, message.author.name+" abandoned their adventure!");
						
					}else if(args[1] == "2" || args[1] == 2){
						adventure(args, message, bot);
					}
				}else{
					adventure(args, message, bot);
				}
			}else{
				if(Object.keys(adventures).indexOf(message.author.id) > -1){
					bot.sendMessage(message.channel, "Type ``"+settings["prefix"]["main"]+"adventure 1`` to run or ``"+settings["prefix"]["main"]+"adventure 2`` to fight again.");
					return;
				}
				adventure(args, message, bot);
			}
		},
		"desc": "Go on an adventure!",
		"usage": "adventure",
		"cooldown": 10
	},
	"heal": {
		process: function(args, message, bot){
			var user = message.author.id;
			if(users[user]["items"].indexOf("1") > -1){
				users[user]["items"].splice(users[user]["items"].indexOf("1"), 1);

				var msg = message.author.name+" used a health potion and got ";

				var heal = 50;
				if(users[user]["hp"]+heal > users[user]["maxhp"]){
					heal -= users[user]["hp"];
					if(heal < 0){
						heal = 50-(users[user]["hp"]);
					}
				}

				users[user]["hp"] += heal;

				msg += heal+"HP regenerated.";

				bot.sendMessage(message.channel, msg);
				saveUsers();

			}else{
				bot.sendMessage(message.channel, message.author.name+" tried to use a Health Potion, But has none.");
			}
		},
		"desc": "Heal using a health potion",
		"usage": "heal",
		"cooldown": 10
	},
	"use": {
		process: function(args, message, bot){
			var item = args.splice(1, args.length).join(" ");
			var usr = users[message.author.id];

			var uitems = [];

			for(i=0;i<usr["items"].length;i++){
				var nam = items[usr["items"][i]]["name"];
				console.log(nam);
				if(uitems.indexOf(nam) == -1){
					uitems.push(nam);
				}
			}

			var results = filter.filter(uitems, item.toLowerCase());
	
			for(i=0;i<Object.keys(items).length;i++){
				if(items[Object.keys(items)[i]]["name"].toLowerCase() == item.toLowerCase()){
					use(Object.keys(items)[i], message, bot);
					return;
				}
			}

			if(results.length > 0){
				var itmFound = [];
				var msg = "";
				msg += "Found "+results.length+" items.\n";
				for(i=0;i<results.length;i++){
					itmFound.push("``"+results[i]+"``");
				}
				msg += itmFound.sort().join(", ");
				bot.sendMessage(message.channel, msg);
				return;
			}

			if(results.length <= 0){
				bot.sendMessage(message.channel, message.author.name+" tried to use an unknown item!");
				return;
			}
		},
		"desc": "Uses an item",
		"usage": "use ``item``",
		"cooldown": 10
	},
	"buy": {
		process: function(args, message, bot){
			var item = args.splice(1, args.length).join(" ");
			console.log(item.toLowerCase());

			var results = filter.filter(itmObj, item.toLowerCase(), {key: "name"});

			for(i=0;i<Object.keys(items).length;i++){
				if(item.toLowerCase() == items[Object.keys(items)[i]]["name"].toLowerCase()){
					buy(Object.keys(items)[i], message, bot);
					return;
				}
			}

			if(results.length > 0){
				var itmFound = [];
				var msg = "";
				msg += "Found "+results.length+" items.\n";
				for(i=0;i<results.length;i++){
					itmFound.push("``"+results[i]["name"]+"``");
				}
				msg += itmFound.sort().join(", ");
				bot.sendMessage(message.channel, msg);
			}

			if(results.length <= 0){
				bot.sendMessage(message.channel, message.author.name+" tried to buy an unknown item!");
				return;
			}
		},
		"desc": "Buys an item",
		"usage": "buy ``item``",
		"cooldown": 10
	},
	"assign": {
		process: function(args, message, bot){
			if(args.length >= 3){
				var user = message.author.id;
				var attr = args[1].toLowerCase();
				var amount = Number(args[2]);
				if(Number(args[2])){
					amount = Number(args[2]);
				}else{
					bot.sendMessage(message.channel, message.author.name+" tried to assign an invalid amount of points.");
					return;
				}
				if(!users.hasOwnProperty(user)){
					create(user);
					saveUsers();
				}

				if(amount > users[user]["points"]){
					bot.sendMessage(message.channel, message.author.name+" tried to assign "+amount+" attribute points, but they only have "+users[user]["points"]);
					return;
				}else{
					if(Object.keys(users[user]["stats"]).indexOf(attr) > -1){
						var msg = message.author.name+" assigned "+amount+" attribute points to their "+helper.capFirst(attr)+" attribute.";
						users[user]["stats"][attr] += amount;
						users[user]["points"] -= amount;

						bot.sendMessage(message.channel, msg);
						saveUsers();
						return;

					}else{
						bot.sendMessage(message.channel, message.author.name+" tried to assign attribute points to a unknown attribute.");
						return;
					}
				}
			}
		},
		"desc": "Assigns attribute points",
		"usage": "assign ``attribute`` ``points``",
		"cooldown": 10
	},
	"ping": {
		process: function(args, message, bot){
			var start = Date.now();
			var time = message.timestamp-start;
			if(time < 0){
				time *= -1;
			}
			bot.reply(message, "Pong! (Time taken "+time/1000+" seconds)");
		},
		"desc": "Pong!",
		"usage": "ping",
		"cooldown": 10
	},
	"pong": {
		process: function(args, message, bot){
			var start = Date.now();
			var time = message.timestamp-start;
			if(time < 0){
				time *= -1;
			}
			bot.reply(message, "Ping! (Time taken "+time/1000+" seconds)");
		},
		"desc": "Ping!",
		"usage": "pong",
		"cooldown": 10
	},
	"invite": {
		process: function(args, message, bot){
			bot.sendMessage(message.channel, "Click here to add me to your server! https://discordapp.com/oauth2/authorize?&client_id=170915256833540097&scope=bot&permissions=0");
		},
		"desc": "Gets an invite link for the bot.",
		"usage": "invite",
		"cooldown": 10
	},
	"items": {
		process: function(args, message, bot){
			var keys = Object.keys(items);
			var itmz = [];
			for(i=0;i<keys.length;i++){
				itmz.push("``"+items[keys[i]]["name"]+"``");
			}
			bot.sendMessage(message.author.id, itmz.sort().join(", "));
		},
		"desc": "Sends a list of items",
		"usage": "items",
		"cooldown": 10
	},
	"item": {
		process: function(args, message, bot){
			if(args.length >= 2){
				var item = args.splice(1, args.length).join(" ");
				var msg = [];

				var results = filter.filter(itmObj, item.toLowerCase(), {key: "name"});

				for(i=0;i<Object.keys(items).length;i++){
					if(item.toLowerCase() == items[Object.keys(items)[i]]["name"].toLowerCase()){

						var itm = items[Object.keys(items)[i]];

						var head = "======== ["+itm["name"]+"] ========\n";
						var msg = head+"\n";
						msg += itm["desc"]+"\n";
						
						msg += "Type: "+helper.capFirst(itm["type"])+"\n";
						switch(itm["type"]){
							case "potion":
								msg += "Effects: ";
								if(itm["potion"].hasOwnProperty("heal")){
									msg += "Heal "+itm["potion"]["heal"]+"HP\n";
								}
								break;
							case "weapon":
								msg += "Damage: "+itm["weapon"]["dmg"]["min"]+" to "+itm["weapon"]["dmg"]["max"]+"\n";
								break;
						}



						msg += "Minimum level: "+itm["level"]+"\n";
						msg += "Price: "+itm["cost"]+"\n";

						if(itm.hasOwnProperty("image")){
							msg += "http://sven65.github.io/RPGBot/images/"+itm["image"]+"\n";
						}

						var tmpm = "";

						for(i=0;i<head.length;i++){
							tmpm += "=";
						}

						msg+= tmpm+"\n";

						bot.sendMessage(message.channel, msg);

						return;
					}
				}

				if(results.length > 0){
					var itmFound = [];
					var msg = "";
					msg += "Found "+results.length+" items.\n";
					for(i=0;i<results.length;i++){
						itmFound.push("``"+results[i]["name"]+"``");
					}
					msg += itmFound.sort().join(", ");
					bot.sendMessage(message.channel, msg);
					return;
				}

				bot.sendMessage(message.channel, message.author.name+" tried to get info about an unknown item!");
			}
		},
		"desc": "Shows information about an item",
		"usage": "item ``item``",
		"cooldown": 10
	},
	"suggest": {
		process: function(args, message, bot){
			if(args.length >= 2){
				var msg = args.splice(1, args.length).join(" ");
				bot.sendMessage(settings["owner"], "["+new Date().toUTCString()+"] ["+message.author.name+"] -> "+msg);
				bot.sendMessage(message.channel, "Message sent.");
			}
		},
		"desc": "Sends a message to the bot's creator.",
		"usage": "suggest ``message``",
		"cooldown": 10
	},
	"givegold": {
		process: function(args, message, bot){
			if(args.length >= 3){
				if(message.author.id == settings["owner"]){
					var to = message.mentions[0].id;
					users[to]["gold"] += Number(args[2]);
					bot.sendMessage(message.channel, "Gave "+bot.users.get("id", to).name+" "+args[2]+" gold");
					saveUsers();
				}
			}
		},
		"desc": "Gives a user gold",
		"usage": "givegold ``user`` ``amount``",
		"cooldown": 10,
		"unlisted": true
	}
};

exports.defaults = defaults;