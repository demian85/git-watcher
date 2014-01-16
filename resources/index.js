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
		this._updateModuleFilesDiff(moduleName, 'unstaged', status.unstaged);
		this._updateModuleFilesDiff(moduleName, 'staged', status.staged);
		this._addFileSelectionEvents('unstaged');
		this._addFileSelectionEvents('staged');
	},
	
	createModule: function(moduleName) {
		var module = document.importNode($('#gitModuleTpl').content, true).querySelector('.module');
		module.dataset.name = moduleName;
		module.querySelector('.commitButton', module).addEventListener('click', function(e) {
			var message = module.querySelector('.commitMessage').value;
			Git.commit(currentModulePath, message, function(err, res) {
				_handleGitResponse(err);
				module.querySelector('.commitMessage').value = '';
			});
		}, false);
		$$('.commitOption', module).forEach(function(node) {
			node.name = moduleName;
		});
		$('#main').appendChild(module);
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
		var listNode = $m(moduleName, '.' + type + 'Files .fileList');
		listNode.innerHTML = '';
		files.map(function(file) {
			return _renderFileListItem(file, type);
		}).forEach(function(node) {
			listNode.appendChild(node);
		});
	},
	
	_updateModuleFilesDiff: function(moduleName, type, files) {
		var diffNode = $m(moduleName, '.' + type + 'Files .diff');
		diffNode.innerHTML = '';
		files.map(_renderFileDiff).forEach(function(node) {
			diffNode.appendChild(node);
		});
	},
	
	_updateModuleBranch: function(moduleName, branch) {
		var html = 'On branch <strong>' + branch.name + '</strong>. ';
		if (branch.ahead > 0) html += 'Ahead of ' + branch.remote + ' by ' + branch.ahead + ' commits.';
		else if (branch.behind > 0) html += 'Behind of ' + branch.remote + ' by ' + branch.behind + ' commits.';
		$m(moduleName, '.branchInfo').innerHTML = html;
	},
	
	_addFileSelectionEvents: function(type) {
		var items = $$('.fileList > li, .diff > .file', $('.' + type + 'Files'));
		items.forEach(function(node) {
			node.addEventListener('mousedown', function(e) {
				if (this.classList.contains('selected')) return;
				var clickedFileName = this.dataset.name;
				items.forEach(function(node) {
					if (node.dataset.name === clickedFileName) {
						node.classList.add('selected');
						node.scrollIntoView(false);
					} else {
						node.classList.remove('selected');
					}
				});
			}, false);
		});
	}
};

/**
 * 
 * @param {object} file {name, path, status, type, diff}
 * @returns {String}
 */
function _renderFileDiff(file) {
	var fileNode = document.importNode($('#gitModuleFileTpl').content, true).querySelector('.file');
	var isSubmoduleLabel = file.type === 'file' ? '' : '[submodule]';
	fileNode.dataset.name = file.name;
	fileNode.dataset.path = file.path;
	fileNode.querySelector('.fileName').textContent = file.name;
	fileNode.querySelector('.fileStatus').classList.add(file.status);
	fileNode.querySelector('.fileStatus').textContent = isSubmoduleLabel + ' [' + file.status + ']';
	fileNode.querySelector('.fileType').textContent = file.mimeType;
	var diffHtml = '';
	if (file.diff) {
		diffHtml += file.diff.map(function(range) {
			return '<div class="range">' + range.map(function(line) {
				var lineTypeStr = (line.type === '-' ? 'deleted' : (line.type === '+' ? 'added' : 'neutral'));
				var symbol = (line.type === '-' ? '-' : (line.type === '+' ? '+' : ' '));
				return '<div class="lineRow ' + lineTypeStr + '"><span class="line oldLine">' + (line.type === '-' ? line.oldLine : ' ') + '</span><span class="line newLine">' + (line.type !== '-' ? line.newLine : ' ') + '</span>' + symbol + ' ' + line.content.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
			}).join('\n') + '</div>';
		}).join('');
	} else {
		diffHtml += '<span class="emptyLabel">[empty]</span>';
	}
	fileNode.querySelector('.fileDiffContents').innerHTML = diffHtml;
	fileNode.addEventListener('click', function(e) {
		if (e.target.webkitMatchesSelector('.fileName, .fileDiffContents .added .line, .fileDiffContents .neutral .line')) {
			gui.Shell.openItem(file.path);
		}
	}, false);
	return fileNode;
}

/**
 * 
 * @param {object} file
 * @param {string} status
 * @returns {HTMLElement}
 */
function _renderFileListItem(file, status) {
	var node = document.importNode($('#gitFileListItemTpl').content, true).querySelector('li');
	node.textContent = file.name;
	node.dataset.name = file.name;
	node.addEventListener('dblclick', function(e) {
		if (status === 'staged') {
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
