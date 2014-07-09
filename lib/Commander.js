var chp = require('child_process'),
	util = require('util'),
	async = require('async'),
	events = require('events');
	
function log() {
	if (console && config.debugMode) {
		console.log.apply(console, arguments);
	}
}

function getPatchFromDiff(diff, line) {
	var regex = /\n@@\s*-\d+,\d+\s+\+(\d+),(\d+)\s*@@(?:[^\n]|\n(?!@@))+/g;
	return diff.replace(regex, function(m0, m1, m2) {
		var rangeStart = parseInt(m1);
		var rangeEnd = parseInt(m1) + parseInt(m2);
		return line >= rangeStart && line <= rangeEnd ? m0 : '';
	}) + '\n';
}

function escapeShellArg(input) {
	return '"' + input.replace(/["\\\n]/g, '\\$1') + '"';
}

function Commander(modulePath) {
	this.modulePath = modulePath;
}

util.inherits(Commander, events.EventEmitter);

Commander.prototype.setModulePath = function(modulePath) {
	this.modulePath = modulePath;
};

Commander.prototype.stageFile = function(file, callback) {
	if (file.status === 'deleted') {
		this._execEnd('git rm', [file.name], callback);
	} else {
		var fileRelativePth = '.' + require('path').sep +  file.name;
		if (file.type === 'submodule' && !file.staged && file.status === 'new') {
			this._execEnd('git submodule add', [fileRelativePth], callback);
		} else {
			this._execEnd('git add', [fileRelativePth], callback);
		}
	}
};

Commander.prototype.stageHunk = function(file, line, callback) {
	var me = this;
	this._exec('git diff', ['-U' + config.diff.contextLines, file.name], function(err, output) {
		if (err) return callback(err);
		var patch = getPatchFromDiff(output, line);
		me._applyPatch(patch, callback);
	});
};

Commander.prototype.unstageHunk = function(file, line, callback) {
	var me = this;
	this._exec('git diff', ['-U' + config.diff.contextLines, '--cached', '-R', file.name], function(err, output) {
		if (err) return callback(err);
		var patch = getPatchFromDiff(output, line);
		me._applyPatch(patch, callback);
	});
};

Commander.prototype.stageAll = function(callback) {
	this._execEnd('git add -A', [], callback);
};

Commander.prototype.unstageFile = function(file, callback) {
	this._execEnd('git reset HEAD --', [file.name], callback);
};

Commander.prototype.unstageAll = function(callback) {
	this._execEnd('git reset HEAD', [], callback);
};

Commander.prototype.commit = function(message, callback) {
	this._execEnd('git commit -m', [message], callback);
};

Commander.prototype.push = function(callback) {
	this._execEnd('git push', [], callback);
};

Commander.prototype.fetch = function(remote, upstreamRef, callback) {
	this._execEnd('git fetch', [remote, upstreamRef], callback);
};

Commander.prototype.revertFile = function(file, callback) {
	var me = this;
	function revert() {
		me._execEnd('git checkout HEAD --', [file.name], callback);
	}
	if (file.staged) {
		this._exec('git reset HEAD --', [file.name], function(err) {
			if (err) return callback(err);
			revert();
		});
	} else {
		revert();
	}
};

Commander.prototype.checkoutBranch = function(branch, callback) {
	this._execEnd('git checkout', [branch], callback);
};
	
Commander.prototype.createBranch = function(branchName, doCheckout, callback) {
	if (doCheckout) this._execEnd('git checkout -b', [branchName], callback);
	else this._execEnd('git branch', [branchName], callback);
};

Commander.prototype.removeFileFromDisk = function(file, callback) {
	this._execEnd('rm -rf', [file.name], callback);
};

Commander.prototype.getLocalBranches = function(callback) {
	this._execEnd('git for-each-ref --sort=-committerdate --format="%(refname:short)\t%(upstream:short)\t%(authorname)\t%(authoremail)\t%(objectname:short)\t%(authordate:local)\t%(contents:subject)" refs/heads/', [], function(err, stdout) {
		if (err) return callback(err);
		var branches = stdout.trim().split(/[\r\n]/).map(function(line) {
			var parts = line.split(/\t/);
			return {
				name: parts[0], 
				upstream: parts[1] || '',
				lastCommit: {
					authorName: parts[2],
					authorEmail: parts[3].replace(/[<>]/g, ''),
					objectName: parts[4],
					date: parts[5],
					subject: parts[6]
				}
			};
		});
		callback(null, branches);
	});
};

Commander.prototype.stashSave = function(callback) {
	this._execEnd('git stash', [], callback);
};

Commander.prototype.stashPop = function(callback) {
	this._execEnd('git stash pop', [], callback);
};

Commander.prototype.submoduleUpdate = function(file, callback) {
	if (file !== null) this._execEnd('git submodule update --', [file.name], callback);
	else this._execEnd('git submodule update', [], callback);
};

Commander.prototype.getFileTopCommitters = function(file, limit, options, callback) {
	var cmd = 'git log --pretty=short ';
	cmd += options.join(' ');
	cmd += ' | git --no-pager shortlog -sne --';
	this._execEnd(cmd, [file.name], function(err, output) {
		if (err) return callback(err);
		var items = output.trim().split(/\r\n|\n|\r/).slice(0, limit);
		var map = Object.create(null);
		// FIXME: improve algorithm, use RegExp.exec
		items.forEach(function(item) {
			var match = item.trim().match(/^(\d+)\s+(.+?)\s+<(.+?)>$/);
			if (!match) return;
			var	count = parseInt(match[1]),
				name = match[2],
				email = match[3];
			if (!map[email]) {
				map[email] = {
					name: name,
					email: email,
					count: count
				};
			} else {
				if (map[email].name.length > name.length) {
					map[email].name = name;
				}
				map[email].count += count;
			}
		});
		var orderedItems = [];
		for (var key in map) {
			orderedItems.push(map[key]);
		}
		orderedItems.sort(function(a, b) {
			if (a.count > b.count) return -1;
			else if (a.count < b.count) return 1;
			return 0;
		});
		callback(null, orderedItems);
	});
};



Commander.prototype._exec = function(cmd, args, callback) {
	if (Array.isArray(args) && args.length > 0) {
		cmd += ' ' + args.map(escapeShellArg).join(' ');
	}
	this.emit('cmdstart', cmd, args);
	log('Executing:', cmd);
	chp.exec(cmd, {cwd: this.modulePath}, function(err, stdout, stderr) {
		if (err && stderr) {
			console.error('Command stderr output:', stderr);
			callback(new Error('Command failed: ' + cmd + '\n\n' + stderr));
		} else {
			log('Command stdout output:', stdout);
			callback(null, stdout);
		}
	});
};

Commander.prototype._execEnd = function(cmd, args, callback) {
	var me = this;
	this._exec(cmd, args, function(err, stdout) {
		me.emit('cmdend', cmd, args);
		callback(err, stdout);
	});
};

Commander.prototype._applyPatch = function(patch, callback) {
	var me = this;
	var process = chp.spawn('git', ['apply', '--cached', '-'], {
		cwd: this.modulePath
	});
	process.on('error', function(err) {
		console.log(err);
		try {
			process.kill();
		} catch (e) {
			callback(err);
		}
	});
	process.on('exit', function() {
		me.emit('cmdend');
		callback();
	});
	process.stdin.end(patch, 'utf8');
};

module.exports = Commander;
