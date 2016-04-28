var helper = require("../util/Helper.js");
var useful = require("../util/Useful.js");
var fs = require("fs");
var filter = require('fuzzaldrin');
var fix = require("entities");

var settings = require("../settings.json");
var users = require("../data/users.json");
var items = require("../data/items.json");
var mobs = require("../data/mobs.json");
var guilds = require("../data/guilds.json");
var gicons = require("../data/gicons.json");

var itmObj = [];

for(i=0;i<Object.keys(items).length;i++){
	itmObj.push(items[Object.keys(items)[i]]);
}

var adventures = require("../data/adventures.json");
var mine = {};
var firstMine = {};
var battles = {};

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

	if(userLoose < 0){
		userLoose = 1;
	}

	users[user]["hp"] -= userLoose;
	adv["hp"] -= advLoose;

	if(adv["hp"] <= 0){
		var luck = users[user]["stats"]["luck"];
		var level = users[user]["level"];

		var gWin = Math.round(((Math.sqrt(luck)+level)*0.5)*helper.rInt(adv["drops"]["gold"]["min"], adv["drops"]["gold"]["max"]));
		var xpWin = Math.round(((Math.sqrt(luck)+level)*0.5)*helper.rInt(adv["drops"]["xp"]["min"], adv["drops"]["xp"]["max"]));
		var levelup = 50*users[user]["level"]*(1+users[user]["level"]);

		users[user]["gold"] += gWin;
		users[user]["xp"] += xpWin;
		users[user]["kills"]++;

		if(users[user]["xp"] >= levelup){
			users[user]["level"]++;
			users[user]["maxhp"] += 50;
			users[user]["hp"] = users[user]["maxhp"];
			users[user]["points"] += 5;
		}

		fs.writeFile("./data/users.json", JSON.stringify(users), 'utf8', function(err){
			if(err){ console.dir(err); }
			if(delete adventures[message.author.id]){ console.dir("OK"); 
				delete adventures[message.author.id];

				saveAdventures();

				var head = "!======== ["+message.author.name+"'s adventure] ========!";


				var msg = "```diff\n"+head+"\n";
					msg += "Rolled a "+num+".\n";
					msg += "- Lost "+userLoose+"HP.\n";
					msg += "+ Dealt "+advLoose+"HP damage.\n";
					msg += "+ "+message.author.name+" has "+users[user]["hp"]+"/"+users[user]["maxhp"]+"HP left.\n";
					msg += "+ The enemy "+adv["name"]+" was slain by "+message.author.name+"!\n";
					msg += "+ Rewards: "+gWin+" Gold and "+xpWin+"XP.";

					if(users[user]["xp"] >= levelup){
						msg += "\n+ "+message.author.name+" Leveled up! They've been awarded with 5 attribute points and along with their max HP increasing by 50, they've been fully healed!";
					}

					var tmpm = "!";

					for(i=0;i<head.length-2;i++){
						tmpm += "=";
					}

					msg+= "\n"+tmpm+"!```\n";
					bot.sendMessage(message.channel, msg);
				return;

			}else{
				return;
			}
		});
		return;
	}

	if(users[user]["hp"] <= 0){
		var lGold = 0;
		if(users[user]["gold"] >= 50){
			lGold = helper.rInt(0, (users[user]["gold"]/2));
		}

		users[user]["gold"] -= lGold;
		users[user]["hp"] = Math.round(users[user]["maxhp"]*0.25);
		users[user]["deaths"]++;

		fs.writeFile("./data/users.json", JSON.stringify(users), 'utf8', function(err){
			if(err){ throw err; }
			delete adventures[message.author.id];
			delete adv;

			saveAdventures();

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
	
	fs.writeFile("./data/users.json", JSON.stringify(users), 'utf8', function(err){
		if(err){ console.dir(err); }
		var head = "!======== ["+message.author.name+"'s adventure] ========!";
		var msg = "```diff\n"+head+"\n";
		msg += "Rolled a "+num+".\n";
		msg += "- Lost "+userLoose+"HP.\n";
		msg += "+ Dealt "+advLoose+"HP damage.\n";
		msg += "+ "+message.author.name+" has "+users[user]["hp"]+"/"+users[user]["maxhp"]+"HP left.\n";
		msg += "- The enemy "+adv["name"]+" has "+adv["hp"]+"/"+adv["maxhp"]+" HP left.\n";

		var tmpm = "!";

		for(i=0;i<head.length-2;i++){
			tmpm += "=";
		}

		msg+= tmpm+"!```\n";
		msg+= "Type ``"+settings["prefix"]["main"]+"adventure 1`` to run or ``"+settings["prefix"]["main"]+"adventure 2`` to fight again.";

		saveAdventures();

		bot.sendMessage(message.channel, msg);
	});
}

function create(user, name){

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
		},
		"pvp": false,
		"name": name,
		"guild": ""
	};
	saveUsers();
}

function createGuild(owner, name){
	var id = useful.guid();
	guilds[id] = {
		"name": name,
        "owner": owner,
        "elder": [],
        "member": [],
        "members": [owner],
        "gold": 0,
        "slain": 0,
        "deaths": 0,
        "level": 1,
        "icon": gicons[helper.rInt(0, gicons.length-1)],
        "open": true,
        "invites": []
	}

	users[owner]["guild"] = id;

	saveGuilds();
	saveUsers();
}

function saveUsers(){
	fs.writeFile("./data/users.json", JSON.stringify(users), 'utf8', function(err){
		if(err){ console.dir(err); }
	});
}

function saveGuilds(){
	fs.writeFile("./data/guilds.json", JSON.stringify(guilds), 'utf8', function(err){
		if(err){ console.dir(err); }
	});
}

