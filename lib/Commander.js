var util = require('util'),
	events = require('events');
	
function log() {
	if (console && config.debugMode) {
		console.log.apply(console, arguments);
	}
}

function getPatchFromDiff(diff, line, reversePatch) {
	var regex = /\n@@\s*-(\d+),(\d+)\s+\+(\d+),(\d+)\s*@@(?:[^\n]|\n(?!@@))+/g;
	return diff.replace(regex, function(m0, deletionStart, deletionCount, additionStart, additionCount) {
		var rangeStart, rangeEnd, isDeletion = line.type === '-' && !reversePatch || line.type === '+' && reversePatch;
		if (isDeletion) {
			rangeStart = parseInt(deletionStart);
			rangeEnd = rangeStart + parseInt(deletionCount);
		} else {
			rangeStart = parseInt(additionStart);
			rangeEnd = rangeStart + parseInt(additionCount);
		}
		return line.number >= rangeStart && line.number <= rangeEnd ? m0 : '';
	});
}

function getLinePatchFromDiff(diff, line, reverse) {
	var regex = /(\n@@\s*-(\d+),\d+\s+\+(\d+),\d+\s*@@.*?\n)([\s\S]+)/g;
	var patch = getPatchFromDiff(diff, line, reverse);
	var isDeletion = line.type === '-' && !reverse || line.type === '+' && reverse;
	patch = patch.replace(regex, function(m0, header, deletionStart, additionStart, lineContents) {
		deletionStart = parseInt(deletionStart);
		additionStart = parseInt(additionStart);
		lineContents = lineContents.split(/\n/);
		if (isDeletion) {
			lineContents = lineContents.filter(function(lineContent) {
				return !/^\+/.test(lineContent);
			}).map(function(lineContent) {
				return line.number === deletionStart++ ? lineContent : lineContent.replace(/^-/, ' ');
			});
		} else {
			lineContents = lineContents.filter(function(lineContent) {
				var isValid = line.number === additionStart || !/^\+/.test(lineContent);
				if (/^[+ ]/.test(lineContent)) additionStart++;
				return isValid;
			}).map(function(lineContent) {
				return lineContent.replace(/^-/, ' ');
			});
		}
		return header + lineContents.join('\n');
	});
	if (!/\n$/.test(patch)) patch += '\n';
	return patch;
}

function escapeShellArg(input) {
	return input.replace(/([*?[\]'"\$;&()|^<>\n\t ])/g, '\\$1');
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
		var patch = getPatchFromDiff(output, line) + '\n';
		me._applyPatch(patch, false, callback);
	});
};

Commander.prototype.unstageHunk = function(file, line, callback) {
	var me = this;
	this._exec('git diff', ['-U' + config.diff.contextLines, '--cached', '-R', file.name], function(err, output) {
		if (err) return callback(err);
		var patch = getPatchFromDiff(output, line, true) + '\n';
		me._applyPatch(patch, false, callback);
	});
};

Commander.prototype.stageLine = function(file, line, callback) {
	var me = this;
	this._exec('git diff', ['-U3', file.name], function(err, output) {
		if (err) return callback(err);
		var patch = getLinePatchFromDiff(output, line, false);
		me._applyPatch(patch, true, callback);
	});
};

Commander.prototype.unstageLine = function(file, line, callback) {
	var me = this;
	this._exec('git diff', ['-U3', '--cached', '-R', file.name], function(err, output) {
		if (err) return callback(err);
		var patch = getLinePatchFromDiff(output, line, true);
		me._applyPatch(patch, true, callback);
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

Commander.prototype.softResetLastCommit = function(callback) {
	var me = this;
	this._exec('git log -1 --pretty=%B', [], function(err, output) {
		if (err) return callback(err);
		var msg = output.trim();
		me._execEnd('git reset --soft HEAD^', [], function(err, output) {
			if (err) return callback(err);
			callback(null, msg);
		});
	});
};

Commander.prototype.push = function(remote, options, callback) {
	var args = [];
	if (options.includeTags) args.push('--tags');
	args.push(remote || 'origin');
	this._execEnd('git push -v', args, callback);
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

Commander.prototype.deleteBranch = function(branchName, options, callback) {
	var args = [];
	if (options.force) args.push('-D');
	else args.push('-d');
	args.push(branchName);
	this._execEnd('git branch', args, callback);
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

Commander.prototype.submoduleUpdate = function(file, recursive, callback) {
	var cmd = 'git submodule update';
	if (recursive) cmd += ' --recursive';
	if (file !== null) this._execEnd(cmd + ' --', [file.name], callback);
	else this._execEnd(cmd, [], callback);
};

Commander.prototype.checkoutTheirs = function(file, callback) {
	var me = this;
	this._exec('git checkout --theirs --', [file.name], function(err) {
		if (err) callback(err);
		me.stageFile(file, callback);
	});
};

Commander.prototype.checkoutOurs = function(file, callback) {
	var me = this;
	this._exec('git checkout --ours --', [file.name], function(err) {
		if (err) callback(err);
		me.stageFile(file, callback);
	});
};

Commander.prototype.getRemotes = function(callback) {
	this._execEnd('git remote show', [], function(err, output) {
		if (err) callback(err);
		callback(null, output.trim().split(/\n/));
	});
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
	require('child_process').exec(cmd, {cwd: this.modulePath}, function(err, stdout, stderr) {
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
		me.emit('cmdend', err, stdout);
		callback(err, stdout);
	});
};

Commander.prototype._applyPatch = function(patch, recount, callback) {
	var me = this;
	var args = ['apply', '--cached'];
	if (recount) args.push('--recount');
	args.push('-');
	var chp = require('child_process');
	var process = chp.spawn('git', args, {
		cwd: this.modulePath
	});
	process.on('error', function(err) {
		console.error(err);
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
	process.stderr.setEncoding('utf8');
	process.stderr.on('data', function(data) {
		console.error(data);
	});
	process.stdin.end(patch, 'utf8');
};

module.exports = Commander;
