(function () { 
  var obj =  function (script_file_name) {	
    
       this.load = function(tp, scheduled){
                var path = require('path'),
              watch_file = '/var/.qalet_cron_watch.data';
              env = {root_path:path.join(__dirname, '../../..')},
              fn_a = /\/([^\/]+)$/i.exec(script_file_name),
              cron_data = require(env.root_path + '/sites/' + tp + '/cron_service/cron.json');

              var script_name = '';
              for (var i = 0; i < cron_data.length; i++) {
                if ( cron_data[i].script == fn_a[1]) {
                  script_name = fn_a[1];
                }
              }

                var request =  require(env.root_path + '/package/request/node_modules/request');
                var fs = require('fs');

              fs.readFile(watch_file, 'utf8', function(err,data) {
                if (err){
                  fs.writeFile(watch_file, JSON.stringify({}), function (err) {});
                } else {
                  var watch = {};
                  try { watch = JSON.parse(data);} catch (e) {}

                  let start = ((watch[tp + '_'+ fn_a[1]]) && (watch[tp + '_'+ fn_a[1]].mark)) ? watch[tp + '_'+ fn_a[1]].mark : null;

                  if (script_name) {
                    watch[tp + '_'+ script_name] = {scheduled:scheduled, start: start, mark:new Date()};
                  } else {
                    delete watch[tp + '_'+ fn_a[1]];
                  }
                  fs.writeFile(watch_file, JSON.stringify(watch), function (err) {
                    console.log(watch);
                  });
                }
              });	
            }    
  }
  module.exports = obj;
})();
