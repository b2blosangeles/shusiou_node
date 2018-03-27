	const AWS = require(env.site_path + '/api/inc/aws-sdk/node_modules/aws-sdk')
	const spacesEndpoint = new AWS.Endpoint('nyc3.digitaloceanspaces.com');
	const s3 = new AWS.S3({
	    endpoint: spacesEndpoint,
	    accessKeyId: 'QYF3ENCI4TEDFDWFBS6N',
	    secretAccessKey: '7DJD8b9iAqD5qsLgRZH9OXfgOQMob/edWouwiqYeOwI'
	});

	let tm = new Date().getTime();

	function removeFolder(folder, callback){
		var params = {
			Bucket: 'shusiou-d-01',
			Prefix: folder
		};
		s3.listObjects(params, function(err, data) {
			if (err) return callback(err);
			if (data.Contents.length == 0) callback({"Deleted":[],"Errors":[]});
			var params = {
				Bucket: 'shusiou-d-01'
			};		
			params.Delete = {Objects:[]};
			data.Contents.forEach(function(content) {
				params.Delete.Objects.push({Key: content.Key});
			});
			s3.deleteObjects(params, function(err, d) {
				if (err) return callback(err);
				else callback(d);
			});

		});
	}

  
  removeFolder('shusiou/', function(data) {
	  
    res.send({tm:new Date().getTime() - tm,data:data});
  });
  
  
