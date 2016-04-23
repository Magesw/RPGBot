var Discord = require("discord.js");
var fs = require("fs");
var chalk = require('chalk');
var request = require("request");

var mybot = new Discord.Client();

var settings = require("./settings.json");

var defaults = require("./cmds/defaults.js").defaults;

var commands = extend({}, defaults);

var stdin = process.openStdin();

var srvs = 0;

var cmdIndex = [];
var cmdUsage = [];

function cmUsage(cmd){
	if(cmdIndex.indexOf(cmd) > -1){
		cmdUsage[cmdIndex.indexOf(cmd)]++;
	}else{
		cmdIndex.push(cmd);
		cmdUsage.push(1);
	}
}

var lastExecTime = {};
setInterval(function(){ 
	var data = {"key": "mackan92bb389fc9e1aa28", "servercount": mybot.servers.length};

	request({
	    url: "https://www.carbonitex.net/discord/data/botdata.php",
	    method: "POST",
	    json: true,
   		headers: {
        	"content-type": "application/json",
    	},
    	body: JSON.stringify(data)
	}, function(err){
		if(err){ mybot.sendMessage(settings["owner"], err); return;}
		var msg = "Sent data.\n";
			msg += "Server count: "+mybot.servers.length+"\n";

		if(mybot.servers.length > srvs){
			msg += "(+ "+mybot.servers.length-srvs+")";
		}else if(mybot.servers.length < srvs){
			msg += "(- "+((mybot.servers.length-srvs)*-1)+")";
		}else{
			msg += "(+/- 0)";
		}

		mybot.sendMessage(settings["owner"], msg);
		srvs = mybot.servers.length;

	});


	
},3600000);


setInterval(function(){
	lastExecTime = {};
}, 36000000);

var firstTime = {};

function extend(target) {
    var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source){
        for(var prop in source){
            target[prop] = source[prop];
        }
    });
    return target;
}

function init(){
	var now = new Date().valueOf();

	for(i=0;i<Object.keys(commands).length;i++){
		firstTime[Object.keys(commands)[i]] = {};
	}

	if(settings['bot']['token'].length > 0){
		mybot.loginWithToken(settings['bot']['token'], function(err, token){
			if(err){ throw err; }
			console.log(chalk.green("Logged in."));
		});
	}else{
		mybot.login(settings['bot']['email'], settings['bot']['pass'], function(err, token){
			if(err){ throw err; }
			console.log(chalk.green("Logged in"));
			console.log(chalk.red("Warning! Bots running on user accounts will get banned soon."));
		});
	}
}

