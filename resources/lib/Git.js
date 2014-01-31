var chp = require('child_process');

var Git = {
	stageFile: function(modulePath, file, callback) {
		if (file.status === 'deleted') {
			this._exec(modulePath, 'git rm', [file.name], callback);
		} else {
			var fileRelativePth = '.' + require('path').sep +  file.name;
			if (file.type === 'submodule' && !file.staged) {
				this._exec(modulePath, 'git submodule add', [fileRelativePth], callback);
			} else {
				this._exec(modulePath, 'git add', [fileRelativePth], callback);
			}
		}
	},
	
	unstageFile: function(modulePath, file, callback) {
		this._exec(modulePath, 'git reset HEAD', [file.name], callback);
	},
	
	commit: function(modulePath, message, callback) {
		this._exec(modulePath, 'git commit -m', [message], callback);
	},
	
	push: function(modulePath, callback) {
		this._exec(modulePath, 'git push', [], callback);
	},
	
	revertFile: function(modulePath, file, callback) {
		this._exec(modulePath, 'git checkout HEAD --', [file.name], callback);
	},
	
	removeFileFromDisk: function(modulePath, file, callback) {
		this._exec(modulePath, 'rm -drf', [file.name], callback);
	},
	
	openGitk: function(modulePath, file) {
		chp.spawn('gitk', [file ? file.name : ''], {
			cwd: modulePath,
			detached: true, 
			stdio: 'ignore'
		}).unref();
	},
	
	_exec: function(modulePath, cmd, args, callback) {
		var escapedArgs = args.map(function(arg) {
			return '"' + arg.replace(/["\\]/g, '\\$1') + '"';
		}).join(' ');
		cmd += ' ' + escapedArgs;
		console.log('Executing:', cmd);
		chp.exec(cmd, {cwd: modulePath}, function(err, stdout, stderr) {
			if (err) console.error(err, stdout, stderr); // FIXME: why do some commands fail?
			callback(null, stdout);
		});
	}
};

module.exports = Git;
