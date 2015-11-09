var status = {};
var goBackTo;


function fetch_feed(usernames, callback) {
    var usernamesString = "";
    for (var i = usernames.length - 1; i >= 0; i--) {
        usernamesString += usernames[i]+",";
        status[usernames[i]] = false;
    }
    if(usernamesString !== ""){
        $.getJSON( "https://api.twitch.tv/kraken/streams?offset=0&limit=500&channel="+usernamesString).done(
            function(response) {
                var streams = response.streams;
                for (var i = streams.length - 1; i >= 0; i--) {
                    var stream = streams[i];

                    stream.username = stream.channel.name;

                    prepareToLurk(stream);

                    status[stream.username] = true;
                }
                if (usernames.length){
                    var username;
                    for (var i = usernames.length - 1; i >= 0; i--) {
                        username = usernames[i];
                        if(! status[usernames[i]]) {
                            findAndCloseStreamer(username)
                        }
                    }
                }
                callback(streams);
            }
        );
    }
}

function findAndCloseStreamer(username) {
	console.log('finding and closing '+username);
    chrome.tabs.query({url:'*://*.twitch.tv/'+username},function(tabs){
    	console.log(tabs);
        var tab;
        if(tabs.length <= 0) {
            return;
        }
        for(var i=0;i < tabs.length; i++){
            tab = tabs[i];
            console.log(tab);
            if(tab.muted || tab.mutedInfo.muted) {
                closeTab(tab);
            }
        }
    });
}

function closeTab(tab) {
    chrome.tabs.remove(tab.id);
}

function prepareToLurk(stream) {
    chrome.tabs.query({url:'*://*.twitch.tv/'+stream.username},function(tabs){
        if(tabs.length === 0) {
            console.log('not in that')
            autoLurk(stream);
        } else {
            console.log('in that strim')
        }
    });
}

function autoLurk(stream) {
    chrome.tabs.query({active:true},function(tabs){
        goBackTo = tabs[0].id;
        var newTab = {
            url:'http://twitch.tv/'+stream.username,
            active:true
        };
        chrome.tabs.create(newTab, onTabCreate);
    });
}

function onTabCreate(tab) {
    chrome.tabs.update(tab.id,{muted:true});
    // setTimeout(1000,function(){})
    chrome.tabs.update(goBackTo,{active:true});
}


function onRequest(request, sender, callback) {
    if (request.action == 'fetch_feed') {
        fetch_feed(request.usernames, callback);
      }
}

// Wire up the listener.
chrome.extension.onRequest.addListener(onRequest);


var pollInterval = 1000 * 60; // 1 minute, in milliseconds

function poller(){
    console.log('polling');
    chrome.storage.sync.get('twitchStreams', function(storage){
      if(storage.twitchStreams){
          console.log('fetching');
        fetch_feed(storage.twitchStreams, function(){})
      }
      window.setTimeout(poller, pollInterval);
    });
}

poller();
