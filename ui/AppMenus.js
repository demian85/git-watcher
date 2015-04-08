var AppMenus = {
	
	menus: Object.create(null),
	items: Object.create(null),
	shortcuts: null,
	recentRepositories: [],
	
	init: function() {
		this._loadRecentRepositories();
		this._loadShortcuts();
		this._createMenuBar();
		this._updateRecentRepositoriesMenu();
		this.enableRepoMenu(false);
	},
	
	_updateRecentRepositoriesMenu: function() {
		var menu = new gui.Menu();
		this.recentRepositories.forEach(function(path) {
			menu.append(new gui.MenuItem({
				label: path,
				click: function() {
					openRepository(path);
				}
			}));
		}, this);
		this.items['repositoryRecent'].submenu = menu;
	},
	
	_createFileMenu: function(file, type, line) {
		var items = Object.create(null);
		
		items['stage'] = new gui.MenuItem({
			label: ' Stage file',
			icon: 'icons/stage.png',
			click: function() {
				commander.stageFile(file, _handleGitResponse);
			}
		});
		items['unstage'] = new gui.MenuItem({
			label: ' Unstage file',
			icon: 'icons/unstage.png',
			click: function() {
				commander.unstageFile(file, _handleGitResponse);
			}
		});
		if (line !== null) {
			items['stageHunk'] = new gui.MenuItem({
				label: ' Stage hunk',
				icon: 'icons/stage.png',
				click: function() {
					commander.stageHunk(file, line, _handleGitResponse);
				}
			});
			items['unstageHunk'] = new gui.MenuItem({
				label: ' Unstage hunk',
				icon: 'icons/unstage.png',
				click: function() {
					commander.unstageHunk(file, line, _handleGitResponse);
				}
			});
			if (line.type !== null) {
				items['stageLine'] = new gui.MenuItem({
					label: ' Stage line ' + line.number,
					icon: 'icons/stage.png',
					click: function() {
						commander.stageLine(file, line, _handleGitResponse);
					}
				});
				items['unstageLine'] = new gui.MenuItem({
					label: ' Unstage line ' + line.number,
					icon: 'icons/unstage.png',
					click: function() {
						commander.unstageLine(file, line, _handleGitResponse);
					}
				});
			}
		}
		items['revert'] = new gui.MenuItem({
			label: ' Revert changes',
			icon: 'icons/revert.png',
			click: function() {
				commander.revertFile(file, _handleGitResponse);
			}
		});
		items['submoduleUpdate'] = new gui.MenuItem({
			label: ' Submodule update',
			icon: 'icons/submodule-update.png',
			click: function() {
				commander.submoduleUpdate(file, false, _handleGitResponse);
			}
		});
		items['checkoutTheirs'] = new gui.MenuItem({
			label: ' Checkout theirs',
			icon: 'icons/checkout-theirs.png',
			click: function() {
				commander.checkoutTheirs(file, _handleGitResponse);
			}
		});
		items['checkoutOurs'] = new gui.MenuItem({
			label: ' Checkout ours',
			icon: 'icons/checkout-ours.png',
			click: function() {
				commander.checkoutOurs(file, _handleGitResponse);
			}
		});
		items['open'] = new gui.MenuItem({
			label: ' Open file',
			icon: 'icons/open-file.png',
			click: function() {
				External.openFile(file);
			}
		});
		items['delete'] = new gui.MenuItem({
			label: ' Delete file',
			icon: 'icons/delete.png',
			click: function() {
				commander.removeFileFromDisk(file, _handleGitResponse);
			}
		});
		items['viewHistory'] = new gui.MenuItem({
			label: ' View file history',
			icon: 'icons/view-history.png',
			click: function() {
				External.openGitk(currentModulePath, file);
			}
		});
		items['blame'] = new gui.MenuItem({
			label: ' Blame',
			icon: 'icons/view-history.png',
			click: function() {
				External.openGitBlame(currentModulePath, file, line ? line.number : null);
			}
		});
		items['stats'] = new gui.MenuItem({
			label: ' Statistics',
			icon: 'icons/statistics.png',
			click: function() {
				FileStatisticsDialog(file);
			}
		});
		
		var isUnstagedNew = type === 'unstaged' && file.unstaged && file.status === 'new';
		var isDeleted = file.status === 'deleted';
		var isSubmodule = file.type === 'submodule';
		var menu = new gui.Menu();
		
		if (type === 'unstaged' && file.unstaged) menu.append(items['stage']);
		if (type === 'staged' && file.staged) menu.append(items['unstage']);
		if (line !== null && !isSubmodule && file.status === 'modified') {
			if (type === 'unstaged' && file.unstaged) {
				menu.append(items['stageHunk']);
				if (line.type) menu.append(items['stageLine']);
			}
			if (type === 'staged' && file.staged) {
				menu.append(items['unstageHunk']);
				if (line.type) menu.append(items['unstageLine']);
			}
		}
		if (file.unmerged) {
			menu.append(items['checkoutTheirs']);
			menu.append(items['checkoutOurs']);
		}
		if (isSubmodule && file.status === 'modified') menu.append(items['submoduleUpdate']);
		if (file.status !== 'new' && !isSubmodule) menu.append(items['revert']);
		if (file.status !== 'deleted') menu.append(items['open']);
		if (type === 'unstaged' && file.unstaged && !isDeleted) menu.append(items['delete']);
		if (!isUnstagedNew && !isDeleted) {
			menu.append(new gui.MenuItem({type: 'separator'}));
			if (file.status !== 'new') menu.append(items['viewHistory']);
			if (!isSubmodule) menu.append(items['blame']);
			menu.append(items['stats']);
		}
		
		return menu;
	},
	
	_createMenuBar: function() {
		var shortcut = this._getMenuShortcut.bind(this);
		
		// Repository items
		this.items['repositoryOpen'] = new gui.MenuItem({
			label: 'Open...',
			key: shortcut('repositoryOpen').key,
			modifiers: shortcut('repositoryOpen').modifiers,
			click: chooseRepository
		});
		this.items['repositoryClose'] = new gui.MenuItem({
			label: 'Close',
            enabled: false,
			key: shortcut('repositoryClose').key,
			modifiers: shortcut('repositoryClose').modifiers,
			click: closeRepository
		});
		this.items['repositoryRecent'] = new gui.MenuItem({
			label: 'Recent...'
		});
		this.items['repositorySubmoduleUpdate'] = new gui.MenuItem({
			label: 'Submodule update',
			key: shortcut('repositorySubmoduleUpdate').key,
			modifiers: shortcut('repositorySubmoduleUpdate').modifiers,
			click: function() {
				commander.submoduleUpdate(null, false, _handleGitResponse);
			}
		});
		this.items['repositorySubmoduleUpdateRecursive'] = new gui.MenuItem({
			label: 'Submodule update (recursive)',
			key: shortcut('repositorySubmoduleUpdateRecursive').key,
			modifiers: shortcut('repositorySubmoduleUpdateRecursive').modifiers,
			click: function() {
				commander.submoduleUpdate(null, true, _handleGitResponse);
			}
		});
		this.items['repositoryExplore'] = new gui.MenuItem({
			label: 'Explore...',
			key: shortcut('repositoryExplore').key,
			modifiers: shortcut('repositoryExplore').modifiers,
			click: function() {
				gui.Shell.openItem(currentModulePath);
			}
		});
		this.items['repositoryBrowse'] = new gui.MenuItem({
			label: 'View branch history (gitk)',
			enabled: false,
			key: shortcut('repositoryBrowse').key,
			modifiers: shortcut('repositoryBrowse').modifiers,
			click: function() {
				External.openGitk(currentModulePath);
			}
		});
		this.items['repositoryRefresh'] = new gui.MenuItem({
			label: 'Refresh',
			enabled: false,
			key: shortcut('repositoryRefresh').key,
			modifiers: shortcut('repositoryRefresh').modifiers,
			click: updateCurrentModuleStatus
		});
		this.items['repositoryQuit'] = new gui.MenuItem({
			label: 'Quit',
			key: shortcut('repositoryQuit').key,
			modifiers: shortcut('repositoryQuit').modifiers,
			click: function() {
				gui.Window.get().close();
			}
		});
		
		// Branch items
		this.items['branchCheckout'] = new gui.MenuItem({
			label: 'Checkout...',
			key: shortcut('branchCheckout').key,
			modifiers: shortcut('branchCheckout').modifiers,
			click: function() {
				BranchCheckoutDialog();
			}
		});
		this.items['branchCreate'] = new gui.MenuItem({
			label: 'Create...',
			key: shortcut('branchCreate').key,
			modifiers: shortcut('branchCreate').modifiers,
			click: function() {
				BranchCreateDialog();
			}
		});
		this.items['branchDelete'] = new gui.MenuItem({
			label: 'Delete...',
			key: shortcut('branchDelete').key,
			modifiers: shortcut('branchDelete').modifiers,
			click: function() {
				BranchDeleteDialog();
			}
		});
		
		// Commit items
		this.items['commitAmend'] = new gui.MenuItem({
			label: 'Amend (Soft reset last commit)',
			key: shortcut('commitAmend').key,
			modifiers: shortcut('commitAmend').modifiers,
			click: function() {
				amendCommit();
			}
		});
		this.items['commitStageAll'] = new gui.MenuItem({
			label: 'Stage all files',
			key: shortcut('commitStageAll').key,
			modifiers: shortcut('commitStageAll').modifiers,
			click: function() {
				commander.stageAll(_handleGitResponse);
			}
		});
		this.items['commitUnstageAll'] = new gui.MenuItem({
			label: 'Unstage all files',
			key: shortcut('commitUnstageAll').key,
			modifiers: shortcut('commitUnstageAll').modifiers,
			click: function() {
				commander.unstageAll(_handleGitResponse);
			}
		});
		
		// Stash items
		this.items['stashSave'] = new gui.MenuItem({
			label: 'Save',
			key: shortcut('stashSave').key,
			modifiers: shortcut('stashSave').modifiers,
			click: function() {
				commander.stashSave(_handleGitResponse);
			}
		});
		this.items['stashPop'] = new gui.MenuItem({
			label: 'Pop',
			key: shortcut('stashPop').key,
			modifiers: shortcut('stashPop').modifiers,
			click: function() {
				commander.stashPop(_handleGitResponse);
			}
		});
		
		// Options items
		this.items['optionsZoomIn'] = new gui.MenuItem({
			label: 'Zoom In',
			click: function() {
				var zoom = gui.Window.get().zoomLevel;
				gui.Window.get().zoomLevel = zoom + 1;
			}
		});
		this.items['optionsZoomOut'] = new gui.MenuItem({
			label: 'Zoom Out',
			click: function() {
				var zoom = gui.Window.get().zoomLevel;
				gui.Window.get().zoomLevel = zoom - 1;
			}
		});
		this.items['optionsLessContext'] = new gui.MenuItem({
			label: 'Less context',
			click: function() {
				config.diff.contextLines--;
				if (config.diff.contextLines < 2) config.diff.contextLines = 2;
				updateGlobalStatus();
			}
		});
		this.items['optionsMoreContext'] = new gui.MenuItem({
			label: 'More context',
			click: function() {
				config.diff.contextLines++;
				updateGlobalStatus();
			}
		});
		this.items['optionsEolWhitespace'] = new gui.MenuItem({
			type: 'checkbox',
			checked: config.diff.ignoreEolWhitespace,
			label: 'Ignore EOL whitespace',
			click: function() {
				config.diff.ignoreEolWhitespace = this.checked;
				updateGlobalStatus();
			}
		});
		this.items['optionsSyntaxHighlighting'] = new gui.MenuItem({
			type: 'checkbox',
			checked: config.diff.highlight.enabled,
			label: 'Syntax highlighting',
			click: function() {
				config.diff.highlight.enabled = this.checked;
				updateGlobalStatus();
			}
		});
		this.items['optionsMultipleFileView'] = new gui.MenuItem({
			type: 'checkbox',
			checked: config.diff.defaultMaxFiles > 1,
			label: 'Multiple files view',
			click: function() {
				config.diff.defaultMaxFiles = this.checked ? 6 : 1;
				updateGlobalStatus();
			}
		});
		this.items['optionsShowCommitLog'] = new gui.MenuItem({
			type: 'checkbox',
			checked: !!config.uiOptions.showCommitLog,
			label: 'Show commit log',
			click: function() {
				config.uiOptions.showCommitLog = this.checked;
				UI.updateGlobalLayout();
				updateGlobalStatus();
			}
		});
		
		// Help items
		this.items['helpReportBugs'] = new gui.MenuItem({
			label: 'Report bug...',
			click: function() {
				gui.Shell.openExternal('https://github.com/demian85/git-watcher/issues');
			}
		});
		
		this.menus.repository = new gui.Menu();
		this.menus.repository.append(this.items['repositoryOpen']);
		this.menus.repository.append(this.items['repositoryClose']);
		this.menus.repository.append(this.items['repositoryRecent']);
		this.menus.repository.append(this.items['repositoryRefresh']);
		this.menus.repository.append(new gui.MenuItem({type: 'separator'}));
		this.menus.repository.append(this.items['repositorySubmoduleUpdate']);
		this.menus.repository.append(this.items['repositorySubmoduleUpdateRecursive']);
		this.menus.repository.append(this.items['repositoryExplore']);
		this.menus.repository.append(this.items['repositoryBrowse']);
		this.menus.repository.append(new gui.MenuItem({type: 'separator'}));
		this.menus.repository.append(this.items['repositoryQuit']);
		
		this.menus.branch = new gui.Menu();
		this.menus.branch.append(this.items['branchCheckout']);
		this.menus.branch.append(this.items['branchCreate']);
		this.menus.branch.append(this.items['branchDelete']);
		
		this.menus.commit = new gui.Menu();
		this.menus.commit.append(this.items['commitAmend']);
		this.menus.commit.append(this.items['commitStageAll']);
		this.menus.commit.append(this.items['commitUnstageAll']);
		
		this.menus.stash = new gui.Menu();
		this.menus.stash.append(this.items['stashSave']);
		this.menus.stash.append(this.items['stashPop']);
		
		this.menus.options = new gui.Menu();
		this.menus.options.append(this.items['optionsZoomIn']);
		this.menus.options.append(this.items['optionsZoomOut']);
		this.menus.options.append(new gui.MenuItem({type: 'separator'}));
		this.menus.options.append(this.items['optionsLessContext']);
		this.menus.options.append(this.items['optionsMoreContext']);
		this.menus.options.append(this.items['optionsEolWhitespace']);
		this.menus.options.append(this.items['optionsSyntaxHighlighting']);
		this.menus.options.append(this.items['optionsMultipleFileView']);
		this.menus.options.append(this.items['optionsShowCommitLog']);
		
		this._createToolsMenu();
		
		this.menus.help = new gui.Menu();
		this.menus.help.append(this.items['helpReportBugs']);
		
		this.items['branchMenu'] = new gui.MenuItem({
			label: 'Branch',
			submenu: this.menus.branch
		});
		this.items['commitMenu'] = new gui.MenuItem({
			label: 'Commit',
			submenu: this.menus.commit
		});
		this.items['stashMenu'] = new gui.MenuItem({
			label: 'Stash',
			submenu: this.menus.stash
		});
		this.items['optionsMenu'] = new gui.MenuItem({
			label: 'Options',
			submenu: this.menus.options
		});
		this.items['toolsMenu'] = new gui.MenuItem({
			label: 'Tools',
			submenu: this.menus.tools
		});
		
		this.menubar = new gui.Menu({type: 'menubar'});
		this.menubar.append(new gui.MenuItem({
			label: 'Repository',
			submenu: this.menus.repository
		}));
		this.menubar.append(this.items['branchMenu']);
		this.menubar.append(this.items['commitMenu']);
		this.menubar.append(this.items['stashMenu']);
		this.menubar.append(this.items['optionsMenu']);
		this.menubar.append(this.items['toolsMenu']);
		this.menubar.append(new gui.MenuItem({
			label: 'Help',
			submenu: this.menus.help
		}));
		
		gui.Window.get().menu = this.menubar;
	},
	
	_createToolsMenu: function() {
		this.menus.tools = new gui.Menu();
		config.tools.forEach(function(tool) {
			if (!tool.name || !tool.cmd) return;
			this.menus.tools.append(new gui.MenuItem({
				label: tool.name,
				click: function() {
					External.execTool(currentModulePath, tool);
				}
			}));
		}, this);
	},
	
	_getMenuShortcut: function(key) {
		return this.shortcuts[key] || {key: "", modifiers: ""};
	},
	
	_loadShortcuts: function() {
		var shortcuts = config.shortcuts || Object.create(null);
		var value;
		this.shortcuts = Object.create(null);
		for (var name in shortcuts) {
			value = shortcuts[name] || "";
			if (value) {
				value = value.split(/\s+/);
				this.shortcuts[name] = {
					key: value[1], 
					modifiers: value[0]
				};
			}
		}
	},
	
	_loadRecentRepositories: function() {
		this.recentRepositories = localStorage.recentRepositories ? JSON.parse(localStorage.recentRepositories) : [];
	},
	
	enableRepoMenu: function(enabled) {
		this.items['repositoryClose'].enabled = enabled;
		this.items['repositoryExplore'].enabled = enabled;
		this.items['repositoryBrowse'].enabled = enabled;
		this.items['repositoryRefresh'].enabled = enabled;
		this.items['repositorySubmoduleUpdate'].enabled = enabled;
		this.items['repositorySubmoduleUpdateRecursive'].enabled = enabled;
		
		this.items['branchMenu'].enabled = enabled;
		this.items['commitMenu'].enabled = enabled;
		this.items['stashMenu'].enabled = enabled;
		this.items['optionsMenu'].enabled = enabled;
		this.items['toolsMenu'].enabled = enabled;
		
		this.enableMenuItems('branch', enabled);
		this.enableMenuItems('commit', enabled);
		this.enableMenuItems('stash', enabled);
		this.enableMenuItems('options', enabled);
		this.enableMenuItems('tools', enabled);
	},
	
	enableMenuItems: function(name, enabled) {
		this.menus[name].items.forEach(function(item) {
			item.enabled = enabled;
		});
	},
	
	showFileListMenu: function(file, type, x, y, line) {
		var menu = this._createFileMenu(file, type, line);
		menu.popup(x, y);
	},
	
	pushRecentRepository: function(path) {
		var repos = this.recentRepositories;
		var currIndex = repos.indexOf(path);
		if (currIndex > -1) {
			repos.splice(currIndex, 1);
		}
		repos.unshift(path);
		this.recentRepositories = repos.slice(0, 10);
		this._updateRecentRepositoriesMenu();
		localStorage.recentRepositories = JSON.stringify(this.recentRepositories);
	}
};