mybot.on("message", function(message){
	try{
		var ignore = require("./data/ignored.json");
		if(ignore.indexOf(message.author.id) == -1){

			args = message.content.split(" ");

			if(args[0] == settings['prefix']['main']+"reload"){
				if(message.author.id == settings["owner"]){
					delete require.cache[require.resolve('./cmds/defaults.js')];

					commands = "";
					defaults = "";
					defaults = require("./cmds/defaults.js").defaults;

					commands = extend({}, defaults);

					mybot.sendMessage(message, "Reloaded all modules");
				}
			}else if(args[0] == settings['prefix']['main']+"eval"){
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
						mybot.sendMessage(message, msg);
					}catch(e){
						mybot.sendMessage(message, "```js\n"+e+"```");
					}
				}else{
					console.log("bleh");
				}
			}else if(args[0] == settings["prefix"]["main"]+"bstats"){

				if(message.author.id == settings["owner"]){

					try{
						var head = "!======== ["+mybot.user.name+" Stats] ========!\n";
						var msg = "```diff\n"+head+"\n";

						var large = 0;
						var text = 0;
						var commandUsage = 0;

						for(i=0;i<mybot.servers.length;i++){
							if(mybot.servers[i].members.length >= 250){
								large++;
							}
						}

						for(i=0;i<mybot.channels.length;i++){
							if(mybot.channels[i].type == "text"){
								text++;
							}
						}



						for(i=0;i<cmdUsage.length;i++){
							commandUsage = commandUsage+cmdUsage[i];
						}

						msg += "+ Connected to "+large+" large servers and "+(mybot.servers.length-large)+" small servers.\n";
						msg += "+ In total, there's "+text+" text channels and "+mybot.privateChannels.length+" private channels.\n";
						msg += "+ There's "+mybot.users.length+" users in the cache.\n";
						msg += "+ Using a total of "+(process.memoryUsage().rss/1024/1000).toFixed(2)+"MB of memory.\n";
						msg += "+ There's been "+commandUsage+" commands used. ("+(commandUsage/(Math.round(mybot.uptime / 60000))).toFixed(2)+"/minute)\n";
						msg += "+ Globally, "+Object.keys(require("./data/users.json")).length+" users have started their adventure.\n";
						msg += "+ There's a total of "+Object.keys(require("./data/guilds.json")).length+" guilds globally.\n";
						msg += "+ There's "+Object.keys(require("./data/adventures.json")).length+" adventures right now.";

						var tmpm = "";

						for(i=0;i<head.length-2;i++){
							tmpm += "=";
						}

						msg += "\n!"+tmpm+"!```";

						mybot.sendMessage(message, msg);
					}catch(e){
						console.log(e);
					}
				}

			}else if(args[0].substring(0, settings['prefix']['main'].length) == settings['prefix']['main'] || settings['prefix']['botname'] && args[0] == "<@"+mybot.user.id+">" || settings['prefix']['botname'] && args[0].toLowerCase() == mybot.user.name.toLowerCase()){
				var cmd;
				if(settings['prefix']['botname'] && args[0] == "<@"+mybot.user.id+">"){
					cmd = args[1].toLowerCase();
					args.splice(1, args.length);
				}else if(settings['prefix']['botname'] && args[0].toLowerCase() == mybot.user.name.toLowerCase()){
					cmd = args[1].toLowerCase();
					args.splice(1, args.length);
				}else{
					cmd = args[0].replace(settings['prefix']['main'], "").toLowerCase();
				}

				var index = Object.keys(commands).indexOf(cmd);

				if(index > -1){

					var now = new Date().valueOf();
					if(!lastExecTime.hasOwnProperty(cmd)){
						lastExecTime[cmd] = {};
					}

					if(!lastExecTime[cmd].hasOwnProperty(message.author.id)){
						lastExecTime[cmd][message.author.id] = new Date().valueOf();
					}

					if(message.author.id != settings["owner"]){
						if(commands[cmd].cooldown > 120){
							if((now/10) < (lastExecTime[cmd][message.author.id]+(commands[cmd].cooldown*1000)/10) && firstTime[cmd].hasOwnProperty(message.author.id)){
								if(Math.round(((lastExecTime[cmd][message.author.id] + commands[cmd].cooldown * 1000) - now) / 1000) > 0){
									console.log("meh");
									mybot.sendMessage(message, "Young warrior "+message.author.name.replace(/@/g, '@\u200b')+"!, Please wait! "+Math.round(((lastExecTime[cmd][message.author.id] + commands[cmd].cooldown * 1000) - now) / 1000) + " seconds", function(e, m){ mybot.deleteMessage(m, {"wait": 6000}); });
									if (!message.channel.isPrivate) mybot.deleteMessage(message, {"wait": 10000});
									return;
								}else{
									console.log("bleh");
									cmUsage(cmd);
									commands[cmd].process(args, message, mybot);
									lastExecTime[cmd][message.author.id] = now;
									firstTime[cmd][message.author.id] = true;
								}
							}else{
								console.log("bleh");
								cmUsage(cmd);
								commands[cmd].process(args, message, mybot);
								lastExecTime[cmd][message.author.id] = now;
								firstTime[cmd][message.author.id] = true;
							}
						}else{
							if(now < lastExecTime[cmd][message.author.id]+commands[cmd].cooldown*1000 && firstTime[cmd].hasOwnProperty(message.author.id)){
							
								console.log("meh");
								mybot.sendMessage(message, "Young warrior "+message.author.name.replace(/@/g, '@\u200b')+"!, Please wait! "+Math.round(((lastExecTime[cmd][message.author.id] + commands[cmd].cooldown * 1000) - now) / 1000) + " seconds", function(e, m){ mybot.deleteMessage(m, {"wait": 6000}); });
								if (!message.channel.isPrivate) mybot.deleteMessage(message, {"wait": 10000});
								return;
							}else{
								console.log("bleh");
								cmUsage(cmd);
								commands[cmd].process(args, message, mybot);
								lastExecTime[cmd][message.author.id] = now;
								firstTime[cmd][message.author.id] = true;
							}
						}
					}else{
						cmUsage(cmd);
						commands[cmd].process(args, message, mybot);
					}

					
					//commands[cmd].process(args, message, mybot);
				}
			}
		}
	}catch(e){
    	console.log(chalk.red(e.stack));
	}
});

init();

mybot.on("error", function(err){
	console.log(chalk.red("[Error] "+err));
});

mybot.on("warn", function(warn){
	console.log(chalk.yellow("[Warn] "+warn));
});

mybot.on("ready", function(){
	console.log(chalk.green("Ready."));
	mybot.setPlayingGame("Type #!stats to start your adventure!");
	var data = {"key": "mackan92bb389fc9e1aa28", "servercount": mybot.servers.length};

	var srvs = mybot.servers.length;

	request({
	    url: "https://www.carbonitex.net/discord/data/botdata.php",
	    method: "POST",
	    json: true,
   		headers: {
        	"content-type": "application/json",
    	},
    	body: JSON.stringify(data)
	}, function(err){
		if(err){ mybot.sendMessage(settings["owner"], err); return;}
		mybot.sendMessage(settings["owner"], "Sent data.\nServers: "+srvs);
	});
});

mybot.on("serverCreated", function(server){
	console.log("Joined server: "+server.name);
});

stdin.addListener("data", function(d){
    mybot.sendMessage(mybot.channels, d.toString().trim());
});