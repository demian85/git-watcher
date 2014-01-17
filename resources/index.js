var GitWatcher = require('git-watcher'),
	Git = require('git'),
	util = require('util'),
	gui = require('nw.gui');
	
var $ = function(s, ctx) {
	ctx = ctx || document;
	return ctx.querySelector(s);
};
var $$ = function(s, ctx) {
	ctx = ctx || document;
	return [].slice.call(ctx.querySelectorAll(s));
};
var $m = function(moduleName, selector) {
	return $('.module[data-name="' + moduleName + '"]').querySelector(selector);
};
var $$m = function(moduleName, selector) {
	return $$(selector, $('.module[data-name="' + moduleName + '"]'));
};

var config = require('loader').loadConfig(), 
	baseRepoDirectory = gui.App.argv[0] || config.defaultRepository || null, 
	currentModulePath = null, 
	currentModuleName = null, 
	gitWatcher;
	
function init() {
	if (!baseRepoDirectory) return alert('No repository path given!');
	gitWatcher = new GitWatcher(baseRepoDirectory);
	gitWatcher.on('change', function(status) {
		if (config.debugMode) console.log(status, 'event: change');
		UI.updateModule(status.module, status.status);
	});
	gitWatcher.on('error', function(err) {
		if (config.debugMode) console.error('event: error');
		UI.showError(err);
	});
	gitWatcher.on('ready', function() {
		if (config.debugMode) console.log('event: ready');
		var modules = gitWatcher.getModules();
		modules.forEach(function(module) {
			UI.createModule(module);
		});
		UI.showModule(modules[0]);
		updateStatus();
	});
	gitWatcher.init();
}

function updateStatus() {
	gitWatcher.getStatus(function(err, status) {
		if (err) return UI.showError(err);
		for (var module in status) {
			UI.updateModule(module, status[module]);
		}
	});
}

function updateCurrentModuleStatus() {
	gitWatcher.getModuleStatus(currentModuleName, function(err, status) {
		if (err) return UI.showError(err);
		UI.updateModule(currentModuleName, status);
	});
}

