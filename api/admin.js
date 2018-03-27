if (!req.body['opt']) {
	res.send('Missing optA!!');
	return true;
}
switch(req.body['opt']) {
		
    case 'git_frame_pull':
	pkg.exec('cd ' + env.root_path + '&& git pull', function(error, stdout, stderr) {
		if (error) res.send('error');
		else if (stdout) res.send(stdout);
		else res.send('stderr');
	});
        break;
		
    case 'git_site_pull':
	pkg.exec('cd ' + env.site_path + '&& git pull', function(error, stdout, stderr) {
		 res.send(stdout);
	});
        break;	

    case 'git_all_pull':
	pkg.fs.exists('/var/cert/', function(exists) {
		let cmd_plus = (exists)?' && cd /var/cert/ && git pull ':'';
		var cmd = 'cd ' + env.site_path + '&& git pull && cd ' + env.root_path + '&& git pull' + cmd_plus; 	
		pkg.exec(cmd, function(error, stdout, stderr) {
			res.send(stdout);
		});
	});
        break;			
		
    case 'reboot':	
	pkg.exec('shutdown -r +1', function(error, stdout, stderr) {
	 	res.send('Server will be reboot in 1 minute!');
	});
	break;
		
    case 'clean_cache':	
	pkg.exec('rm -fr /var/shusiou-video', function(error, stdout, stderr) {
	 	res.send('clean node cache!');
	});
	break;
		
    default:
	res.send('Wrong opt parpmeter!!');
	return true;
}
