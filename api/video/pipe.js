function write500(msg) {
	res.writeHead(500);
	res.write(msg);
	res.end();	
}
function cache_request(url, fn, cbk) {
	pkg.fs.stat(fn, function(err0, stat) {
		if (err0) {
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
			pkg.fs.utimes(fn, new Date(), stat.mtime, function() {
				cbk(true);
			});
		}
	});
}
function cache_ffmpeg(cmd, fn, cbk) {
	pkg.fs.stat(fn, function(err, stat) {
		if (err) {
			pkg.exec(cmd, 
				function(error, stdout, stderr) {
					cbk(cmd);	
			});
		} else {
			pkg.fs.utimes(fn, new Date(), stat.mtime, function() {
				cbk(cmd);
			});			
		}
	});	
}

if (isNaN(req.query['ss'])) {
	res.send('Wrong ss');
	return true;
}

let ss0 = parseFloat(req.query['ss']), 
    ss = Math.floor(ss0),
    d_s = ss - ss0,
    sec_s = Math.floor(parseInt(ss) / 5), 
    t = (isNaN(req.query['t'])) ? 0 : parseFloat(req.query['t']),
    sec_t =  Math.ceil(parseInt(ss + t) / 5);
//    start_point = parseInt(ss) % 5 + d_s;

let _w = parseFloat(req.query['size']),
    _size_str = ([90, 180, 320, 480].indexOf(_w) !== -1) ? (' -vf scale=' + _w + ':-1 ') : ' -vframes 1 ',
    _size_fn = ([90, 180, 320, 480].indexOf(_w) !== -1) ? ('_' + _w) : '';
// TODO ffmpeg ratio

