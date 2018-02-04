#!/usr/bin/env node

var async = require('async');
var fetch = require('fetch');
var registries = require('./registries.json');
var exec = require('child_process').exec;

function exit(err) {
    console.error(err);
    process.exit(1);
}

function getFastest(rs) {
	var avalable = rs.filter(function(r) {return !r.error});
	if(!avalable || avalable.length < 1) {
		return exit('no avalable registry.');
	}
	avalable.sort(function(a,b){
		if (a.time > b.time) return 1;
		if (a.time < b.time) return -1;
		return 0;
	});
	return avalable[0];
}

function useRegistry(registry) {
	if(!registry) return exit('no avalable registry.');
	var setCmd = 'npm config set registry ' + registry.registry;
	exec(setCmd, function(error){
		if(error) return exit('set registry error', error);
		console.log('set registry to', registry.registry);
		var getCmd = 'npm config get registry'
			exec(getCmd, function(error, stdout){
			console.log('current registry is ', stdout);
		})
	});
}

async.map(
	Object.keys(registries),
	function(key, cbk) {
		var registry = registries[key];
		var start = +new Date();
		fetch.fetchUrl(registry.registry + 'pedding', { timeout: 3000 }, function(error, meta) {
			let entry = {
					name: key,
					registry: registry.registry,
					time: (+new Date() - start),
					error: error || meta.status !== 200 ? true : false
				    };
			if(process.argv.indexOf("-v") != -1 || process.argv.indexOf("--verbose") != -1){
				let paddedDuration = '    ';
				if(entry.error){
					paddedDuration = error.code || meta.status;
				}else{
					//paddedDuration = (paddedDuration + (entry.time/1000).toFixed(2)).slice(-Math.max(paddedDuration.length, entry.time.toString().length)) + ' s';
					paddedDuration = (paddedDuration + entry.time).slice(-Math.max(paddedDuration.length, entry.time.toString().length)) + ' ms';
				}
				console.log('  %s[%s]\x1b[0m  %s', (entry.error?'\x1b[31m':'\x1b[32m'), paddedDuration, entry.registry);
			}
			cbk(null, entry);
		});
	},
	function(err, rs) {
		if (err) return exit(err);
		try{
			useRegistry(getFastest(rs));
		} catch(e){
			return exit('error!', e)
		};
	});
