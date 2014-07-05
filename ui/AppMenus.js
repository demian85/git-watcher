var AppMenus = {
	
	menus: {},
	items: {},
	
	init: function() {
		this._createMenuBar();
		this._createMenus();
	},
	
	_createMenus: function() {
		this.items['stage'] = new gui.MenuItem({label: 'Stage file', icon: 'icons/stage.png'});
		this.items['unstage'] = new gui.MenuItem({label: 'Unstage file', icon: 'icons/unstage.png'});
		this.items['stageHunk'] = new gui.MenuItem({label: 'Stage hunk', icon: 'icons/stage.png'});
		this.items['unstageHunk'] = new gui.MenuItem({label: 'Unstage hunk', icon: 'icons/unstage.png'});
		this.items['revert'] = new gui.MenuItem({label: 'Revert changes', icon: 'icons/revert.png'});
		this.items['open'] = new gui.MenuItem({label: 'Open file', icon: 'icons/open-file.png'});
		this.items['delete'] = new gui.MenuItem({label: 'Delete file', icon: 'icons/delete.png'});
		this.items['viewHistory'] = new gui.MenuItem({label: 'View file history', icon: 'icons/view-history.png'});
		this.items['blame'] = new gui.MenuItem({label: 'Blame', icon: 'icons/view-history.png'});
		this.menus.filesList = new gui.Menu();
		this.menus.filesList.append(this.items['stage']);
		this.menus.filesList.append(this.items['unstage']);
		this.menus.filesList.append(this.items['revert']);
		this.menus.filesList.append(new gui.MenuItem({type: 'separator'}));
		this.menus.filesList.append(this.items['stageHunk']);
		this.menus.filesList.append(this.items['unstageHunk']);
		this.menus.filesList.append(new gui.MenuItem({type: 'separator'}));
		this.menus.filesList.append(this.items['open']);
		this.menus.filesList.append(this.items['delete']);
		this.menus.filesList.append(new gui.MenuItem({type: 'separator'}));
		this.menus.filesList.append(this.items['viewHistory']);
		this.menus.filesList.append(this.items['blame']);
	},
	
	_createMenuBar: function() {
		// Repository items
		this.items['repositoryOpen'] = new gui.MenuItem({
			label: 'Open...',
			click: chooseRepository
		});
		this.items['repositoryClose'] = new gui.MenuItem({
			label: 'Close',
            enabled: false,
			click: closeRepository
		});
		this.items['repositoryExplore'] = new gui.MenuItem({
			label: 'Explore...',
			click: function() {
				gui.Shell.openItem(currentModulePath);
			}
		});
		this.items['repositoryBrowse'] = new gui.MenuItem({
			label: 'View branch history (gitk)',
			enabled: false,
			click: function() {
				External.openGitk(currentModulePath);
			}
		});
		this.items['repositoryRefresh'] = new gui.MenuItem({
			label: 'Refresh',
			enabled: false,
			click: updateCurrentModuleStatus
		});
		this.items['repositoryQuit'] = new gui.MenuItem({
			label: 'Quit',
			click: function() {
				gui.Window.get().close();
			}
		});
		
		// Branch items
		this.items['branchCheckout'] = new gui.MenuItem({
			label: 'Checkout...',
			click: function() {
				BranchCheckoutDialog();
			}
		});
		this.items['branchCreate'] = new gui.MenuItem({
			label: 'Create...',
			click: function() {
				BranchCreateDialog();
			}
		});
		
		// Stash items
		this.items['stashSave'] = new gui.MenuItem({
			label: 'Save',
			click: function() {
				commander.stashSave(_handleGitResponse);
			}
		});
		this.items['stashPop'] = new gui.MenuItem({
			label: 'Pop',
			click: function() {
				commander.stashPop(_handleGitResponse);
			}
		});
		
		// Options items
		this.items['optionsZoomIn'] = new gui.MenuItem({
			label: 'Zoom In',
			click: function() {
				try {
					var zoom = gui.Window.get().zoomLevel;
					gui.Window.get().zoomLevel = [zoom + 1]; // FIXME: this should not be an array! #node-webkit
				} catch (e) {}
			}
		});
		this.items['optionsZoomOut'] = new gui.MenuItem({
			label: 'Zoom Out',
			click: function() {
				try {
					var zoom = gui.Window.get().zoomLevel;
					gui.Window.get().zoomLevel = [zoom - 1]; // FIXME: this should not be an array! #node-webkit
				} catch (e) {}
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
		this.menus.repository.append(this.items['repositoryRefresh']);
		this.menus.repository.append(new gui.MenuItem({type: 'separator'}));
		this.menus.repository.append(this.items['repositoryExplore']);
		this.menus.repository.append(this.items['repositoryBrowse']);
		this.menus.repository.append(new gui.MenuItem({type: 'separator'}));
		this.menus.repository.append(this.items['repositoryQuit']);
		
		this.menus.branch = new gui.Menu();
		this.menus.branch.append(this.items['branchCheckout']);
		this.menus.branch.append(this.items['branchCreate']);
		
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
		
		this._createToolsMenu();
		
		this.menus.help = new gui.Menu();
		this.menus.help.append(this.items['helpReportBugs']);
		
		this.items['branchMenu'] = new gui.MenuItem({
			label: 'Branch',
			submenu: this.menus.branch
		});
		this.items['stashMenu'] = new gui.MenuItem({
			label: 'Stash',
			submenu: this.menus.stash
		});
		this.items['optionsMenu'] = new gui.MenuItem({
			label: 'Options',
			enabled: false,
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
	
	enableRepoMenu: function(enabled) {
		this.items['repositoryClose'].enabled = enabled;
		this.items['repositoryExplore'].enabled = enabled;
		this.items['repositoryBrowse'].enabled = enabled;
		this.items['repositoryRefresh'].enabled = enabled;
		this.items['branchMenu'].enabled = enabled;
		this.items['stashMenu'].enabled = enabled;
		this.items['optionsMenu'].enabled = enabled;
		this.items['toolsMenu'].enabled = enabled;
	},
	
	showFileListMenu: function(file, type, x, y, line) {
		var isUnstagedNew = type === 'unstaged' && file.unstaged && file.status === 'new';
		var isDeleted = file.status === 'deleted';
		var isSubmodule = file.type === 'submodule';
		
		this.items['revert'].enabled = file.status !== 'new' && !isSubmodule;
		this.items['revert'].click = function() {
			commander.revertFile(file, _handleGitResponse);
		};
		this.items['stage'].enabled = type === 'unstaged' && file.unstaged;
		this.items['stage'].click = function() {
			commander.stageFile(file, _handleGitResponse);
		};
		this.items['stageHunk'].enabled = line !== null && type === 'unstaged' && file.unstaged && !isSubmodule && file.status === 'modified';
		this.items['stageHunk'].click = function() {
			commander.stageHunk(file, line, _handleGitResponse);
		};
		this.items['unstage'].enabled = type === 'staged' && file.staged;
		this.items['unstage'].click = function() {
			commander.unstageFile(file, _handleGitResponse);
		};
		this.items['unstageHunk'].enabled = line !== null && type === 'staged' && file.staged && !isSubmodule && file.status === 'modified';
		this.items['unstageHunk'].click = function() {
			commander.unstageHunk(file, line, _handleGitResponse);
		};
		this.items['open'].enabled = file.status !== 'deleted';
		this.items['open'].click = function() {
			External.openFile(file);
		};
		this.items['delete'].enabled = type === 'unstaged' && file.unstaged && !isDeleted;
		this.items['delete'].click = function() {
			commander.removeFileFromDisk(file, _handleGitResponse);
		};
		this.items['viewHistory'].enabled = !isSubmodule && !isDeleted && !isUnstagedNew;
		this.items['viewHistory'].click = function() {
			External.openGitk(currentModulePath, file);
		};
		this.items['blame'].enabled = !isSubmodule && !isDeleted && !isUnstagedNew;
		this.items['blame'].click = function() {
			External.openGitBlame(currentModulePath, file);
		};
		
		this.menus.filesList.popup(x, y);
	}
};
