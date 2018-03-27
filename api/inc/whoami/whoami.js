(function () { 
  var obj =  function (pkg) {
      this.cacheFileName = '/var/.qalet_whoami.data';
      this.outsideSouce = [
            'curl ipecho.net/plain', 
            'curl ipinfo.io/ip', 
            'curl ipv4.icanhazip.com',
            'curl ifconfig.me',
            'curl icanhazip.com',
            'curl checkip.amazonaws.com',
            'curl smart-ip.net/myip'
        ];
 
      this.getIP = function(callback) {
          let me = this;
          me.getFromCache(
            function(ip) {
                if (!ip) {
                   me.getFromPublicService(function(ip) {
                     me.writeToCache(ip, callback);
                   });
                } else {
			callback(ip);
		}
            }
          );
      }
      this.getFromCache = function(cbk) {
          let me = this;
	  pkg.fs.readFile(me.cacheFileName, 'utf8', function(err,data) {
		if ((err) || !this.isIp(data)) {
			cbk(false)
		} else {
			cbk(data);            
	    	}
	  });	      
      }
      this.writeToCache = function(ip, cbk) {
          let me = this;
          pkg.fs.writeFile(me.cacheFileName, ip, function() {
              cbk(ip);
          });     
      }      
      this.getFromPublicService = function(cbk) {
	let me = this;
        var CP = new pkg.crowdProcess();
        var _f = {};
        for (let i in me.outsideSouce) {
          _f['P_' + i] = (function(i) {
            return function(cbk) {
              pkg.exec(me.outsideSouce[i], function(error, stdout, stderr) {
                let rx=/((\d{1,3}\.){3}\d{1,3})/;
                let v = stdout.match(rx);
                cbk( ((v) || (v[0])) ? v[0] : false);
              });			
            }
          })(i);
        }
        CP.parallel(
          _f,
          function(data) {
            let result = {};
            for (let i in me.outsideSouce) {
              if (CP.data['P_' + i]) {
                if (!result[CP.data['P_'+i]]) result[CP.data['P_'+i]] = 0;
                result[CP.data['P_'+i]]++;
              }
            }

            let v = 0, ip = '';
            for (o in result) {
              if (result[o] > v) {
                v = result[o];
                ip = o;
              }
            }
            cbk(ip);
          },
        1000);
      }     
  };
	this.isIp = function(ip) {
		var arrIp = ip.split(".");
		if (arrIp.length !== 4) return false;
		for (let oct of arrIp) {
			if ( isNaN(oct) || Number(oct) < 0 || Number(oct) > 255)
				return false;
			}
		return true;
	}; 	
  module.exports = obj;
})();
