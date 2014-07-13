//node dnsProxy.js [conf]

var debug = false;

if(debug) var util = require('util')
			 
var dns = require('native-dns')
   ,async  = require('async')
   ,server = dns.createServer()
   ,config = { ip: '0.0.0.0', port: 53, rdns: '203.0.178.191', override: {} }
 
//the config is a node module because i'm lazy. 
if(process.argv[2]) {
 ['ip', 'port', 'rdns', 'override'].forEach(function(el) {
   config[el] = require('./' + process.argv[2])[el] || config[el]
 })
}
   
server.on('request', function(req, res) {
  res.id = req.id
  async.each(req.question,function(q,cb) {
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
    .on('message',function(err, ans) {
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