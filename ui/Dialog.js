var Dialog = (function() {
	var instance;
	function Dialog() {
		var node = document.importNode($('#dialogTpl').content, true).querySelector('#dialog');
		document.body.appendChild(node);
		window.getComputedStyle(node).cssText; // hack to trigger layout and make transitions work
		document.addEventListener('keydown', function(e) {
			if (e.keyCode === 27) instance.close();
		});
		$('#dialogCloseBtn').addEventListener('click', function(e) {
			instance.close();
		});
	}
	Dialog.prototype = {
		open: function(title, contentNode) {
			$('#dialogTitle').textContent = title;
			$('#dialogMain').innerHTML = '';
			if (contentNode) {
				$('#dialogMain').appendChild(contentNode);
			} else {
				$('#dialog').classList.add('empty');
			}
			$('#dialogOutput').textContent = '';
			$('#dialog').classList.add('visible');
		},
		clearOutput: function() {
			$('#dialogOutput').textContent = '';
		},
		writeOutput: function(str) {
			str = str.trim();
			if (str) $('#dialogOutput').textContent += str + '\n';
			$('#dialogOutput').scrollTop = $('#dialogOutput').scrollHeight;
		},
		close: function() {
			$('#dialogTitle').textContent = '';
			$('#dialogOutput').textContent = '';
			$('#dialog').classList.remove('visible', 'empty');
		}
	};
	return function() {
		if (!instance) instance = new Dialog();
		return instance;
	};
})();



var BranchCheckoutDialog = (function() {
	function doCheckout(branchName) {
		Git.checkoutBranch(currentModulePath, branchName, gitErrHandler.intercept(function(output) {
			Dialog().writeOutput(output);
		}));
	}
	function selectRow() {
		var row = this, items = $$('.branchList tbody > tr');
		items.forEach(function(item) {
			if (row === item) item.classList.add('selected');
			else item.classList.remove('selected');
		});
	}
	return function() {
		Git.getLocalBranches(currentModulePath, gitErrHandler.intercept(function(branches) {
			var node = document.importNode($('#branchCheckoutTpl').content, true).querySelector('.branchCheckout');
			Dialog().open('Checkout branch', node);
			var branchListNode = $('.branchList tbody');
			branches.forEach(function(branch) {
				var row = document.importNode($('#branchCheckoutItemTpl').content, true).querySelector('tr');
				row.addEventListener('click', selectRow);
				row.dataset.branchName = branch.name;
				row.dataset.upstreamBranch = branch.upstream;
				var commitContents = [
					'<strong>Commit</strong> ' + branch.lastCommit.objectName,
					'<em>' + branch.lastCommit.date + '</em>',
					'by <em>' + branch.lastCommit.authorName + ' &lt;' + branch.lastCommit.authorEmail + '&gt;</em>',
					branch.lastCommit.subject
				];
				$('.branchCheckoutItemName', row).textContent = branch.name;
				$('.branchCheckoutItemUpstream', row).textContent = branch.upstream;
				$('.branchCheckoutItemCommit', row).innerHTML = commitContents.join('\n');
				branchListNode.appendChild(row);
			});
			$('.branchCheckoutAccept').addEventListener('click', function() {
				var selectedBranch = $('.branchList tr.selected');
				if (!selectedBranch) return;
				var branchName = selectedBranch.dataset.branchName;
				var upstream = selectedBranch.dataset.upstreamBranch || '';
				var doFetch = $('.branchCheckoutFetchOption').checked && upstream;
				if (doFetch) {
					Git.fetch(currentModulePath, upstream.split('/')[0], upstream.split('/')[1], gitErrHandler.intercept(function(output) {
						Dialog().writeOutput(output);
						doCheckout(branchName);
					}));
				} else {
					doCheckout(branchName);
				}
			});
			$('.branchCheckoutCancel').addEventListener('click', function() {
				Dialog().close();
			});
		}));
	};
})();



var BranchCreateDialog = (function() {
	return function() {
		var node = document.importNode($('#branchCreateTpl').content, true).querySelector('.branchCreate');
		Dialog().open('Create branch', node);
		$('.branchCreateAccept').addEventListener('click', function() {
			var branchName = $('.branchCreateName').value.trim();
			var doCheckout = $('.branchCreateCheckoutOption').checked;
			Git.createBranch(currentModulePath, branchName, doCheckout, gitErrHandler.intercept(function(output) {
				Dialog().writeOutput(output);
				$('.branchCreateName').value = '';
			}));
		});
		$('.branchCreateCancel').addEventListener('click', function() {
			Dialog().close();
		});
	};
})();
