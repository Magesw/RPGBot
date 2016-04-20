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

var Discord = require("discord.js");
var fs = require("fs");
var chalk = require('chalk');
var request = require("request");

var mybot = new Discord.Client();

var settings = require("./settings.json");

var defaults = require("./cmds/defaults.js").defaults;

var commands = extend({}, defaults);

console.log(commands);

var stdin = process.openStdin();

var lastExecTime = {};
setInterval(function(){ 
	lastExecTime = {}; 

	var data = {"key": "", "servercount": mybot.servers.length};

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
		mybot.sendMessage(settings["owner"], "Sent data.");
	});


	
},3600000);


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
						bot.sendMessage(message, msg);
					}catch(e){
						bot.sendMessage(message, "```js\n"+e+"```");
					}
				}else{
					console.log("fuck you");
				}
			}else if(args[0] == settings["prefix"]["main"]+"bstats"){

				if(message.author.id == settings["owner"]){

					try{
						var head = "======== ["+mybot.user.name+" Stats] ========\n";
						var msg = head+"\n";

						var large = 0;
						var text = 0;

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

						msg += "Connected to "+large+" large servers and "+(mybot.servers.length-large)+" small servers.\n";
						msg += "In total, there's "+text+" text channels and "+mybot.privateChannels.length+" private channels.\n";
						msg += "There's "+mybot.users.length+" users in the cache.\n";
						msg += "Using a total of "+(process.memoryUsage().rss/1024/1000).toFixed(2)+"MB of memory.";

						console.log(msg);

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

				console.log(args);
				var index = Object.keys(commands).indexOf(cmd);

				if(index > -1){
					commands[cmd].process(args, message, mybot);
				}
			}
		}
	}catch(e){
    	console.log(chalk.red(e.stack));
	}
} );

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
	var data = {"key": "", "servercount": mybot.servers.length};

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
		mybot.sendMessage(settings["owner"], "Sent data.");
	});
});

mybot.on("serverCreated", function(server){
	console.log("Joined server: "+server.name);
});

stdin.addListener("data", function(d) {
    mybot.sendMessage(mybot.channels[0], d.toString().trim());
});