var config = global.config,
	fs = require('fs'),
	util = require('util'),
	async = require('async'),
	events = require('events'),
	chp = require('child_process'),
	mmmagic = require('mmmagic'),
	GitParser = require('./GitParser');

function log() {
	if (console) {
		console.log.apply(console, arguments);
	}
}

var ModuleWatcher = function(baseGitRepoPath) {
	events.EventEmitter.call(this);
	var me = this;
	
	me.path = baseGitRepoPath.replace(/[\\\/]$/, '');
	me.repo = require('git-utils').open(me.path);
	me.changeTimer = null;
	me.shouldRefreshIndex = false;
	me.mmmagicInstance = new mmmagic.Magic(mmmagic.MAGIC_MIME);
	me.gitIgnorer = require('ignore')();
};

util.inherits(ModuleWatcher, events.EventEmitter);

ModuleWatcher.prototype.init = function() {
	var me = this;
	
	log('Initializing module: ' + me.path);
	
	me.watchedPaths = [];
	me.errEmitter = require('domain').create();
	me.errEmitter.on('error', function(err) {
		console.error(err);
		me.emit('error', err);
	});
	me.fsWatchers = require('domain').create();
	me.fsWatchers.on('error', function(err) {
		console.error(err);
	});
	
	me._watchDir(me.path);
	me._watchGitRepo();
};

ModuleWatcher.prototype.close = function() {
	log('Closing module: ' + this.path);
	this.fsWatchers.members.forEach(function(watcher) {
		watcher.close();
	});
	this.watchedPaths = [];
};

ModuleWatcher.prototype.getStatus = function(callback) {
	var me = this;
	if (me.changeTimer) {
		clearTimeout(me.changeTimer);
		me.changeTimer = null;
	}
	me._buildGitStatus(function(err, status) {
		if (err) return callback(err);
		me.getBranch(function(err, branch) {
			if (err) return callback(err);
			status.branch = branch;
			callback(null, status);
		});
	});
};

ModuleWatcher.prototype.getName = function() {
	return require('path').basename(this.path);
};

