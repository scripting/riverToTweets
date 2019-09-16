var myVersion = "0.5.3", myProductName = "riverToTweets";
 
	//The MIT License (MIT)
	
	//Copyright (c) 2015-2018 Dave Winer
	
	//Permission is hereby granted, free of charge, to any person obtaining a copy
	//of this software and associated documentation files (the "Software"), to deal
	//in the Software without restriction, including without limitation the rights
	//to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	//copies of the Software, and to permit persons to whom the Software is
	//furnished to do so, subject to the following conditions:
	
	//The above copyright notice and this permission notice shall be included in all
	//copies or substantial portions of the Software.
	
	//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	//IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	//FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	//AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	//LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	//OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	//SOFTWARE.
	
	//structured listing: http://scripting.com/listings/rivertotweets.html
	
const fs = require ("fs");
const request = require ("request");
const utils = require ("daveutils");

var riverStats = { 
	ctStarts: 0, whenLastStart: new Date (0),
	ctReadErrors: 0, ctReads: 0, ctBytesRead: 0,
	rivers: new Object ()
	};
var flStatsChanged = false;
var riverConfig;

function statsChanged () { 
	flStatsChanged = true;
	}
function httpReadUrl (url, callback) {
	request (url, function (error, response, body) {
		if (!error && (response.statusCode == 200)) {
			callback (body) 
			}
		else { //6/24/15 by DW
			
			try {
				var jstruct = JSON.parse (response.body);
				var data = JSON.parse (jstruct.data);
				console.log ("httpReadUrl: Twitter says == " + data.errors [0].message);
				}
			catch (err) {
				}
			
			
			callback (undefined) 
			}
		});
	}
function readConfig (callback) {
	fs.readFile ("config.json", "utf8", function (err, data) {
		var dataAboutRead = {
			Body: data
			};
		if (err) {
			console.log ("readConfig: error == " + utils.jsonStringify (err));
			}
		else {
			riverConfig = JSON.parse (dataAboutRead.Body);
			riverStats.ctReads++;
			riverStats.ctBytesRead += dataAboutRead.Body.length;
			}
		if (callback != undefined) {
			callback ();
			}
		});
	}
function readStats (callback) {
	fs.readFile ("stats.json", "utf8", function (err, data) {
		var dataAboutRead = {
			Body: data
			};
		if (err) {
			}
		else {
			var storedPrefs = JSON.parse (dataAboutRead.Body);
			for (var x in storedPrefs) {
				riverStats [x] = storedPrefs [x];
				}
			riverStats.ctReads++;
			riverStats.ctBytesRead += dataAboutRead.Body.length;
			}
		if (callback != undefined) {
			callback ();
			}
		});
	}
function writeStats () {
	fs.writeFile ("stats.json", utils.jsonStringify (riverStats), function (err) {
		});
	}
