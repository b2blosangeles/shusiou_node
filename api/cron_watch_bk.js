/* ---  cron_watch ---*/
pkg.fs.readFile('/var/.qalet_cron_watch.data', 'utf8', function(err,data) {
  if (err){
      res.send(err.message);
  } else {
        var watch = {};
        try { watch = JSON.parse(data);} catch (e) {}
        if (watch.start) {
            res.send('skip!');
        } else if ((watch.mark)) {
            var d = new Date().getTime() - new Date(watch.mark).getTime();
            if (d > 180000) {
                var watch0 = {start:new Date(), mark:new Date()};
                pkg.fs.writeFile('/var/.qalet_cron_watch.data', JSON.stringify(watch0), function (err) {
                    pkg.exec('shutdown -r +1', function(error, stdout, stderr) {
                      res.send('Server will be reboot in 1 minute!');
                    });             
                });
            } else {
                res.send('normal');
            }
        } else {
            res.send('watch error!!');
        }
  }
});	 
