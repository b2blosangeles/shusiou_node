var path = require('path');
var env = {root_path:path.join(__dirname, '../../..')};
env.site_path = env.root_path + '/sites/master';
env.config_path = '/var/qalet_config';
var config = require(env.config_path + '/config.json');

let pkg = {
    crowdProcess	: require(env.root_path + '/package/crowdProcess/crowdProcess'),
	request		: require(env.root_path + '/package/request/node_modules/request'),
	exec		: require('child_process').exec,
	fs 		: require('fs')
}; 

var WHOAMI = require(env.site_path + '/api/inc/whoami/whoami.js');
let whoami = new  WHOAMI(pkg);
whoami.getIP(
    function(ip) {
	diskspace.check('/', function (err, space) {
	    space.total = Math.round(space.total * 0.000001);
	    space.free = Math.round(space.free * 0.000001);
	    space.used = Math.round(space.used * 0.000001); 
	    space.free_rate =  Math.floor(space.free  * 100 /  space.total); 
	    request({
	      url: 'http://' + config.root + '/api/add_node.api',
	      headers: {
		"content-type": "application/json"
	      },
	      form:{ip : ip, space : space, server_type : 'node'}
	    }, function (error, resp, body) { 
		    console.log('Procecssed master ip ' + ip);
	    });
	});
    }
);
                     
var request =  require(env.root_path + '/package/request/node_modules/request');
var diskspace = require(env.root_path + '/package/diskspace/node_modules/diskspace');


/* --- code for cron watch ---*/
delete require.cache[__dirname + '/watch_cron.inc.js'];
let watch_cron_inc = require(__dirname + '/watch_cron.inc.js'),
    watchCron = new watch_cron_inc(__filename);
watchCron.load('node', 60);