function saveAdventures(){
	fs.writeFile("./data/adventures.json", JSON.stringify(adventures), 'utf8', function(err){
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

function buy(item, message, bot, amt){
	var user = message.author.id;
	if(Object.keys(items).indexOf(item) > -1){

		var itm = items[item];

		var msg = "";

		if(users[user]["level"] >= itm["level"]){

			if(items[item]["cost"] > 0){

				var charisma = users[user]["stats"]["charisma"];
				var cost = items[item]["cost"];

				if(cost <= 0){
					cost = 1;
				}

				if(amt > 0){
					cost = cost*amt;
					cost = Math.ceil(cost-(charisma*0.1));
				}else{
					cost = Math.ceil(cost-(charisma*0.2));
				}

				if(users[user]["gold"] >= cost){
					users[user]["gold"] -= cost;
					if(items[item]["type"] == "weapon"){
						users[user]["weapon"] = item;
						msg = message.author.name+" bought "+items[item]["prefix"]+" "+items[item]["name"]+" for "+items[item]["cost"]+" gold.";
					}else{
						if(amt > 1){
							for(i=0;i<amt;i++){
								users[user]["items"].push(item);
							}
							msg = message.author.name+" bought "+amt+" "+items[item]["name"]+"s for "+cost+" gold.";
						}else{
							users[user]["items"].push(item);
							msg = message.author.name+" bought "+items[item]["prefix"]+" "+items[item]["name"]+" for "+items[item]["cost"]+" gold.";
						}
					}
				}else{
					if(amt > 1){
						msg = message.author.name+" tried to buy "+amt+" items but didn't have enough gold.";
					}else{
						msg = message.author.name+" tried to buy an item but didn't have enough gold.";
					}
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


function battle(args, message, bot, b, id){
	try{
		console.log("battle");
		var turn = b["turn"];
		var usr = b["usr"];
		var num = helper.rInt(1, 6);

		var oTurn = 0;

		if(turn == 0){
			oTurn = 1;
		}

		if(usr.indexOf(message.author.id) == turn){
			

			var wep = getWep(users[usr[turn]]["weapon"])["weapon"];

			var userLoose = 0;


			if(num == 1){
				userLoose = Math.round(helper.rInt(wep["dmg"]["min"], (wep["dmg"]["max"]*0.2)));
			}else if(num == 2){
				userLoose = Math.round(helper.rInt(wep["dmg"]["min"], (wep["dmg"]["max"]*0.3)));
			}else if(num == 3){
				userLoose = Math.round(helper.rInt(wep["dmg"]["min"], (wep["dmg"]["max"]*0.4)));
			}else if(num == 4){
				userLoose = Math.round(helper.rInt(wep["dmg"]["min"], (wep["dmg"]["max"]*0.8)));
			}else if(num == 5){
				userLoose = Math.round(helper.rInt(wep["dmg"]["min"], (wep["dmg"]["max"]*0.9)));
			}else if(num == 6){
				userLoose = Math.round(helper.rInt(wep["dmg"]["min"], (wep["dmg"]["max"])));
			}


			userLoose += Math.floor(Math.sqrt(users[usr[turn]]["stats"]["strength"])*0.25);

			if(turn == 0){
				userLoose -= Math.floor(Math.sqrt(users[usr[1]]["stats"]["defense"])*0.25);
				users[usr[1]]["hp"] -= userLoose;
			}else{
				userLoose -= Math.floor(Math.sqrt(users[usr[0]]["stats"]["defense"])*0.25);
				users[usr[0]]["hp"] -= userLoose;
			}


			if(users[usr[oTurn]]["hp"] <= 0){
				var lGold = 0;
				if(users[usr[oTurn]]["gold"] >= 50){
					lGold = helper.rInt(0, (users[usr[oTurn]]["gold"]/2));
				}

				users[usr[oTurn]]["gold"] -= lGold;
				users[usr[oTurn]]["hp"] = Math.round(users[usr[oTurn]]["maxhp"]*0.25);
				users[usr[oTurn]]["deaths"]++;

				users[usr[turn]]["gold"] += lGold;

				fs.writeFile("./data/users.json", JSON.stringify(users), 'utf8', function(err){
					if(err){ bot.sendMessage(message, err); }
					try{
						if(delete battles[id]){
							delete battles[id];
						}else{
							bot.sendMessage(message, "Something went wrong");
							return;
						}
					}catch(e){
						bot.sendMessage(message, "```js\n"+e+"```");
						return;
					}

					var head = "!======== [R.I.P "+bot.users.get("id", usr[oTurn]).name+"] ========!";
					var msg = "```diff\n"+head+"\n";
					msg += bot.users.get("id", usr[turn]).name+" rolled a "+num+".\n";
					msg += "- "+bot.users.get("id", usr[turn]).name+" Dealt "+userLoose+"HP Damage.\n";
					msg += "- Losses: "+lGold+"G.";

					var tmpm = "";

					for(i=0;i<head.length-2;i++){
						tmpm += "=";
					}

					msg += "\n!"+tmpm+"!```\n";

					msg += "http://sven65.github.io/RPGBot/images/RIP.png";

					bot.sendMessage(message.channel, msg);	
				});
				return;
			}


			fs.writeFile("./data/users.json", JSON.stringify(users), 'utf8', function(err){
				if(err){ console.dir(err); }
				var head = "!======== ["+bot.users.get("id", usr[0]).name+"'s Battle with "+bot.users.get("id", usr[1]).name+"] ========!";
				var msg = "```diff\n"+head+"\n";
				msg += bot.users.get("id", usr[turn]).name+"'s turn.\n";
				msg += "+ Rolled a "+num+".\n";
				msg += "+ Dealt "+userLoose+"HP damage.\n";
				if(turn == 0){
					msg += "-  "+bot.users.get("id", usr[1]).name+" has "+users[usr[1]]["hp"]+"/"+(users[usr[1]]["maxhp"])+" HP left.\n";
				}else{
					msg += "-  "+bot.users.get("id", usr[0]).name+" has "+users[usr[0]]["hp"]+"/"+(users[usr[0]]["maxhp"])+" HP left.\n";
				}

				var tmpm = "!";

				for(i=0;i<head.length-2;i++){
					tmpm += "=";
				}

				msg+= tmpm+"!```\n";

				if(turn == 0){
					msg += bot.users.get("id", usr[1]).name;
					battles[id]["turn"] = 1;
				}else{
					msg += bot.users.get("id", usr[0]).name;
					battles[id]["turn"] = 0;
				}

				msg+= ", Type ``"+settings["prefix"]["main"]+"bfight`` to fight.";

				bot.sendMessage(message.channel, msg);



			});

		}else{
			console.log("no turn");
		}
	}catch(e){
		bot.sendMessage(message, "```js\n"+e+"```");
	}
	return;
}

function getGuildLevel(id){
	var members = guilds[id]["members"];
	var lTot = 0;

	for(i=0;i<members.length;i++){
		lTot += users[members[i]]["level"];
	}

	return lTot/members.length;
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
				if(defaults[def[i]].hasOwnProperty("unlisted") && message.channel.id == "172404603273347072" && message.channel.server.id == "172382467385196544"){
					cms.push("``"+helper.capFirst(def[i])+"``");
				}else{
					if(!defaults[def[i]].hasOwnProperty("unlisted")){
						cms.push("``"+helper.capFirst(def[i])+"``");
					}
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
			var head = "!======== ["+message.author.name+"'s stats] ========!";
			var msg = "```diff\n"+head;
			var usr;
			if(Object.keys(users).indexOf(user) > -1){
				usr = users[user];
				if(users[message.author.id]["name"] != message.author.name){
					users[message.author.id]["name"] = message.author.name;
				}
			}else{
				create(user, message.author.name);
				msg += "+ Welcome new player. Please use '"+settings['prefix']['main']+"assign (attribute) (points)' to assign your "+users[user]["points"]+" attribute points.";
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

			msg += "\n+ Health: "+usr["hp"]+"/"+usr["maxhp"]+"HP.";
			msg += "\n+ Items: "+itms.sort().join(", ");
			msg += "\n+ Weapon: "+getWep(usr["weapon"])["name"];
			msg += "\n+ Level "+usr["level"]+" ("+usr["xp"]+"/"+(50*users[user]["level"]*(1+users[user]["level"]))+"XP) | "+usr['gold']+" Gold";
			msg += "\n+ Killed "+usr["kills"]+" enemies. Slain "+usr["deaths"]+" times.";
			msg += "\n+ Strength: "+usr["stats"]["strength"]+", Defense: "+usr["stats"]["defense"]+", Charisma: "+usr["stats"]["charisma"]+", Luck: "+usr["stats"]["luck"]+". Unassigned: "+usr["points"]+" points.";

			var tmpm = "";

			for(i=0;i<head.length-2;i++){
				tmpm += "=";
			}

			msg+= "\n!"+tmpm+"!```";

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
					create(message.author.id, message.author.name);
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
		"cooldown": 2
	},
	"heal": {
		process: function(args, message, bot){
			var user = message.author.id;

			if(!users[user] == undefined){
				if(users[user]["name"] != message.author.name){
					users[user]["name"] = message.author.name;
				}
			}

			if(users[user]["items"].indexOf("1") > -1){
				users[user]["items"].splice(users[user]["items"].indexOf("1"), 1);

				var msg = message.author.name+" used a health potion and got ";

				var heal = 50;
                if(users[user]["maxhp"]-users[user]["hp"] > 50){
                    heal = 50;
                }else{
                    heal = users[user]["maxhp"]-users[user]["hp"];
                }

                users[user]["hp"] += heal;

				msg += heal+"HP regenerated.";

				bot.sendMessage(message.channel, msg);
				saveUsers();

			}else{
				bot.sendMessage(message.channel, message.author.name+" tried to use a Health Potion, but has none.");
			}
		},
		"desc": "Heal using a health potion",
		"usage": "heal",
		"cooldown": 2
	},
	"use": {
		process: function(args, message, bot){

			if(!users[message.author.id] == undefined){
				if(users[message.author.id]["name"] != message.author.name){
					user[message.author.id]["name"] = message.author.name;
				}
			}

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
		"cooldown": 2
	},
	"buy": {
		process: function(args, message, bot){

			if(!users[message.author.id] == undefined){
				if(users[message.author.id]["name"] != message.author.name){
					user[message.author.id]["name"] = message.author.name;
				}
			}

			var item = args.splice(1, args.length).join(" ").replace(/\s*$/,"");
			//bot.sendMessage(message, "[DEBUG] "+item);
			console.log(item.toLowerCase());

			var amt = 1;

			var matches = item.match(/\d+$/);

			if(matches){
    			amt = Number(matches[0]);
    			item = item.replace(/\d+$/, "").replace(/\s*$/,"");
    		}

			var results = filter.filter(itmObj, item.toLowerCase(), {key: "name"});

			for(i=0;i<Object.keys(items).length;i++){
				if(item.toLowerCase() == items[Object.keys(items)[i]]["name"].toLowerCase()){
					buy(Object.keys(items)[i], message, bot, amt);
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
		"usage": "buy ``item`` ``[Amount]``",
		"cooldown": 2
	},
	"assign": {
		process: function(args, message, bot){

			if(!users[message.author.id] == undefined){
				if(users[message.author.id]["name"] != message.author.name){
					user[message.author.id]["name"] = message.author.name;
				}
			}

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
					create(user, message.author.name);
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
		"cooldown": 2
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

			if(!users[message.author.id] == undefined){
				if(users[message.author.id]["name"] != message.author.name){
					user[message.author.id]["name"] = message.author.name;
				}
			}

			var keys = Object.keys(items);
			var itmz = [];
			for(i=0;i<keys.length;i++){
				itmz.push("``"+items[keys[i]]["name"]+"``");
			}
			bot.sendMessage(message, itmz.sort().join(", "));
		},
		"desc": "Sends a list of items",
		"usage": "items",
		"cooldown": 10
	},
	"item": {
		process: function(args, message, bot){

			if(!users[message.author.id] == undefined){
				if(users[message.author.id]["name"] != message.author.name){
					user[message.author.id]["name"] = message.author.name;
				}
			}

			if(args.length >= 2){
				var item = args.splice(1, args.length).join(" ");
				var msg = [];

				var results = filter.filter(itmObj, item.toLowerCase(), {key: "name"});

				for(i=0;i<Object.keys(items).length;i++){
					if(item.toLowerCase() == items[Object.keys(items)[i]]["name"].toLowerCase()){

						var itm = items[Object.keys(items)[i]];
						var msg = "```tex\n$ "+itm["name"]+" {Lvl. "+itm["level"]+"} $\n";
						switch(itm["type"]){
							case "potion":
								msg += "# Effects: ";
								if(itm["potion"].hasOwnProperty("heal")){
									msg += "Heal "+itm["potion"]["heal"]+"HP\n";
								}
								break;
							case "weapon":
								msg += "# Damage: "+itm["weapon"]["dmg"]["min"]+"-"+itm["weapon"]["dmg"]["max"]+"\n";
								break;
						}

						msg += "# Price: "+itm["cost"]+" Gold\n";
						msg += "% "+itm["desc"]+"```\n";

						if(itm.hasOwnProperty("image")){
							msg += "http://sven65.github.io/RPGBot/images/"+itm["image"]+"\n";
						}

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
		"cooldown": 2
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
	},
	"givepoints": {
		process: function(args, message, bot){
			if(args.length >= 3){
				if(message.author.id == settings["owner"]){
					var to = message.mentions[0].id;
					users[to]["points"] += Number(args[2]);
					bot.sendMessage(message.channel, "Gave "+bot.users.get("id", to).name+" "+args[2]+" points");
					saveUsers();
				}
			}
		},
		"desc": "Gives a user points",
		"usage": "givepoints ``user`` ``amount``",
		"cooldown": 10,
		"unlisted": true
	},
	"rdata": {
		process: function(args, message, bot){
			if(message.author.id == settings["owner"]){
				try{
					items = "";
					mobs = "";
					gicons = "";

					delete require.cache[require.resolve('../data/items.json')];
					delete require.cache[require.resolve('../data/mobs.json')];
					delete require.cache[require.resolve('../data/gicons.json')];

					items = require("../data/items.json");
					mobs = require("../data/mobs.json");

					gicons = require("../data/gicons.json");

					itmObj = [];

					for(i=0;i<Object.keys(items).length;i++){
						itmObj.push(items[Object.keys(items)[i]]);
					}

					bot.sendMessage(message, "Reloaded all data.");
				}catch(e){
					bot.sendMessage(message, "```js\n"+e+"```");
				}
			}
		},
		"desc": "Reloads data",
		"usage": "rdata",
		"cooldown": 10,
		"unlisted": true
	},
	"mine": {
		process: function(args, message, bot){

			if(!users[message.author.id] == undefined){
				if(users[message.author.id]["name"] != message.author.name){
					user[message.author.id]["name"] = message.author.name;
				}
			}

			var usr = users[message.author.id];
			var luck = usr["stats"]["luck"];
			var level = usr["level"];
			var gWin = Math.round(Math.sqrt((Math.sqrt(luck)+level)*0.5)*helper.rInt(5, 10)/2);


			users[message.author.id]["gold"] += gWin;

			saveUsers();
			bot.sendMessage(message, message.author.name+" Found "+gWin+" gold while mining.");
		},
		"desc": "Mine for gold.",
		"usage": "mine",
		"cooldown": 7200
	},
	"eval2": {
		process: function(args, message, bot){
			if(message.author.id == settings["owner"]){
				try{
					var msg = "";
					if(args[1] == "-c"){
						args = args.splice(1, args.length);
						var code = args.splice(1, args.length).join(" ");
						msg += "```js\n"+code+"```\n";
						msg += "```js\n"+eval(code)+"```";
					}else{
						var code = args.splice(1, args.length).join(" ");
						msg += "```js\n"+eval(code)+"```";
					}
					bot.sendMessage(message, msg);
				}catch(e){
					bot.sendMessage(message, "```js\n"+e+"```");
				}
			}else{
				console.log("bleh");
			}
		},
		"desc": "Eval",
		"usage": "eval ``code``",
		"cooldown": 10,
		"unlisted": true
	},
	"battle": {
		process: function(args, message, bot){
			if(args.length >= 2 && message.mentions.length >= 1){
				var to = message.mentions[0];
				if(users.hasOwnProperty(message.author.id)){
					if(users.hasOwnProperty(to.id)){
						if(users[message.author.id]["pvp"]){
							if(users[to.id]["pvp"]){
								bot.sendMessage(message, "<@"+to.id+">! "+message.author.name+" Challenged you to a battle!\nType ``#!baccept`` to accept the battle or ``#!brefuse`` to decline.");
								battles[useful.guid()] = {"usr": [message.author.id, to.id], "accept": false};
								return;
							}else{
								bot.sendMessage(message, message.author.name+"! "+to.name+" doesn't want to battle anyone!");
								return;
							}
						}else{
							bot.sendMessage(message, message.author.name+"! You've got your battles turned off!");
							return;
						}
					}else{
						bot.sendMessage(message, message.author.name+"! "+to.name+" couldn't be found anywhere!");
						return;
					}
				}else{
					bot.sendMessage(message, message.author.name+"! Please start your adventure first!");
					return;
				}
			}else{
				bot.sendMessage(message, message.author.name+"! Please tell me who you'd like to battle!");
				return;
			}
		},
		"desc": "Challenge someone to a PVP match.",
		"usage": "battle ``mention``",
		"cooldown": 10
	},
	"tbattle": {
		process: function(args, message, bot){
			if(users.hasOwnProperty(message.author.id)){
				if(Object.keys(battles).length > 0){
					for(i=0;i<Object.keys(battles).length;i++){
						var b = battles[Object.keys(battles)[i]];
						if(b["usr"].indexOf(message.author.id) == -1){
							var msg = "";
							if(users[message.author.id]["pvp"]){
								users[message.author.id]["pvp"] = false;
								msg = message.author.name+"! Your battles have been turned off.";
							}else{
								users[message.author.id]["pvp"] = true;
								msg = message.author.name+"! Your battles have been turned on.";
							}
							saveUsers();
							bot.sendMessage(message, msg);
							return;
						}else{
							bot.sendMessage(message, message.author.name+"! You can't turn off your battles when you're in a battle!");
							return;
						}
					}
				}else{
					var msg = "";
					if(users[message.author.id]["pvp"]){
						users[message.author.id]["pvp"] = false;
						msg = message.author.name+"! Your battles have been turned off.";
					}else{
						users[message.author.id]["pvp"] = true;
						msg = message.author.name+"! Your battles have been turned on.";
					}
					saveUsers();
					bot.sendMessage(message, msg);
					return;
				}
			}else{
				bot.sendMessage(message, message.author.id+"! Please start your adventure first!");
			}
		},
		"desc": "Toggle your battle status.",
		"usage": "tbattle",
		"cooldown": 10
	},
	"baccept": {
		process: function(args, message, bot){
			if(users.hasOwnProperty(message.author.id)){
				for(i=0;i<Object.keys(battles).length;i++){
					var b = battles[Object.keys(battles)[i]];
					if(b["usr"].indexOf(message.author.id) == 1){
						if(!b["accept"]){
							b["accept"] = true;
							b["turn"] = 1;
							bot.sendMessage(message, "<@"+b["usr"][0]+">! "+message.author.name+" Accepted your battle request!\n"+bot.users.get("id", b["usr"][1]).name+", use ``#!bfight`` to fight.");
							return;
						}else{
							return;
						}
					}
				}
			}else{
				bot.sendMessage(message, message.author.id+"! Please start your adventure first!");
				return;
			}
		},
		"desc": "Accept a battle reqest.",
		"usage": "baccept",
		"cooldown": 10
	},
	"brefuse": {
		process: function(args, message, bot){
			if(users.hasOwnProperty(message.author.id)){
				for(i=0;i<Object.keys(battles).length;i++){
					var b = battles[Object.keys(battles)[i]];
					var x = Object.keys(battles)[i];
					if(b["usr"].indexOf(message.author.id) == 1){
						try{
							if(delete battles[x]){
								delete battles[x];
								bot.sendMessage(message, "<@"+b["usr"][0]+">! "+message.author.name+" Declined your battle request!");
								return;
							}else{
								bot.sendMessage(message, "Something went wrong");
								return;
							}
							
						}catch(e){
							bot.sendMessage(message, "```js\n"+e+"```");
							return;
						}
					}
				}
			}else{
				bot.sendMessage(message, message.author.id+"! Please start your adventure first!");
				return;
			}
		},
		"desc": "Decline a battle request.",
		"usage": "brefuse",
		"cooldown": 10
	},
	"bfight": {
		process: function(args, message, bot){
			if(users.hasOwnProperty(message.author.id)){
				for(i=0;i<Object.keys(battles).length;i++){
					var b = battles[Object.keys(battles)[i]];
					if(b["usr"].indexOf(message.author.id) > -1){
						battle(args, message, bot, b, Object.keys(battles)[i]);
						return;
					}
				}
			}else{
				bot.sendMessage(message, message.author.id+"! Please start your adventure first!");
				return;
			}
		},
		"desc": "Fights in a battle.",
		"usage": "bfight",
		"cooldown": 5
	},
	"broadcast": {
		process: function(args, message, bot){
			if(message.author.id == settings["owner"]){
				for(i=0;i<bot.servers.length;i++){
					bot.sendMessage(bot.servers[i], args.splice(1, args.length));
					bot.sendMessage(message.channel, "Sent message to "+i+" out of "+bot.servers.length+" servers");
				}
			}
		},
		"desc": "Broadcasts a message",
		"usage": "broadcast",
		"cooldown": 5,
		"unlisted": true
	},
	"bdraw": {
		process: function(args, message, bot){
			if(users.hasOwnProperty(message.author.id)){
				for(i=0;i<Object.keys(battles).length;i++){
					var b = battles[Object.keys(battles)[i]];
					if(b["usr"].indexOf(message.author.id) > -1){
						battles[Object.keys(battles)[i]]["draw"] = false;
						battles[Object.keys(battles)[i]]["drawf"] = message.author.id;
						var msg = "";
						if(b["usr"].indexOf(message.author.id) == 0){
							msg += "<@"+b["usr"][1]+">";
						}else{
							msg += "<@"+b["usr"][0]+">";
						}

						msg += "! "+message.author.name+" wants to end the battle in a draw! Type ``"+settings['prefix']['main']+"bdaccept`` to accept!";

						bot.sendMessage(message, msg);

						return;
					}
				}
			}else{
				bot.sendMessage(message, message.author.name+"! Please start your adventure first!");
				return;
			}
		},
		"desc": "Requests a draw in a battle",
		"usage": "bdraw",
		"cooldown": 5
	},
	"bdaccept": {
		process: function(args, message, bot){
			if(users.hasOwnProperty(message.author.id)){
				for(i=0;i<Object.keys(battles).length;i++){
					var b = battles[Object.keys(battles)[i]];
					if(b["drawf"] != message.author.id){
						if(!b["draw"]){
							b["draw"] = true;

							try{
								if(delete battles[Object.keys(battles)[i]]){
									delete battles[Object.keys(battles)[i]];
									bot.sendMessage(message, "<@"+b["drawf"]+">! "+message.author.name+" Accepted your draw request and the battle has ended.");
								}else{
									bot.sendMessage(message, "Something went wrong");
									return;
								}
							}catch(e){
								bot.sendMessage(message, "```js\n"+e+"```");
								return;
							}
						}else{
							return;
						}
					}
				}
			}else{
				bot.sendMessage(message, message.author.id+"! Please start your adventure first!");
				return;
			}
		},
		"desc": "Accepts a draw request",
		"usage": "bdaccept",
		"cooldown": 5
	},
	"gcreate": {
		process: function(args, message, bot){
			try{
				if(args.length >= 2){

					if(users[message.author.id]["guild"] == undefined){
						users[message.author.id]["guild"] = "";
					}

					if(users[message.author.id]["guild"].length == 0){
						var name = args.splice(1, args.length).join(" ");
						if(name.length > 0){

							for(i=0;i<Object.keys(guilds).length;i++){
								if(name.toLowerCase() == guilds[Object.keys(guilds)[i]]["name"].toLowerCase()){
									bot.sendMessage(message, "Sory, "+message.author.name+", but a guild with that name already exists!");
									return;
								}
							}

							createGuild(message.author.id, name);

							var guild = guilds[users[message.author.id]["guild"]];

							var msg = "A Guild has been assembled by "+message.author.name+"!\n";
							var head = "========== [ "+fix.decodeHTML(guild["icon"])+" "+guild["name"]+"] ==========";
							msg += head+"\n";
							msg += "1 Member\nOpen\n";

							for(i=0;i<head.replace(fix.decodeHTML(guild["icon"]), "").length;i++){
								msg += "=";
							}

							bot.sendMessage(message, msg);
							return;
						}else{
							bot.sendMessage(message, message.author.name+"! Your guild name can't be empty.");
							return;
						}
					}else{
						bot.sendMessage(message, message.author.name+"! You're already in a guild.");
						return;
					}
				}else{
					bot.sendMessage(message, message.author.name+"! Your guild name can't be empty.");
					return;
				}
			}catch(e){
				bot.sendMessage(message, "```js\n"+e+"```");
			}
		},
		"desc": "Creates a guild",
		"usage": "gcreate ``name``",
		"cooldown": 10
	},
	"gset": {
		process: function(args, message, bot){
			try{

				if(users[message.author.id]["guild"] == undefined){
					users[message.author.id]["guild"] = "";
				}

				if(users[message.author.id]["guild"].length > 0){
					if(args.length >= 3){
						var guild = guilds[users[message.author.id]["guild"]];
						if(guild["owner"] == message.author.id){
							var item = args[1];
							var value = args.splice(2, args.length).join(" ");

							switch(item){
								case "icon":
									if(gicons.indexOf(fix.encodeHTML(value)) > -1){
										guild["icon"] = fix.encodeHTML(value);
										bot.sendMessage(message, message.author.name+" changed their guilds icon!");
									}else{
										bot.sendMessage(message, message.author.name+" tried to change their guild icon to a unknown icon!");
									}
									saveGuilds();
									break;
								case "open":
									if(value == "true" || value == "yes"){
										guild["open"] = true;
										bot.sendMessage(message, message.author.name+" set their guild to be open!");
									}else if(value == "false" || value == "no"){
										guild["open"] = false;
										bot.sendMessage(message, message.author.name+" set their guild to invite only!");
									}
									saveGuilds();
									break;
								default:
									bot.sendMessage(message, message.author.name+" tried to change a unknow item of their guild!");
									break;
							}

						}else{
							bot.sendMessage(message, message.author.name+"! Only the Guild owner can change it!");
						}
					}else{
						bot.sendMessage(message, message.author.name+"! You need to speficfy what to change!");
					}
				}else{
					bot.sendMessage(message, message.author.name+"! You're not in a guild!");
				}
			}catch(e){
				bot.sendMessage(message, "```js\n"+e+"```");
			}
		},
		"desc": "Change your guild.",
		"usage": "gset ``name`` ``value``",
		"cooldown": 5
	},
	"guild": {
		process: function(args, message, bot){
			try{

				if(users[message.author.id]["guild"] == undefined){
					users[message.author.id]["guild"] = "";
				}

				if(users[message.author.id]["guild"].length > 0){
					var guild = guilds[users[message.author.id]["guild"]];

					var msg = "";
					var head = "** "+fix.decodeHTML(guild["icon"])+" "+guild["name"]+"**";
					msg += head+"\n```tex\n";

					msg += "# Owner: "+bot.users.get("id", guild["owner"]).name+"\n";


					var membs = (guild["members"].length-1)-guild["elder"].length;
					msg += "# "+membs;

					if(membs > 1){
						msg += " members";
					}else{
						msg += " member";
					}

					msg += " and "+guild["elder"].length+" elder";
					if(guild["elder"].length > 1 || guild["elder"].length == 0){
						msg += "s";
					}
					
					if(guild["open"]){
						msg += ".\n# Guild is Open";
					}else{
						msg +=".\n# Guild is Invite Only.";
					}

					msg += "\n# Funds: "+guild["gold"]+" Gold";
					msg += "\n# Collective Guild level: "+getGuildLevel(users[message.author.id]["guild"])+"\n```";

					bot.sendMessage(message, msg);

				}else{
					bot.sendMessage(message, message.author.name+"! You're not in a guild!");
				}

			}catch(e){
				bot.sendMessage(message, "```js\n"+e+"```");
			}
		},
		"desc": "Shows information about a guild",
		"usage": "guild",
		"cooldown": 10
	},
	"ginvite": {
		process: function(args, message, bot){
			if(args.length >= 2 && message.mentions.length >= 1){
				var to = message.mentions[0];

				if(users[message.author.id]["guild"] == undefined){
					users[message.author.id]["guild"] = "";
				}

				if(users[to.id] == undefined){
					bot.sendMessage(message, message.author.name+", "+to.name+" hasn't started their adventure.");
					return;
				}

				if(users[message.author.id]["guild"].length > 0){
					var guild = guilds[users[message.author.id]["guild"]];
					if(guild["owner"] == message.author.id || guild["elder"].indexOf(message.author.id) > -1){

						if(users[to.id]["guild"] == undefined){
							users[to.id]["guild"] = "";
						}

						if(users[to.id]["guild"].length == 0){
							guild["invites"].push(to.id);
							bot.sendMessage(message, message.author.name+" invited "+to+" to their guild "+guild["name"]+"!\nType ``#!gjoin "+guild["name"]+"`` to join.");
						}else{
							bot.sendMessage(message, message.author.name+", "+bot.users.get("id", to.id).name+" is already in a guild!");
						}
					}else{
						bot.sendMessage(message, message.author.name+"! You can't invite members!");
					}
				}else{
					bot.sendMessage(message, message.author.name+"! You're not in a guild!");
				}
			}
		},
		"desc": "Invites a user to a guild",
		"usage": "ginvite ``@user``",
		"cooldown": 10
	},
	"gjoin": {
		process: function(args, message, bot){
			if(args.length >= 2){
				var name = args.splice(1, args.length).join(" ");

				if(users[message.author.id]["guild"] == undefined){
					users[message.author.id]["guild"] = "";
				}

				if(users[message.author.id]["guild"].length > 0){
					bot.sendMessage(message, message.author.name+"! You're already in a guild!");
				}else{

					var guildObj = [];

					for(i=0;i<Object.keys(guilds).length;i++){
						guildObj.push(guilds[Object.keys(guilds)[i]]["name"]);
					}

					var results = filter.filter(guildObj, name.toLowerCase());

					for(i=0;i<Object.keys(guilds).length;i++){
						if(name.toLowerCase() == guilds[Object.keys(guilds)[i]]["name"].toLowerCase()){
							var guild = guilds[Object.keys(guilds)[i]];
							if(!guild["open"]){
								if(guild["invites"].indexOf(message.author.id) > -1){
									users[message.author.id]["guild"] = Object.keys(guilds)[i];
									guild["members"].push(message.author.id);
									guild["invites"].splice(guild["invites"].indexOf(message.author.id), 1);
									saveUsers();
									saveGuilds();
									bot.sendMessage(message, message.author.name+" joined a guild!");
									return;
								}else{
									bot.sendMessage(message, "Sorry, "+message.author.name+", but this guild is invite-only.");
									return;
								}
							}else{
								users[message.author.id]["guild"] = Object.keys(guilds)[i];
								guild["members"].push(message.author.id);
								saveUsers();
								saveGuilds();
								bot.sendMessage(message, message.author.name+" joined a guild!");
								return;
							}
						}
					}

					if(results.length > 0){
						var guildsFound = [];
						var msg = "";
						msg += "Found "+results.length+" guilds.\n";
						for(i=0;i<results.length;i++){
							guildsFound.push("``"+results[i]+"``");
						}
						msg += guildsFound.sort().join(", ");
						bot.sendMessage(message, msg);
						return;
					}
				}
			}
		},
		"desc": "Joins a guild",
		"usage": "gjoin ``guild``",
		"cooldown": 10
	},
	"gleave": {
		process: function(args, message, bot){
			if(users[message.author.id]["guild"] == undefined){
				users[message.author.id]["guild"] = "";
			}

			if(users[message.author.id]["guild"].length > 0){

				var guild = guilds[users[message.author.id]["guild"]];

				if(guild["owner"] == message.author.id){

					bot.sendMessage(message, message.author.name+" disbanded their guild!");

					var gId = users[message.author.id]["guild"];

					for(i=0;i<guild["members"].length;i++){
						users[guild["members"][i]]["guild"] = "";
					}

					delete guilds[gId];
					
					saveUsers();
					saveGuilds();
					

				}else{

					bot.sendMessage(message, message.author.name+" left their guild.");

					if(guild["elder"].indexOf(message.author.id) > -1){
						guilds[users[message.author.id]["guild"]]["elder"].splice(guild["elder"].indexOf(message.author.id), 1);
					}
					guilds[users[message.author.id]["guild"]]["members"].splice(guild["members"].indexOf(message.author.id), 1);
					users[message.author.id]["guild"] = "";
					saveGuilds();
					saveUsers();
					
				}

				//bot.sendMessage(message, "LOL! "+message.author.name+" YOU WANT TO LEAVE A GUILD?! TOUGH FUCKIN' LUCK LOVE, YA AINT. (yet)");
			}else{
				bot.sendMessage(message, message.author.name+"! You're not in a guild.");
			}
		},
		"desc": "Leaves a guild",
		"usage": "gleave",
		"cooldown": 10
	},
	"gmembers": {
		process: function(args, message, bot){
			try{
				if(users[message.author.id]["guild"] == undefined){
					users[message.author.id]["guild"] = "";
				}

				if(users[message.author.id]["guild"].length > 0){

					var as = [];

					var guild = guilds[users[message.author.id]["guild"]];

					var msg = "";
					var head = "** "+fix.decodeHTML(guild["icon"])+" "+guild["name"]+"** members";
					msg += head+"\n```diff\n";

					msg += "! Owner \n-   "+bot.users.get("id", guild["owner"]).name+"\n";
					as.push(guild["owner"]);

					msg += "! Elders\n";

					if(guild["elder"].length == 0){
						msg += "%   None\n";
					}else{
						var el = [];
						for(i=0;i<guild["elder"].length;i++){
							el.push(bot.users.get("id", guild["elder"][i]).name);
							as.push(guild["elder"][i]);
						}
						el.sort();
						for(i=0;i<el.length;i++){
							msg += "-   "+el[i]+"\n";
						}
					}

					msg += "! Members\n";

					var el = [];
					for(i=0;i<guild["members"].length;i++){
						if(as.indexOf(guild["members"][i]) == -1){
							el.push(bot.users.get("id", guild["members"][i]).name);
						}
					}
					el.sort();
					for(i=0;i<el.length;i++){
						msg += "-   "+el[i]+"\n";
					}

					msg += "```";
					bot.sendMessage(message, msg);

				}else{
					bot.sendMessage(message, message.author.name+"! You're not in a guild!");
				}

			}catch(e){
				bot.sendMessage(message, "```js\n"+e+"```");
			}
		},
		"desc": "Shows guild members",
		"usage": "gmembers",
		"cooldown": 10
	},
	"grole": {
		process: function(args, message, bot){
			if(args.length >= 2 && args.length < 3){
				bot.sendMessage(message, message.author.name+", you need to speficfy a role!");
				return;
			}else if(args.length >= 3 && message.mentions.length >= 1){
				var to = message.mentions[0];

				if(users[message.author.id]["guild"] == undefined){
					users[message.author.id]["guild"] = "";
				}


				if(users[message.author.id]["guild"].length > 0){
					var guild = guilds[users[message.author.id]["guild"]];

					if(guild["owner"] == message.author.id){
						if(guild["members"].indexOf(to.id) > -1){
							var role = args.splice(2, args.length).join(" ").toLowerCase();
							//bot.sendMessage(message, "r: "+role);
							if(role == "member"){
								if(guild["elder"].indexOf(to.id) > -1){
									guilds[users[message.author.id]["guild"]]["elder"].splice(guild["elder"].indexOf(to.id), 1);
									bot.sendMessage(message, message.author.name+" changed the role of "+to.name+" to "+helper.capFirst(role));
									saveGuilds();
									return;
								}else if(guild["owner"] == to.id){
									bot.sendMessage(message, message.author.name+", You can't remove your ownership.");
									return;
								}
							}else if(role == "elder"){
								if(guild["members"].indexOf(to.id) > -1){
									guilds[users[message.author.id]["guild"]]["elder"].push(to.id);
									
									bot.sendMessage(message, message.author.name+" changed the role of "+to.name+" to "+helper.capFirst(role));
									saveGuilds();
									return;
								}else if(guild["owner"] == to.id){
									bot.sendMessage(message, message.author.name+", You can't remove your ownership.");
									return;
								}
							}else if(role == "owner"){
								if(guild["member"].indexOf(to.id) > -1){
									guilds[users[message.author.id]["guild"]]["owner"] = to.id;
									bot.sendMessage(message, message.author.name+" changed the role of "+to.name+" to "+helper.capFirst(role));
									saveGuilds();

									return;
								}else if(guild["elder"].indexOf(to.id) > -1){
									guilds[users[message.author.id]["guild"]]["elder"].splice(guild["elder"].indexOf(to.id), 1);
									guilds[users[message.author.id]["guild"]]["owner"] = to.id;
									bot.sendMessage(message, message.author.name+" changed the role of "+to.name+" to "+helper.capFirst(role));
									saveGuilds();

									return;
								}
							}else{
								bot.sendMessage(message, message.author.name+" tried to change "+to.name+"'s role into a unknown role.");
							}
						}else{
							bot.sendMessage(message, message.author.name+", "+to.name+" isn't in your guild.");
						}
					}else{
						bot.sendMessage(message, message.author.name+", You can't change roles.");
					}
				}else{
					bot.sendMessage(message, message.author.name+"! You're not in a guild.");
				}

			}else{
				bot.sendMessage(message, message.author.name+", you need to speficfy who's role you want to change!");
			}
		},
		"desc": "Sets the role of a guild member.",
		"usage": "grole ``@user`` ``role``",
		"cooldown": 10
	},
	"gkick": {
		process: function(args, message, bot){
			if(args.length >= 2 && message.mentions.length >= 1){
				var to = message.mentions[0];

				if(users[message.author.id]["guild"] == undefined){
					users[message.author.id]["guild"] = "";
				}


				if(users[message.author.id]["guild"].length > 0){
					var guild = guilds[users[message.author.id]["guild"]];

					if(guild["owner"] == message.author.id){
						if(guild["members"].indexOf(to.id) > -1){
							guilds[users[message.author.id]["guild"]]["members"].splice(guild["members"].indexOf(to.id), 1);

							if(guild["elder"].indexOf(to.id) > -1){
								guilds[users[message.author.id]["guild"]]["elder"].splice(guild["elder"].indexOf(to.id), 1);
							}

							bot.sendMessage(message, message.author.name+" kicked "+to.name+" from their guild.");

							users[to.id]["guild"] = "";
							saveGuilds();
							saveUsers();

						}else{
							bot.sendMessage(message, message.author.name+", "+to.name+" isn't in your guild.");
						}
					}else{
						bot.sendMessage(message, message.author.name+" You can't kick members.");
					}
				}else{
					bot.sendMessage(message, message.author.name+", You're not in a guild!");
				}

			}else{
				bot.sendMessage(message, message.author.name+", You have to specify who to kick.");
			}
		},
		"desc": "Kick a user from a guild",
		"usage": "gkick ``@user``",
		"cooldown": 10
	},

	"addicon": {
		process: function(args, message, bot){
			if(message.channel.server.id == "172382467385196544"){
				if(helper.checkRole(message, "Knight")){
					if(args.length >= 2){
						var icon = fix.encodeHTML(args.splice(1, args.length).join(" "));
						if(gicons.indexOf(icon) == -1){
							gicons.push(icon);
							fs.writeFile("./data/gicons.json", JSON.stringify(gicons), 'utf8', function(err){
								if(err){ bot.sendMessage(message, "Whoops! An error occured! Please report it in the Official server! ```js\n"+err+"```"); return;}
								bot.sendMessage(message, message.author.name+" Added the icon "+fix.decodeHTML(icon));
							});
						}else{
							bot.sendMessage(message, "Icon exists, "+message.author.name);
						}
					}
				}
			}
		},
		"desc": "Adds a guild icon",
		"usage": "addicon ``icon``",
		"cooldown": 10,
		"unlisted": true
	},
	"delicon": {
		process: function(args, message, bot){
			if(message.channel.server.id == "172382467385196544"){
				if(helper.checkRole(message, "Knight")){
					if(args.length >= 2){
						var icon = fix.encodeHTML(args.splice(1, args.length).join(" "));
						if(gicons.indexOf(icon) > -1){
							gicons.splice(gicons.indexOf(icon), 1);
							fs.writeFile("./data/gicans.json", JSON.stringify(gicons), 'utf8', function(err){
								if(err){ bot.sendMessage(message, "Whoops! An error occured! Please report it in the Official server! ```js\n"+err+"```"); return;}
								bot.sendMessage(message, message.author.name+" Removed the icon "+fix.decodeHTML(icon));
							});
						}else{
							bot.sendMessage(message, "Icon doesn't exist, "+message.author.name);
						}
					}
				}
			}
		},
		"desc": "Removes a guild icon",
		"usage": "delicon ``icon``",
		"cooldown": 10,
		"unlisted": true
	},
	"icons": {
		process: function(args, message, bot){
			bot.sendMessage(message, fix.decodeHTML(gicons.join(" ")));
		},
		"desc": "Shows a list of available guild icons.",
		"usage": "icons",
		"cooldown": 10
	}
};

exports.defaults = defaults;