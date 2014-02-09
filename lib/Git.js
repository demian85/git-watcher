var chp = require('child_process');

function log() {
	if (console && config.debugMode) {
		console.log.apply(console, arguments);
	}
}

var Git = {
	stageFile: function(modulePath, file, callback) {
		if (file.status === 'deleted') {
			this._exec(modulePath, 'git rm', [file.name], callback);
		} else {
			var fileRelativePth = '.' + require('path').sep +  file.name;
			if (file.type === 'submodule' && !file.staged && file.status === 'new') {
				this._exec(modulePath, 'git submodule add', [fileRelativePth], callback);
			} else {
				this._exec(modulePath, 'git add', [fileRelativePth], callback);
			}
		}
	},
	
	stageAll: function(modulePath, callback) {
		this._exec(modulePath, 'git add -A', [], callback);
	},
	
	unstageFile: function(modulePath, file, callback) {
		this._exec(modulePath, 'git reset HEAD --', [file.name], callback);
	},
	
	unstageAll: function(modulePath, callback) {
		this._exec(modulePath, 'git reset HEAD', [], callback);
	},
	
	commit: function(modulePath, message, callback) {
		this._exec(modulePath, 'git commit -m', [message], callback);
	},
	
	push: function(modulePath, callback) {
		this._exec(modulePath, 'git push', [], callback);
	},
	
	revertFile: function(modulePath, file, callback) {
		var me = this;
		function revert() {
			me._exec(modulePath, 'git checkout HEAD --', [file.name], callback);
		}
		if (file.staged) {
			me.unstageFile(modulePath, file, revert);
		} else {
			revert();
		}
	},
	
	removeFileFromDisk: function(modulePath, file, callback) {
		this._exec(modulePath, 'rm -rf', [file.name], callback);
	},
	
	openGitk: function(modulePath, file) {
		var process = chp.spawn('gitk', [file ? file.name : ''], {
			cwd: modulePath,
			detached: true,
			stdio: 'ignore'
		});
		process.unref();
		process.on('error', function(err) {
			console.error(err);
		});
	},
	
	openGitBlame: function(modulePath, file) {
		var process = chp.spawn('git', ['gui', 'blame', '--', file.name], {
			cwd: modulePath,
			detached: true,
			stdio: 'ignore'
		});
		process.unref();
		process.on('error', function(err) {
			console.error(err);
		});
	},
	
	_exec: function(modulePath, cmd, args, callback) {
		var escapedArgs = args.map(function(arg) {
			return '"' + arg.replace(/["\\]/g, '\\$1') + '"';
		}).join(' ');
		cmd += ' ' + escapedArgs;
		log('Executing:', cmd);
		chp.exec(cmd, {cwd: modulePath}, function(err, stdout, stderr) {
			if (err && stderr) {
				console.error('Command stderr output:', stderr);
				callback(new Error('Command failed: ' + cmd + '\n\n' + stderr));
			} else {
				log('Command stdout output:', stdout);
				callback(null, stdout);
			}
		});
	}
};

module.exports = Git;
