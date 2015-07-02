# riverToTweets

A JavaScript app that reads any number of "river" files and streams them as posts to Twitter.

### Who is this for?

This is intended primarily for <a href="https://github.com/scripting/river4">River4</a> users.

The instructions are brief. ;-)

#### It's probably sample code

I wanted to show people how to parse a river, and keep track of which items you've seen, and to stream them out to a service like Twitter.

It might be too much work to set up your own <a href="https://github.com/scripting/nodeStorage">nodeStorage</a> server. Feel free to substitute any code of your own to send a message. You could send an email, or a WhatsApp message, or whatever. 

It might be easier to understand the code <a href="http://scripting.com/listings/rivertotweets.html">reading in an outliner</a>. 

### Setup

1. It runs in Node.js.

2. Edit config.json. For each river, give it a name. The name must be unique among the other rivers in config.json. 

3. You can use my Twitter gateway if you want, as long as you're not sending hundreds of tweets a day. If you want to set up your own, it's running nodeStorage. 

4. The token and tokenSecret are the values used in Radio3 (which is the domain the gateway is serving).

### I'm running this code

It's how the <a href="https://twitter.com/nbariver">nbariver</a> and <a href="https://twitter.com/nyt">nyt</a> accounts on Twitter get their content. 

### Support

Post questions on the <a href="https://groups.google.com/forum/?fromgroups#!forum/river4">River4 mail list</a>.

