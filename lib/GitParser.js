module.exports = {
	
	getStatus: function(modulePath, callback) {
		var me = this;
		require('child_process').exec('git status --porcelain -z', {cwd: modulePath}, function(err, stdout, stderr) {
			if (err) return callback(err);
			var match, regex = /(?:([ MADRCU?])([ MADRCU?]) )?(.*?)\0/g;
			var files = [], isUnmerged;
			while ((match = regex.exec(stdout)) !== null) {
				isUnmerged = me._isUnmerged(match[1], match[2]);
				files.push({
					unmerged: isUnmerged,
					staged: me._isStaged(match[1]) && !isUnmerged,
					unstaged: me._isUnstaged(match[2]),
					stagedStatusStr: me._getStagedFileStatusLabel(match[1]),
					unstagedStatusStr: me._getUnstagedFileStatusLabel(match[2]),
					name: match[3]
				});
			}
			callback(null, files);
		});
	},
	
	getSubmoduleSummary: function(modulePath, submoduleRelativePath, callback) {
		var cmd = 'git submodule summary -- ' + submoduleRelativePath;
		require('child_process').exec(cmd, {cwd: modulePath}, function(err, stdout) {
			callback(err, stdout);
		});
	},
	
	_isUnmerged: function(stagedStatus, unstagedStatus) {
		return stagedStatus === 'U' || unstagedStatus === 'U' 
				|| (stagedStatus === 'A' && unstagedStatus === 'A')
			|| (stagedStatus === 'D' && unstagedStatus === 'D');
	},
	
	_isStaged: function(stagedStatus) {
		return ['U', ' ', '?'].indexOf(stagedStatus) === -1 || stagedStatus === undefined;
	},
	
	_isUnstaged: function(unstagedStatus) {
		return unstagedStatus !== undefined && unstagedStatus !== ' ';
	},
	
	_getStagedFileStatusLabel: function(stagedStatus) {
		if (stagedStatus === undefined || stagedStatus === 'D') {
			return 'deleted';
		} else if (['A', '?', 'R', 'C'].indexOf(stagedStatus) > -1) {
			return 'new';
		} else if (['M', 'U'].indexOf(stagedStatus) > -1) {
			return 'modified';
		}
		return null;
	},
	
	_getUnstagedFileStatusLabel: function(unstagedStatus) {
		if (unstagedStatus === 'D') {
			return 'deleted';
		} else if (unstagedStatus === 'A' || unstagedStatus === '?') {
			return 'new';
		} else if (['M', 'U'].indexOf(unstagedStatus) > -1) {
			return 'modified';
		}
		return null;
	}
};
