var cache = {};
var goBackTo;

function fetch_feed(usernames, callback) {
  var usernamesString = "";
  for (var i = usernames.length - 1; i >= 0; i--) {
    usernamesString += usernames[i]+","
  };
  if(usernamesString !== ""){
    $.getJSON( "https://api.twitch.tv/kraken/streams?offset=0&limit=500&channel="+usernamesString, function(response) {
      var streams = response.streams;
      for (var i = streams.length - 1; i >= 0; i--) {
        var stream = streams[i];

        stream.username = stream.channel.name;

        var status = cache[stream.channel.name];

        if(!status){
          prepareToLurk(stream);
        }

        cache[stream.username] = true;
        var index = usernames.indexOf(stream.username);
        if (index > -1) {
          usernames.splice(index, 1);
        }
      };

      if (usernames.length){
        for (var i = usernames.length - 1; i >= 0; i--) {
          cache[usernames[i]] = false;
          streams.push({"username": usernames[i]})
        };
      }

      callback(streams);
    });
  }
}

function prepareToLurk(stream) {
    chrome.tabs.query({url:'*://*.twitch.tv/'+stream.username},function(tabs){
        if(tabs.length === 0) {
            autoLurk(stream);
        } else {
            //already on that strim
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


var pollInterval = 1000 * 10; // 1 minute, in milliseconds

function poller(){
    chrome.storage.sync.get('twitchStreams', function(storage){
      if(storage.twitchStreams){
        fetch_feed(storage.twitchStreams, function(){})
      }
      window.setTimeout(poller, pollInterval);
    });
}

window.setTimeout(poller, pollInterval);

function getRandomToken() {
    // E.g. 8 * 32 = 256 bits token
    var randomPool = new Uint8Array(32);
    crypto.getRandomValues(randomPool);
    var hex = '';
    for (var i = 0; i < randomPool.length; ++i) {
        hex += randomPool[i].toString(16);
    }
    // E.g. db18458e2782b2b77e36769c569e263a53885a9944dd0a861e5064eac16f1a
    return hex;
}

chrome.storage.sync.get('userid', function(items) {
    var userid = items.userid;
    if (userid) {
        useToken(userid);
    } else {
        userid = getRandomToken();
        chrome.storage.sync.set({userid: userid}, function() {
            useToken(userid);
        });
    }
    function useToken(userid) {
    }
});