function checkOneRiver (theConfig, callback) {
	function sendTweet (s, callback) {
		s = utils.decodeXml (s); //7/5/18 by DW
		s = utils.replaceAll (s, "&rsquo;", "'"); //7/5/18 by DW
		if (riverConfig.flTweetsEnabled) {
			var inReplyToId = 0;
			function encode (s) {
				return (encodeURIComponent (s));
				}
			var apiUrl = riverConfig.urlTwitterGateway + "tweet?oauth_token=" + encode (theConfig.token) + "&oauth_token_secret=" + encode (theConfig.tokenSecret) + "&status=" + encode (s) + "&in_reply_to_status_id=" + encode (inReplyToId);
			httpReadUrl (apiUrl, function (s) {
				if (callback != undefined) {
					callback ();
					}
				});
			}
		}
	if (theConfig.enabled) {
		var theStats = riverStats.rivers [theConfig.name];
		if (theStats === undefined) { //cool! a new river
			theStats = {
				ctRiverChecks: 0, whenLastCheck: new Date (0),
				ctStories: 0, whenLastStory: new Date (0),
				idsSeen: new Object ()
				};
			riverStats.rivers [theConfig.name] = theStats;
			}
		httpReadUrl (theConfig.urlRiver, function (s) {
			if (s !== undefined) {
				try {
					var now = new Date (), prefix = "onGetRiverStream (", idsStruct = {}, flNoTweetsSentYet = true;
					//stats
						riverStats.ctReads++;
						riverStats.ctBytesRead += s.length;
						statsChanged ();
					for (var x in theStats.idsSeen) { //create idsStruct -- at the end it will contain ids that are in the array, but not in the river
						idsStruct [x] = true;
						}
					s = utils.stringDelete (s, 1, prefix.length);
					s = utils.stringMid (s, 1, s.length - 1); //pop off right paren at end
					var jstruct = JSON.parse (s);
					var feeds = jstruct.updatedFeeds.updatedFeed;
					for (var i = 0; i < feeds.length; i++) {
						var feed = feeds [i];
						for (var j = 0; j < feed.item.length; j++) {
							var item = feed.item [j];
							if (theStats.idsSeen [item.id] == undefined) {
								if ((!riverConfig.flAtMostOneTweetPerMinute) || flNoTweetsSentYet) {
									var flTitleInArray = false;
									for (var x in theStats.idsSeen) { //set flTitleInArray
										if (theStats.idsSeen [x].title == item.title) { 
											flTitleInArray = true;
											break;
											}
										}
									theStats.idsSeen [item.id] = {
										title: item.title,
										when: now
										};
									theStats.ctStories++;
									theStats.whenLastStory = now;
									statsChanged ();
									if (!flTitleInArray) { //avoid literal duplicates
										console.log (theConfig.name + ": " + item.title);
										sendTweet (item.title + ". " + item.link);
										flNoTweetsSentYet = false; //11/22/14 by DW
										}
									}
								}
							else {
								idsStruct [item.id] = false; //if it's false it's still in the river, and can't be deleted from the theStats struct
								}
							}
						}
					var ctRemoved = 0, ctInArray = 0;
					for (var x in idsStruct) {
						if (idsStruct [x]) {
							ctRemoved++;
							delete theStats.idsSeen [x];
							}
						ctInArray++;
						}
					if (ctRemoved > 0) {
						console.log (ctRemoved + " items out of " + ctInArray + " were removed from the idsSeen struct.");
						}
					theStats.ctRiverChecks++;
					theStats.whenLastCheck = now;
					statsChanged ();
					}
				catch (err) {
					console.log ("checkOneRiver: river == " + theConfig.name + ", error == " + err.message);
					}
				}
			if (callback !== undefined) {
				callback ();
				}
			});
		}
	else {
		if (callback !== undefined) {
			callback ();
			}
		}
	}
function checkAllRivers (callback) {
	function doNextRiver (ix) {
		if (ix < riverConfig.rivers.length) {
			try {
				checkOneRiver (riverConfig.rivers [ix], function () {
					doNextRiver (ix + 1);
					});
				}
			catch (err) {
				console.log ("doNextRiver, error in checkOneRiver (" + ix + "), error == " + err.message);
				doNextRiver (ix + 1);
				}
			}
		else {
			if (callback !== undefined) {
				callback ();
				}
			}
		}
	doNextRiver (0);
	}
function everyMinute () { 
	var now = new Date ();
	console.log ("\neveryMinute: " + now.toLocaleTimeString ());
	readConfig (function () {
		checkAllRivers (function () {
			statsChanged ();
			});
		});
	}
function everySecond () {
	var now = new Date ();
	if (flStatsChanged) {
		flStatsChanged = false;
		writeStats ();
		}
	}
function startup () {
	readConfig (function () {
		readStats (function () {
			riverStats.ctStarts++;
			riverStats.whenLastStart = new Date ();
			statsChanged ();
			console.log ("\n" + myProductName + " v" + myVersion + ", using " + riverConfig.urlTwitterGateway);
			everyMinute (); //do one check to get started
			setInterval (everySecond, 1000); 
			utils.runAtTopOfMinute (function () {
				setInterval (everyMinute, 60000); 
				everyMinute ();
				});
			});
		});
	}
startup ();
