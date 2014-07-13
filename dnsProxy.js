//node dnsProxy.js
//edit conf.js to change settings.

var debug = false;

if(debug) var util = require('util')
			 
//yes the config is a module because i'm lazy...
var dns = require('native-dns')
   ,async  = require('async')
   ,server = dns.createServer()
   ,config = require('./conf.js');
   
//this will probably break if a complicated query arrived with multiple questions but i don't think that happens very often.
server.on('request', function(req, res) {
  res.id = req.id
  async.each(req.question, function(q,cb) {
    if(config.override[q.name]) {
      res.header.aa = 1
      res.answer.push(dns.A({
	name: q.name
       ,address: config.override[q.name]
       ,ttl: 600
      }))
      return cb();
    }
    dns.Request({question: q, server: { address: config.rdns, type: 'udp' }})
    .on('message', function(err, ans) {
      if(ans.header.rcode !== 0) res.header.rcode = ans.header.rcode;
      ['answer', 'authority', 'additional'].forEach(function(type) {
        ans[type].forEach(function(ret) {
            res[type].push(ret)
	})
      })
      cb(err)
    })
    .send();
  }, function(err) {
    if(debug) ins({response: res});
    res.send()
  })
})
 
server.on('error', function(err) { 
  if (debug) ins({serverError: err});
});

function ins (obj) {
  console.log(util.inspect(obj));
}

server.serve(config.port, config.ip);