var UI = {
	showModule: function(moduleName) {
		currentModuleName = moduleName;
		currentModulePath = require('path').dirname(baseRepoDirectory) + moduleName;
		$$('.moduleLabel, .module').forEach(function(node) {
			if (node.dataset.name === currentModuleName) {
				node.classList.add('visible');
			} else {
				node.classList.remove('visible');
			}
		});
	},
	
	updateModule: function(moduleName, status) {
		this._updateModuleBranch(moduleName, status.branch);
		this._updateModuleFileList(moduleName, 'unstaged', status.unstaged);
		this._updateModuleFileList(moduleName, 'staged', status.staged);
		this._updateModuleFilesDiff(moduleName, status);
		this._addFileSelectionEvents();
	},
	
	createModule: function(moduleName) {
		var module = document.importNode($('#gitModuleTpl').content, true).querySelector('.module');
		module.dataset.name = moduleName;
		$('#main').appendChild(module);
		this._addModuleControlEvents(moduleName);
		$$m(moduleName, '.commitOption').forEach(function(node) {
			node.name = moduleName;
		});
		var moduleLabel = document.importNode($('#gitModuleLabelTpl').content, true).querySelector('li');
		moduleLabel.textContent = moduleName.replace(/^\//, '');
		moduleLabel.dataset.name = moduleName;
		moduleLabel.addEventListener('focus', function(e) {
			UI.showModule(this.dataset.name);
		}, false);
		$('#gitModules').appendChild(moduleLabel);
	},
	
	showError: function(err) {
		alert(err.message);
	},
	
	_updateModuleFileList: function(moduleName, type, files) {
		var listNode = $m(moduleName, '.' + type + 'Files');
		listNode.innerHTML = '';
		files.map(function(file) {
			return _renderFileListItem(file, type);
		}).forEach(function(node) {
			listNode.appendChild(node);
		});
	},
	
	_updateModuleFilesDiff: function(moduleName, status) {
		var diffNode = $m(moduleName, '.filesDiff');
		diffNode.innerHTML = '';
		status.unstaged.map(function(file) {
			return _renderFileDiff(file, 'unstaged');
		}).forEach(function(node) {
			diffNode.appendChild(node);
		});
		status.staged.map(function(file) {
			return _renderFileDiff(file, 'staged');
		}).forEach(function(node) {
			diffNode.appendChild(node);
		});
	},
	
	_updateModuleBranch: function(moduleName, branch) {
		var html = 'On branch <strong>' + branch.name + '</strong>. ';
		if (branch.ahead > 0) html += 'Ahead of ' + branch.remote + ' by ' + branch.ahead + ' commits.';
		else if (branch.behind > 0) html += 'Behind of ' + branch.remote + ' by ' + branch.behind + ' commits.';
		$m(moduleName, '.branchInfo').innerHTML = html;
	},
	
	_addFileSelectionEvents: function() {
		var items = $$('.fileList > li, .file');
		items.forEach(function(node) {
			node.addEventListener('mousedown', function(e) {
				if (this.classList.contains('selected')) return;
				var clickedFileName = this.dataset.name;
				var fileType = this.dataset.type;
				items.forEach(function(node) {
					if (node.dataset.name === clickedFileName && node.dataset.type === fileType) {
						node.classList.add('selected');
					} else {
						node.classList.remove('selected');
					}
				});
			}, false);
		});
	},
	
	_addModuleControlEvents: function(moduleName) {
		$m(moduleName,'.commitButton').addEventListener('click', function(e) {
			var textarea = $m(moduleName, '.commitMessage');
			var message = textarea.value.trim();
			if (!message) {
				alert('Please enter a valid commit message!');
				textarea.focus();
				return;
			}
			Git.commit(currentModulePath, message, function(err, res) {
				_handleGitResponse(err);
				textarea.value = '';
			});
		}, false);
		$m(moduleName,'.pushButton').addEventListener('click', function(e) {
			Git.push(currentModulePath, _handleGitResponse);
		}, false);
	}
};

/**
 * 
 * @param {object} file {name, path, status, type, diff}
 * @param {String} type unstaged|staged
 * @returns {String}
 */
function _renderFileDiff(file, type) {
	var fileNode = document.importNode($('#gitModuleFileTpl').content, true).querySelector('.file');
	var isSubmoduleLabel = file.type === 'file' ? '' : '[submodule]';
	fileNode.classList.add(type);
	fileNode.dataset.type = type;
	fileNode.dataset.name = file.name;
	fileNode.dataset.path = file.path;
	fileNode.querySelector('.fileName').textContent = file.name;
	fileNode.querySelector('.fileName').title = 'Open file';
	fileNode.querySelector('.fileStatus').classList.add(file.status);
	fileNode.querySelector('.fileStatus').textContent = isSubmoduleLabel + ' [' + file.status + ']';
	fileNode.querySelector('.fileType').textContent = file.mimeType;
	var diffHtml = '';
	if (file.diff) {
		diffHtml += '<table class="fileDiff">';
		diffHtml += file.diff.map(function(range) {
			return '<tbody class="range">' + range.map(function(line) {
				var lineTypeStr = (line.type === '-' ? 'deleted' : (line.type === '+' ? 'added' : 'neutral'));
				var symbol = (line.type === '-' ? '-' : (line.type === '+' ? '+' : ' '));
				return '<tr class="lineRow ' + lineTypeStr + '"><td class="line oldLine">' + (line.type === '-' ? line.oldLine : '') + '</td><td class="line newLine">' + (line.type !== '-' ? line.newLine : '') + '</td><td>' + symbol + '</td><td>' + line.content.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</td></tr>';
			}).join('\n') + '</tbody>';
		}).join('');
		diffHtml += '<table>';
	} else {
		diffHtml += '<div class="emptyLabel">[empty]</div>';
	}
	fileNode.querySelector('.fileDiffContents').innerHTML = diffHtml;
	fileNode.addEventListener('click', function(e) {
		if (e.target.webkitMatchesSelector('.fileName, .newLine')) {
			gui.Shell.openItem(file.path);
		}
	}, false);
	return fileNode;
}

/**
 * 
 * @param {object} file
 * @param {string} type staged|unstaged
 * @returns {HTMLElement}
 */
function _renderFileListItem(file, type) {
	var node = document.importNode($('#gitFileListItemTpl').content, true).querySelector('li');
	node.textContent = file.name;
	node.dataset.name = file.name;
	node.dataset.type = type;
	node.addEventListener('dblclick', function(e) {
		if (type === 'staged') {
			Git.unstageFile(currentModulePath, file, _handleGitResponse);
		} else {
			Git.stageFile(currentModulePath, file, _handleGitResponse);
		}
	}, false);
	return node;
}

function _handleGitResponse(err, response) {
	if (err) UI.showError(err);
	updateCurrentModuleStatus();
}
