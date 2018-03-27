var request = require(env.root_path + '/package/request/node_modules/request');
var file = pkg.fs.createWriteStream('/tmp/video_a.mp4');
var http = require('http');
var tm =  new Date().getTime();
var request = http.get('http://shusiou.com/api/video/test_pipe.api?', function(response) {
	response.pipe(file);
	response.on('end', function() {
		res.send('pulled  time: ' + (new Date().getTime() - tm) + ' ms');	
	});
});