ModuleWatcher.prototype.getBranch = function(callback) {
	chp.exec('git status -sb', {cwd: this.path}, function(err, stdout) {
		if (err) return callback(err);
		var match = stdout.match(/^## ([^.\n]+)(?:\.\.\.([^.\n]+?)(?: \[(ahead|behind) (\d+)\])?)?$/m);
		var branch;
		if (match) {
			var branchName = match[1].trim();
			var remoteName = match[2] ? match[2].trim() : '';
			branch = {
				ahead: match[3] === 'ahead' ? match[4] : 0,
				behind: match[3] === 'behind' ? match[4] : 0,
				name: branchName,
				remote: remoteName
			};
		} else {
			branch = null;
		}
		callback(null, branch);
	});
};

ModuleWatcher.prototype.refreshIndex = function() {
	return this.repo.refreshIndex();
};

ModuleWatcher.prototype.statusChanged = function() {
	this._emitChange();
};

ModuleWatcher.prototype._watchDir = function(basePath) {
	var me = this;
	//log('Watching directory:', basePath);
	var watcher = fs.watch(basePath, function(event, fileName) {
		log('File changed:', fileName);
		var fullPath = require('path').join(basePath, fileName);
		me._removeWatchIfNecessary(fullPath);
		me._watchDirIfNecessary(fullPath);
		me._emitChange();
	});
	me.fsWatchers.add(watcher);
	me.watchedPaths.push(basePath);
	fs.readdir(basePath, me.errEmitter.intercept(function(files) {
		var ignorerFilter = me.gitIgnorer.createFilter();
		files.forEach(function(fileName) {
			var fullPath = require('path').join(basePath, fileName);
			if (ignorerFilter(fullPath)) {
				me._watchDirIfNecessary(fullPath);
			} else {
				log('Ignoring path:', fullPath);
			}
		});
	}));
};

ModuleWatcher.prototype._watchGitRepo = function() {
	var me = this;
	var gitFile = me.path + '/.git';
	function watch(directoryPath) {
		log('Watching repository:', directoryPath);
		var watcher = fs.watch(directoryPath, function(event, fileName) {
			if (['index', 'HEAD'].indexOf(fileName) > -1) {
				log('Git file changed:', require('path').join(directoryPath, fileName));
				me.shouldRefreshIndex = true;
				me._emitChange();
			}
		});
		me.fsWatchers.add(watcher);
	}
	fs.stat(gitFile, me.errEmitter.intercept(function(stat) {
		if (stat.isDirectory()) {
			watch(gitFile);
		} else {
			// submodule added with `git submodule add <url>`: fetch real repository path
			fs.readFile(gitFile, {encoding: 'utf8'}, me.errEmitter.intercept(function(contents) {
				var match = contents.trim().match(/^gitdir:\s*(.+)$/);
				var fullPath = require('path').resolve(me.path, match[1]);
				watch(fullPath);
			}));
		}
	}));
};

ModuleWatcher.prototype._watchDirIfNecessary = function(fullPath) {
	var me = this;
	var isSubmodule = me._isSubmodule(me.repo.relativize(fullPath));
	var fileName = require('path').basename(fullPath);
	if (fileName !== '.git' && !isSubmodule && me.watchedPaths.indexOf(fullPath) < 0) {
		fs.stat(fullPath, function(err, stat) {
			if (!err && stat.isDirectory()) {
				me._watchDir(fullPath);
			}
		});
	}
};

ModuleWatcher.prototype._removeWatchIfNecessary = function(fullPath) {
	var index;
	if (!fs.existsSync(fullPath) && (index = this.watchedPaths.indexOf(fullPath)) > -1) {
		log('Removing from watch list:', fullPath);
		this.watchedPaths.splice(index, 1);
	}
};

ModuleWatcher.prototype._buildGitStatus = function(callback) {
	var me = this;
	var statuses = {
		unstaged: [],
		staged: []
	};
	
	GitParser.getStatus(me.path, function(err, gitFilesStatus) {
		if (err) return callback(err);
		
		async.each(gitFilesStatus, function(file, callback) {
			var relativeRepoFileName = file.name;
			var filePath = require('path').join(me.path, relativeRepoFileName);
			var gitFileType = me._getItemType(relativeRepoFileName);
			var isUnstaged = file.unstaged;
			var isStaged = file.staged;
			var addStatus = function(type, statusStr, diff, fileTypeInfo) {
				statuses[type].push({
					name: relativeRepoFileName,
					path: filePath,
					type: gitFileType,
					status: statusStr,
					diff: diff || null,
					staged: isStaged,
					unstaged: isUnstaged,
					unmerged: file.unmerged,
					info: fileTypeInfo || {}
				});
			};
			
			async.waterfall([
				function(callback) { // detect file mime type
					me._getFileTypeInfo(relativeRepoFileName, callback);
				},
				function(fileTypeInfo, callback) { // build diff for text files
					var tasks = {};
					if (fileTypeInfo && !fileTypeInfo.isBinary) {
						if (isUnstaged) {
							tasks.unstaged = function(callback) {
								me._getFileDiff(relativeRepoFileName, isStaged, 'unstaged', callback);
							};
						}
						if (isStaged) {
							tasks.staged = function(callback) {
								me._getFileDiff(relativeRepoFileName, isStaged, 'staged', callback);
							};
						}
					}
					async.parallel(tasks, function(err, results) {
						if (err) return callback(err);
						
						if (isUnstaged) {
							addStatus('unstaged', file.unstagedStatusStr, results.unstaged, fileTypeInfo);
						}
						if (isStaged) {
							addStatus('staged', file.stagedStatusStr, results.staged, fileTypeInfo);
						}
						callback();
					});
				}
			], callback);
		}, function(err) {
			if (err) return callback(err);
			
			statuses.unstaged.sort(me._sortFiles);
			statuses.staged.sort(me._sortFiles);
			callback(null, statuses);
		});
	});
};

ModuleWatcher.prototype._getLatestFileContentsAsBuffer = function(relativeRepoFileName, callback) {
	var me = this;
	var filePath = require('path').join(me.path, relativeRepoFileName);
	fs.exists(filePath, function(exists) {
		if (exists) {
			fs.stat(filePath, function(err, stat) {
				if (err) return callback(err);
				if (stat.isDirectory()) return callback(null, null);
				fs.readFile(filePath, callback);
			});
		} else {
			callback(null, new Buffer(me.repo.getHeadBlob(relativeRepoFileName) || ''));
		}
	});
};

ModuleWatcher.prototype._getFileTypeInfo = function(relativeRepoFileName, callback) {
	var me = this;
	me._getLatestFileContentsAsBuffer(relativeRepoFileName, function(err, contents) {
		if (err) return callback(err);
		if (contents === null) return callback(null, null);
		me.mmmagicInstance.detect(contents, function(err, mimeType) {
			if (err) return callback(err);
			callback(null, {
				isBinary: /charset=(binary|unknown)/i.test(mimeType), 
				mimeType: mimeType
			});
		});
	});
};

ModuleWatcher.prototype._sortFiles = function(a, b) {
	if (a.name < b.name) return -1;
	else if (a.name > b.name) return 1;
	return 0;
};

ModuleWatcher.prototype._getFileDiff = function(relativeRepoFileName, isStaged, type, callback) {
	var me = this;
	var filePath = require('path').join(me.path, relativeRepoFileName);
	var headFileContents = me.repo.getHeadBlob(relativeRepoFileName) || '';
	var indexFileContents = me.repo.getIndexBlob(relativeRepoFileName) || '';
	var newFileContents, oldFileContents, diff;
	if (type === 'staged') {
		newFileContents = indexFileContents;
		oldFileContents = headFileContents;
		diff = me.repo.getLineDiffs(relativeRepoFileName, indexFileContents, {useIndex: false, ignoreEolWhitespace: config.diff.ignoreEolWhitespace});
	} else {
		newFileContents = (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) ? fs.readFileSync(filePath, {encoding: 'utf8'}) : '';
		oldFileContents = isStaged ? indexFileContents : headFileContents;
		diff = me.repo.getLineDiffs(relativeRepoFileName, newFileContents, {useIndex: isStaged, ignoreEolWhitespace: config.diff.ignoreEolWhitespace});
	}
	var newLines = newFileContents.split(/[\r\n]/);
	var oldLines = oldFileContents.split(/[\r\n]/);
	if (diff === null) {
		// new unstaged file
		return callback(null, newFileContents ? [
			me._getRangeLines(null, {
				start: 0,
				end: newLines.length,
				contents: newLines
			}) 
		]: null);
	}
	var oldOffset = 0;
	var lineChunks = diff.map(function(change) {
		var oldMin = Math.max(change.oldStart-1, 0);
		var newMin = Math.max(change.newStart-1, 0);
		oldOffset += Math.max(change.newLines - change.oldLines, 0); // positive integer
		var oldChunk = {
			start: oldMin,  // 0-based
			end: oldMin + change.oldLines,  // 0-based
			lines: change.oldLines,
			offset: oldOffset
		};
		var newChunk = {
			start: newMin,  // 0-based
			end: newMin + change.newLines,  // 0-based
			lines: change.newLines,
			offset: 0
		};
		return {
			old: oldChunk,
			new: newChunk
		};
	});
	var lines = me._buildLines(lineChunks, oldLines, newLines);
	callback(null, me._buildRanges(lines));
};

ModuleWatcher.prototype._buildLines = function(lineChunks, oldLines, newLines) {
	var me = this;
	var lines = [], contextLines = config.diff.contextLines || 3;
	
	function addChunk(chunk) { // 0-based
		addLines('-', chunk.old, oldLines);
		addLines('+', chunk.new, newLines);
	}
	function addLines(type, chunk, contents) { // 0-based
		lines = lines.concat(me._getRangeLines(type, {
			start: chunk.start,
			end: chunk.end,
			offset: chunk.offset,
			contents: contents
		}));
	}
	function addContextLines(start, end) { // 0-based
		addLines(null, {start: start, end: end}, newLines);
	}
	function addSeparator() {
		lines.push({type: 'separator'});
	}
	function getRangeStart(chunk) {
		var oldStart = chunk.old.start + chunk.old.offset;
		return chunk.new.lines > 0 ? Math.min(oldStart, chunk.new.start) : oldStart;
	}
	function getRangeEnd(chunk) {
		return Math.max(chunk.old.end + chunk.old.offset, chunk.new.end);
	}
	
	if (lineChunks.length > 0) {
		for (var i = 0, len = lineChunks.length; i < len; i++) {
			var nextRangeStart = i < (len - 1) ? getRangeStart(lineChunks[i+1]) : newLines.length - 1;
			var thisRangeStart = getRangeStart(lineChunks[i]);
			var thisRangeEnd = getRangeEnd(lineChunks[i]);
			var linesBetween = nextRangeStart - thisRangeEnd;
			if (i === 0) {
				addContextLines(thisRangeStart - contextLines, thisRangeStart);
			}
			addChunk(lineChunks[i]);
			if (linesBetween <= contextLines*2) {
				addContextLines(thisRangeStart + lineChunks[i].new.lines, thisRangeEnd + linesBetween);
			} else {
				addContextLines(thisRangeStart + lineChunks[i].new.lines, thisRangeEnd + contextLines);
				addSeparator();
				if (i < (len - 1)) {
					addContextLines(nextRangeStart - contextLines, nextRangeStart);
				}
			}
		}
	}
	
	return lines;
};

ModuleWatcher.prototype._buildRanges = function(lines) {
	var ranges = [], rangeLines = [];
	for (var i = 0, len = lines.length; i < len; i++) {
		if (lines[i].type !== 'separator') {
			rangeLines.push(lines[i]);
		}
		if (lines[i].type === 'separator' || i === (len - 1)) {
			ranges.push(rangeLines);
			rangeLines = [];
		}
	}
	return ranges;
};

ModuleWatcher.prototype._getRangeLines = function(type, range) {
	var lines = [], offset = range.offset || 0;
	for (var i = range.start; i < range.end; i++) {
		if (range.contents[i] === undefined) continue;
		lines.push({
			type: type,
			oldLine: i+1,
			newLine: i+1+offset,
			content: range.contents[i]
		});
	}
	return lines;
};

/**
 * 
 * @param {String} relativeRepoFileName
 * @returns {String} file|submodule
 */
ModuleWatcher.prototype._getItemType = function(relativeRepoFileName) {
	if (this._isSubmodule(relativeRepoFileName)) {
		return 'submodule';
	} else {
		return 'file';
	}
};

ModuleWatcher.prototype._relativize = function(fullPath) {
	return fullPath.replace(this.path, '').replace(/^[\/\\]/, '');
};

ModuleWatcher.prototype._isSubmodule = function(relativeRepoFileName) {
	var filePath = require('path').join(this.path, relativeRepoFileName);
	return fs.existsSync(require('path').join(filePath, '.git'));
};

ModuleWatcher.prototype._emitChange = function() {
	var me = this;
	if (me.changeTimer) {
		clearTimeout(me.changeTimer);
	}
	me.changeTimer = setTimeout(function() {
		me.changeTimer = null;
		if (me.shouldRefreshIndex) {
			me.refreshIndex();
			me.shouldRefreshIndex = false;
		}
		me.getStatus(me.errEmitter.intercept(function(status) {
			log(me.getName() + ': emitting change...');
			me.emit('change', status);
		}));
	}, 500);
};

module.exports = ModuleWatcher;
