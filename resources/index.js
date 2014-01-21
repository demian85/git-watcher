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
	
var gitErrHandler = require('domain').create();
gitErrHandler.on('error', function(err) {
	UI.showError(err);
});

function log() {
	if (config.debugMode && console) {
		console.log.apply(console, arguments);
	}
}
function logError() {
	if (config.debugMode && console) {
		console.error.apply(console, arguments);
	}
}
	
function init() {
	if (!baseRepoDirectory) return alert('No repository path given!');
	gitWatcher = new GitWatcher(baseRepoDirectory);
	gitWatcher.on('change', function(status) {
		log('Event: change', status);
		UI.updateModule(status.module, status.status);
	});
	gitWatcher.on('error', function(err) {
		logError('Event: error', err);
		UI.showError(err);
		throw err;
	});
	gitWatcher.on('ready', function() {
		log('Event: ready');
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
	log('Updating status...');
	gitWatcher.getStatus(function(err, status) {
		if (err) return UI.showError(err);
		for (var module in status) {
			UI.updateModule(module, status[module]);
		}
	});
}

function updateCurrentModuleStatus() {
	log('Updating current module status...');
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
		this._updateModuleFilesDiff(moduleName, status);
		this._updateModuleFileList(moduleName, status);
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
	
	selectFile: function(name, type) {
		var items = $$('.fileList > li, .file');
		items.forEach(function(node) {
			if (node.dataset.name === name && node.dataset.type === type) {
				node.classList.add('selected');
			} else {
				node.classList.remove('selected');
			}
		});
	},
	
	_updateModuleFileList: function(moduleName, status) {
		var selectedFileNode = $m(moduleName, '.fileList > li.selected');
		var fileToSelect = selectedFileNode ? {
			name: selectedFileNode.dataset.name, 
			type: selectedFileNode.dataset.type
		} : null;
		function update(type) {
			var listNode = $m(moduleName, '.' + type + 'Files');
			listNode.innerHTML = '';
			status[type].map(function(file) {
				return _renderFileListItem(file, type);
			}).forEach(function(node) {
				listNode.appendChild(node);
			});
		}
		update('unstaged');
		update('staged');
		if (fileToSelect) {
			this.selectFile(fileToSelect.name, fileToSelect.type);
		}
	},
	
	_updateModuleFilesDiff: function(moduleName, status) {
		var diffNode = $m(moduleName, '.filesDiff');
		diffNode.innerHTML = '';
		function add(type) {
			status[type].filter(function(file) {
				return file.type !== 'submodule';
			}).map(function(file) {
				return _renderFileDiff(file, type);
			}).forEach(function(node) {
				diffNode.appendChild(node);
			});
		}
		add('unstaged');
		add('staged');
	},
	
	_updateModuleBranch: function(moduleName, branch) {
		var html = branch.name ? 'On branch <strong>' + branch.name + '</strong>. ' : 'Not currently on any branch.';
		if (branch.ahead > 0) html += 'Ahead of ' + branch.remote + ' by ' + branch.ahead + ' commits.';
		else if (branch.behind > 0) html += 'Behind of ' + branch.remote + ' by ' + branch.behind + ' commits.';
		$m(moduleName, '.branchInfo').innerHTML = html;
	},
	
	_addFileSelectionEvents: function() {
		var me = this;
		var items = $$('.fileList > li, .file');
		items.forEach(function(node) {
			node.addEventListener('mousedown', function(e) {
				if (!this.classList.contains('selected')) {
					me.selectFile(this.dataset.name, this.dataset.type);
				}
			}, false);
		});
	},
	
	_addModuleControlEvents: function(moduleName) {
		$m(moduleName,'.refreshButton').addEventListener('click', updateCurrentModuleStatus, false);
		$m(moduleName,'.commitButton').addEventListener('click', function(e) {
			var textarea = $m(moduleName, '.commitMessage');
			var message = textarea.value.trim();
			if (!message) {
				alert('Please enter a valid commit message!');
				textarea.focus();
				return;
			}
			Git.commit(currentModulePath, message, gitErrHandler.intercept(function() {
				textarea.value = '';
				updateCurrentModuleStatus();
			}));
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
	fileNode.classList.add(type);
	fileNode.dataset.type = type;
	fileNode.dataset.name = file.name;
	fileNode.dataset.path = file.path;
	fileNode.querySelector('.fileName').textContent = file.name;
	fileNode.querySelector('.fileName').title = 'Open file';
	fileNode.querySelector('.fileStatus').classList.add(file.status);
	fileNode.querySelector('.fileStatus').textContent = '[' + file.status + ']';
	fileNode.querySelector('.fileType').textContent = file.mimeType;
	var diffHtml = '';
	if (file.diff) {
		diffHtml += '<table class="fileDiff">';
		diffHtml += file.diff.map(function(range) {
			return '<tbody class="range">' + range.map(function(line) {
				var lineTypeStr = (line.type === '-' ? 'deleted' : (line.type === '+' ? 'added' : 'neutral'));
				var symbol = (line.type === '-' ? '-' : (line.type === '+' ? '+' : ' '));
				return '<tr class="lineRow ' + lineTypeStr + '"><td class="line oldLine">' + (line.type === '-' ? line.oldLine : '') + '</td><td class="line newLine">' + (line.type !== '-' ? line.newLine : '') + '</td><td>' + symbol + '</td><td>' + _renderFileDiffLine(file, line.content) + '</td></tr>';
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
 * @param {String} lineText
 * @returns {String}
 */
function _renderFileDiffLine(file, lineText) {
	var hlConf = config.diff.highlight;
	if (hlConf.enabled) {
		var ext = require('path').extname(file.name);
		if (hlConf.byFileExtension[ext] === undefined || hlConf.byFileExtension[ext]) {
			var hl = require('highlighter').getInstance(ext);
			if (hl) {
				return hl.highlight(lineText);
			}
		}
	}
	return lineText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 
 * @param {object} file
 * @param {string} type staged|unstaged
 * @returns {HTMLElement}
 */
function _renderFileListItem(file, type) {
	var node = document.importNode($('#gitFileListItemTpl').content, true).querySelector('li');
	node.querySelector('.fileListItemLabel').textContent = file.name;
	var cssClass = file.type + '-' + file.status;
	node.classList.add(cssClass);
	node.dataset.name = file.name;
	node.dataset.type = type;
	node.addEventListener('dblclick', function(e) {
		if (type === 'staged') {
			Git.unstageFile(currentModulePath, file, gitErrHandler.intercept(function() {}));
		} else {
			Git.stageFile(currentModulePath, file, gitErrHandler.intercept(function() {}));
		}
	}, false);
	return node;
}

function _handleGitResponse(err, response) {
	if (err) UI.showError(err);
	updateCurrentModuleStatus();
}
