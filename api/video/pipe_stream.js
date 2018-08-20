function write505(msg) {
	res.writeHead(505);
	res.write(msg);
	res.end();	
}
function cache_request(url, fn, cbk) {
	pkg.fs.stat(fn, function(err, stats) {
		if (err) {
			let file = pkg.fs.createWriteStream(fn);
			file.on('finish', function() {
				let c = '';
				let rf = pkg.fs.createReadStream(fn, {start : 0, end: 4, encoding: 'utf8'});
				rf.on('data', function (chunk) {
					c += chunk;
					rf.close();
				}).on('close', function () {
					if (c === '<?xml') {
						pkg.fs.unlink(fn, function(error) {
						    cbk(false);
						});					
					} else {
						cbk(true);
					}
				})
				.on('error', function (err) {
					cbk(false);
				});
			});	
			pkg.request(url, function (err1, response, body) {
			}).pipe(file);			
		} else {
			pkg.fs.utimes(fn, new Date(), stats.mtime, function() {
				cbk(true);
			});
		}
	});
}

let source_file = req.query['video_fn'],
    space_url = req.query['space'], 
    space_info = 'videos/' + source_file + '/_info.txt',
    space_dir = 'videos/' + source_file + '/_t/',
    cache_folder = '/var/shusiou_cache/' + space_url.replace('https://', '').replace(/\//ig, '_') + '/' + source_file + '/',
    cache_info =  cache_folder + '_info.txt';

var CP = new pkg.crowdProcess();
var _f = {}; 
_f['CREATE_DIR'] = function(cbk) {
	var folderP = require(env.site_path + '/api/inc/folderP/folderP');
	var fp = new folderP();		
	fp.build(cache_folder, () => {
		fp.build(cache_folder + 'tracks/', () => {
			cbk(true)
		});		
	});	
};
_f['VALIDATION'] = function(cbk) {
	if (!source_file) {
		cbk({status:0, message:'Missing video_fn parameter'});
	} else {
		cache_request(space_url + space_info,  cache_info,
			function(status) {
				pkg.fs.readFile(cache_info, 'utf8', function(err, data) {	 
					if (err) {
						cbk({status:0, message: space_info + ' does not exist'});
						return true;
					}
					let v = {};
					try { 
						v = JSON.parse(data);
					} catch (e) {}			
					cbk({status:1, cfg:v});
				});
		});
	}	
};
CP.serial(
	_f,
	function(results) {
		if (!CP.data.VALIDATION.status) {
			write505(CP.data.VALIDATION.message);
			return true;
		}
		
		let cfg = CP.data.VALIDATION.cfg,
		    stream = require("stream"),
		    a = new stream.PassThrough(),
		    fn = [];
		
		a.pipe(res);
		var range = req.headers.range;
		
		if (req.param('start')) {
			var start = req.param('start'), end = req.param('end'), maxChunk = cfg.trunksize, total = cfg.filesize;
		} else {
			if (!start) {
				var start = 0, end = 0, maxChunk = cfg.trunksize, total = cfg.filesize;
			}
			if (range) {
				var total = cfg.filesize; 
				var parts = range.replace(/bytes=/, "").split("-");
				var partialstart = parts[0]; var partialend;
				  partialend =  parts[1];
				var start = parseInt(partialstart, 10);
				var end = (partialend) ? parseInt(partialend, 10) : (total-1);
				var chunksize = (end-start)+1;
				if (chunksize > maxChunk) {
				  end = start + maxChunk - 1;
				  chunksize = (end - start) + 1;
				} 
			} 
		}
		var sidx = Math.floor(start / maxChunk); 
		var eidx = Math.min(Math.ceil(end / maxChunk), sidx+1); 
		start = sidx * maxChunk; end = eidx * maxChunk;
		for (var i = sidx; i < eidx; i++) {
			fn.push(cfg._t[i]);	
		}
		res.writeHead(206, {'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 
		    'Accept-Ranges': 'bytes', 'Content-Type': 'video/mp4' });			
		
		var CP1 = new pkg.crowdProcess();
		var _f1 = {}; 
		
		for (var i = 0; i < fn.length; i++) {
			_f1['P_' + i] = (function(i) {
				return function(cbk1) {
					let cache_track = cache_folder + 'tracks/' + fn[i];
					cache_request(space_url + space_dir + fn[i],  cache_track,
						function(status) {
							pkg.fs.createReadStream(cache_track).on('data', function(data) {
								a.write(Buffer.from(data));
							}).on('end', function() {
								cbk1(true);
							});
					});
				}
			})(i);	
		}

		CP1.parallel(
			_f1,
			function(data) {	
				a.end();
			},
			6000
		);
	},
	10000
);
return true;