let space = {
	endpoint : req.query['space'],
	video: req.query['video_fn']
}
space.cache_folder =  '/var/shusiou_cache/' + space.endpoint.replace('https://', '').replace(/\//ig, '_') + 
'/' + space.video + '/';

let CP = new pkg.crowdProcess();
let _f = {}, fn = []; 

for (var i = sec_s; i < Math.max(sec_s+1, sec_t); i++) {
	fn.push('s_' + i + '.mp4');
}

_f['CREATE_DIR'] = function(cbk) {
	var folderP = require(env.site_path + '/api/inc/folderP/folderP');
	var fp = new folderP();		
	fp.build(space.cache_folder, () => {
		cbk(true)
	});	
};

_f['VALIDATION'] = function(cbk) {
	let url = space.endpoint + 'videos/' +  space.video + '/_info.txt';
	cache_request(url, space.cache_folder + '_info.txt', 
		function(status) {
			pkg.fs.readFile(space.cache_folder + '_info.txt', 'utf8', function(err, data) {	 
				if (err) {
					CP.exit = 1;
					cbk({status:0, message: space.cache_folder + '_info.txt does not exist'});
					return true;
				}
				try {
					v = JSON.parse(data);
				} catch (e) {}
				if (!v._s || !v._s.length) {
					CP.exit = 1;
					cbk({status:0, message:'uncompleted space cache.'});
					return true;
				}
				if ( ss > v._s.length *5) {
					CP.exit = 1;
					cbk({status:0, message:'ss is longer than video length.'});
					return true;
				}
				if (t > 60) {
					CP.exit = 1;
					cbk({status:0, message:'t is bigger than 60s.'});
					return true;
				}
				cbk({status:1});
			});
	});	
};

_f['PULLING'] = function(cbk) {;
	if (fn.length === 1) {
		let url = space.endpoint + 'videos/' +  space.video + '/_s/' + fn[0];
		cache_request(url, space.cache_folder + fn[0], cbk);
	} else {
		var CP1 = new pkg.crowdProcess();
		var _f1 = {}; 	
		_f1['WRITE_CFG'] = function(cbk1) {
			if (!sec_t) {
				cbk(false);
			} else {
				pkg.fs.stat(space.cache_folder  +  'engine_' + sec_s + '_' + sec_t +'.cfg', function(err, stat) {
					if (!err) { cbk1(true); }
					else {
						var str = '';
						for (var i = 0; i < fn.length; i++) {
							str += "file '" + space.cache_folder + fn[i] + "'\n";
						}
						pkg.fs.writeFile(space.cache_folder  + 'engine_' + sec_s + '_' + sec_t +'.cfg', str, function(err) {	    
							cbk1('WRITE_TXT:' + space.cache_folder  + 'engine_' + sec_s + '_' + sec_t +'.cfg');
						}); 					
					}
				});
			}	
		};			       
		for (var i = 0; i < fn.length; i++) {
			_f1['P_' + i] = (function(i) {
				return function(cbk1) {
					let url = space.endpoint + 'videos/' +  space.video + '/_s/' + fn[i];
					cache_request(url, space.cache_folder + fn[i], cbk1);
				}
			})(i);	
		}
		CP1.parallel(
		_f1,
		function(results) {
			let cmd = 'cd ' + space.cache_folder  + 
			    ' && ffmpeg -f concat -safe 0 -i ' + space.cache_folder  + 
			    'engine_' + sec_s + '_' + sec_t +'.cfg -c copy cache_' + sec_s + '_' + sec_t + '.mp4 -y';
			cache_ffmpeg(cmd, space.cache_folder  + 'cache_' + sec_s + '_' + sec_t + '.mp4', cbk);
		}, 10000);
	}
}

_f['FFMPEG_SECTION'] = function(cbk) {
	if (!t) {
		cbk(false);
	} else {
		if (fn.length > 1) {
			let cmd = 'cd ' + space.cache_folder + ' && ffmpeg -ss ' + d_s + 
			    ' -i cache_' + sec_s + '_' + sec_t + '.mp4  -t ' + t + ' -c copy sec_' + ss0 + '_' + t + '.mp4';
			cache_ffmpeg(cmd, space.cache_folder  + 'sec_' + ss0 + '_' + t + '.mp4', cbk);
		} else {
			let cmd = 'cd ' + space.cache_folder + ' && ffmpeg -ss ' + d_s + 
			    ' -i '+ fn[0] + '  -t ' + t + ' -c copy sec_' + ss0 + '_' + t + '.mp4';
			cache_ffmpeg(cmd, space.cache_folder  + 'sec_' + ss0 + '_' + t + '.mp4', cbk);
		}
	}
};

_f['FFMPEG_IMG'] = function(cbk) {
	if (t) {
		cbk(false);
	} else {
		let cmd =  'ffmpeg -i ' + space.cache_folder  + fn[0] + ' -ss ' + d_s + _size_str + ' -preset ultrafast ' + 
		    space.cache_folder + ss0 + _size_fn + '.png -y';
		cache_ffmpeg(cmd, space.cache_folder + ss0 +  _size_fn + '.png', cbk);
	}	
};

CP.serial(_f,
	function(results) {
		if (!CP.data.VALIDATION.status) {
			write500(CP.data.VALIDATION.message);
			return true;
		}
      		if (!t) {
			pkg.fs.stat(space.cache_folder + ss0 + _size_fn + '.png', function(err, stat) {
				if (err) { res.send(err.message); }
				else {
					var file = pkg.fs.createReadStream(space.cache_folder + ss0 + _size_fn + '.png');
					file.pipe(res);	
				}
			});	
		} else {
			pkg.fs.stat( space.cache_folder +'sec_' + ss0 + '_' + t + '.mp4', function(err, stat) {
				if (err) { res.send(err.message); }
				else {
				      var total = stat.size;
				      var range = req.headers.range;
				      if (range) {
						var parts = range.replace(/bytes=/, "").split("-");
						var partialstart = parts[0]; var partialend;
						  partialend =  parts[1];
						var start = parseInt(partialstart, 10);
						var end = partialend ? parseInt(partialend, 10) : total-1;
						var chunksize = (end-start)+1;
						var maxChunk = 1024 * 1024; // 1MB at a time
						if (chunksize > maxChunk) {
						  end = start + maxChunk - 1;
						  chunksize = (end - start) + 1;
						}							      

						var file = pkg.fs.createReadStream(space.cache_folder +'sec_' + ss0 + '_' + t + '.mp4', {start:start, end:end});
						res.writeHead(206, {'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 
							'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/mp4' });
					       file.pipe(res);
					} else {
						var file = pkg.fs.createReadStream(space.cache_folder +'sec_' + ss0 + '_' + t + '.mp4', {start:start, end:end});
						res.writeHead(206, {'Content-Range': 'bytes ' + 0 + '-' + total + '/' + total, 
							'Accept-Ranges': 'bytes', 'Content-Length': total, 'Content-Type': 'video/mp4' });
					       file.pipe(res);						
					}
				}
			});
		}	

	}, 20000);
return true;

