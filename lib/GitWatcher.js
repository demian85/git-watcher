var fs = require('fs'),
	util = require('util'),
	async = require('async'),
	events = require('events'),
	ModuleWatcher = require('./ModuleWatcher');

var GitWatcher = function(baseGitRepoPath) {
	events.EventEmitter.call(this);
	this.path = baseGitRepoPath.replace(/[\\\/]$/, '');
};

util.inherits(GitWatcher, events.EventEmitter);

GitWatcher.prototype.init = function() {
	var me = this;
	me.modules = {};
	me.moduleNames = [];
	me._initModule(me.path);
	me._findModules(me.path, function onModulesFound(err) {
		if (err) me.emit('error', err);
		else {
			me.moduleNames = Object.keys(me.modules);
			me.moduleNames.sort();
			me.emit('ready');
		}
	});
};

GitWatcher.prototype.close = function() {
	var me = this;
	Object.keys(me.modules).forEach(function moduleIterator(module) {
		me.modules[module].close();
		me.modules[module].removeAllListeners();
	});
	me.modules = {};
	me.moduleNames = [];
};

GitWatcher.prototype.getStatus = function(callback) {
	var me = this;
	var statuses = {};
	async.each(Object.keys(me.modules), function moduleIterator(module, callback) {
		me.modules[module].getStatus(function statusCallback(err, status) {
			if (err) return callback(err);
			statuses[module] = status;
			callback();
		});
	}, function onEnd(err) {
		callback(err, statuses);
	});
};

GitWatcher.prototype.getModuleStatus = function(module, callback) {
	this.modules[module].getStatus(callback);
};

GitWatcher.prototype.getModules = function() {
	return this.moduleNames;
};

GitWatcher.prototype._buildModuleName = function(fullPath) {
	return fullPath.replace(require('path').dirname(this.path), '');
};

GitWatcher.prototype._initModule = function(fullPath, parentModulePath) {
	var me = this;
	var module = new ModuleWatcher(fullPath);
	var moduleName = me._buildModuleName(fullPath);
	var parentModuleName = parentModulePath ? me._buildModuleName(parentModulePath) : null;
	module.init();
	module.on('change', function onModuleChange(status) {
		me.emit('change', {
			module: moduleName,
			status: status
		});
		if (parentModuleName && me.modules[parentModuleName]) {
			me.modules[parentModuleName].statusChanged();
		}
	});
	module.on('merge', function(data) {
		me.emit('merge', {
			module: moduleName,
			msg: data.msg
		});
	});
	module.on('error', function onModuleError(err) {
		me.emit('error', err);
	});
	me.modules[moduleName] = module;
};

GitWatcher.prototype._findModules = function(basePath, callback) {
	var me = this;
	fs.readdir(basePath, function readDirCallback(err, files) {
		if (err) return callback(err);
		async.each(files, function fileIterator(fileName, callback) {
			if (fileName === '.git') return callback(); // do not watch .git stuff
			var fullPath = require('path').join(basePath, fileName);
			fs.stat(fullPath, function fileStatCallback(err, stat) {
				if (err) return callback(err);
				if (stat.isDirectory()) {
					fs.exists(fullPath + '/.git', function fileExistsCallback(isSubmodule) {
						if (isSubmodule) {
							me._initModule(fullPath, basePath);
						}
						me._findModules(fullPath, callback);
					});
				} else {
					callback();
				}
			});
		}, callback);
	});
};

module.exports = GitWatcher;
