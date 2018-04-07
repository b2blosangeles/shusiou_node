function write500(msg) {
	res.writeHead(500);
	res.write(msg);
	res.end();	
}
let space = {
	endpoint : req.query['space'],
	video: req.query['video_fn']
}
if ((req.query['space']) && (req.query['video_fn'])) {
	space.cache_folder =  '/var/shusiou_cache/' + space.endpoint.replace('https://', '').replace(/\//ig, '_') + 
		'/' + space.video + '/'
} else {
	space.cache_folder =  '/var/shusiou_cache/';
}
let cmd =  'rm -fr ' + space.cache_folder;
pkg.exec(cmd, 
	function(error, stdout, stderr) {
		res.send('Done ! ' + new Date());	
});
