/* ---  This cron is to clean video cache on video nodes.  */

var path = require('path');
var env = {root_path:path.join(__dirname, '../../..')};
env.sites_path = env.root_path + '/sites';
env.config_path = '/var/qalet_config';

var config = require(env.config_path + '/config.json');

let pkg = {
    	crowdProcess	: require(env.root_path + '/package/crowdProcess/crowdProcess'),
	exec		: require('child_process').exec,
	fs 		: require('fs')
}; 

var finder = require(env.sites_path + '/node/api/inc/findit/findit.js')('/var/shusiou_cache/');
var path = require('path');
let list = [];
finder.on('directory', function (dir, stat, stop) {
});

finder.on('file', function (file, stat) {
     if (!file.match(/\.txt$/)) {
          list.push({fn:file, mtime:stat.mtime, atime:stat.atime, size:stat.size});
     }     
});

finder.on('link', function (link, stat) {
    
});
finder.on('end', function (file, stat) {
     
     list = list.sort(function(a, b) {
          return (new Date(a.atime) > new Date(b.atime))? 1 : -1;
     });
     let clean_list= [];
     let minsize = 200000000000
     
     var diskspace = require(env.root_path + '/package/diskspace/node_modules/diskspace');
     diskspace.check('/', function (err, space) {
         space.free_rate =  Math.floor(space.free  * 100 /  space.total); 
         if  (space.free < minsize) {
		let goalsize = minsize - space.free;	 
               for (var i = 0; i < list.length; i++) {
                    if ((goalsize - list[i].size) > 0) {
                         goalsize -= list[i].size;
                         clean_list.push(list[i].fn);
                    } 
               }
               batchDelete(clean_list, function(data) {
                    data.space = space;
                    console.log(data);    
               });                
          } else {         
              console.log(space);
          }     
     });	

});

var batchDelete = function(list, cbk) {
     let CP = new pkg.crowdProcess();
     let _f = {}, fn = []; 
     _f['clean_tmp']  = function(cbk) { 
          pkg.exec('rm -fr /tmp/* && rm -fr /tmp/*.*', 					 
               function(err, stdout, stderr) {
                    cbk(true);
               });
     };    
     for (var i = 0; i < list.length; i++) {
          _f['P_'+i] = (function(i) {
               return function(cbk1) {
                    pkg.fs.unlink(list[i],function(err){
                         cbk1('deleted ' + list[i]);
                    });
               } 
          })(i);
     }
     CP.serial(
          _f,
          function(result) {
               cbk(result);
          }, 30000
     )
}
