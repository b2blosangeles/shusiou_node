var opt = req.query['opt'], auto_git_pull = req.query['auto_git_pull'];
switch(opt) {
	case 'status':
		var CP = new pkg.crowdProcess();
		var _f = {};
		_f['P0'] = function(cbk) {
		    pkg.fs.readFile('/var/.qalet_whoami.data', 'utf8', function(err,data) {
			if ((err) || !data) {
				cbk(false);		
			} else {
				cbk(data.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace(/\s+/g,' '));
			}
		    });
		};
		_f['P1'] = function(cbk) {
			var diskspace = require(env.root_path + '/package/diskspace/node_modules/diskspace');
			diskspace.check('/', function (err, space) {
			    space.total = Math.round(space.total * 0.000001);
			    space.free = Math.round(space.free * 0.000001);
			    space.used = Math.round(space.used * 0.000001); 
			    space.free_rate =  Math.floor(space.free  * 100 /  space.total); 
			 //   space.channel = channel.channel;
			    cbk(space);
			});	
		};
		_f['git_update'] = function(cbk) {			
			if (auto_git_pull) {
				pkg.fs.exists('/var/cert/', function(exists) {
					let cmd_plus = (exists)?' && cd /var/cert && git pull ':'';
					var cmd = 'cd ' + env.site_path + '&& git pull && cd ' + env.site_contents_path + '&& git pull && cd ' + env.root_path + '&& git pull' + cmd_plus; 	
					pkg.exec(cmd, function(error, stdout, stderr) {
						 cbk('git code updated');
					});
				});				
					
			} else {
				cbk(false);
			}	
		};		
		_f['cron_watch'] = function(cbk) {
			/* if cron stopped server will be reboot */
			pkg.fs.readFile('/var/.qalet_cron_watch.data', 'utf8', function(err,data) {
			  if (err){
			     	cbk(err.message);
			  } else {
				var watch = {};
				try { watch = JSON.parse(data);} catch (e) {}
				if (watch.start) {
				    cbk('skip!');
				} else if ((watch.mark)) {
				    var d = new Date().getTime() - new Date(watch.mark).getTime();
				    if (d > 180000) {
					var watch0 = {start:new Date(), mark:new Date()};
					pkg.fs.writeFile('/var/.qalet_cron_watch.data', JSON.stringify(watch0), function (err) {
					    pkg.exec('shutdown -r +1', function(error, stdout, stderr) {
					      cbk('Server will be reboot in 1 minute!');
					    });             
					});
				    } else {
					cbk('normal');
				    }
				} else {
				    cbk('watch error!!');
				}
			  }
			});			
		//	cbk('cron_warch -- niu ');	
		};		
		CP.serial(
			_f,
			function(data) {
				if (data.results.P0) 
					res.send({status:'success', ip:data.results.P0, space:data.results.P1, 
						cron_watch : CP.data.cron_watch,
						git_update : CP.data.git_update});
				else res.send({status:'failure'});
			},
			6000
		);		
		break;
	default:
		res.send({status:'error', message:'Wrong opt value!'});
}
