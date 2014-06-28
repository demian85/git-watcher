var Dialog = (function() {
	var instance;
	function Dialog() {
		var node = document.importNode($('#dialogTpl').content, true).querySelector('#dialog');
		document.body.appendChild(node);
		window.getComputedStyle($('#dialog')).cssText; // hack to trigger layout and make transitions work
		$('#dialogCloseBtn').addEventListener('click', function(e) {
			instance.close();
		});
	}
	Dialog.prototype = {
		open: function(title, childNode) {
			$('#dialogTitle').textContent = title;
			$('#dialogMain').innerHTML = '';
			$('#dialogMain').appendChild(childNode);
			$('#dialogOutput').textContent = '';
			$('#dialog').classList.add('visible');
		},
		writeOutput: function(str) {
			$('#dialogOutput').textContent += str + '\n';
			$('#dialogOutput').scrollTop = $('#dialogOutput').scrollHeight;
		},
		close: function() {
			$('#dialogTitle').textContent = '';
			$('#dialogOutput').textContent = '';
			$('#dialog').classList.remove('visible');
		}
	};
	return function() {
		if (!instance) instance = new Dialog();
		return instance;
	};
})();


var BranchCheckoutDialog = {
	
	open: function() {
		var me = this, dialog = Dialog();
		Git.getLocalBranches(currentModulePath, gitErrHandler.intercept(function(branches) {
			var node = document.importNode($('#branchCheckoutTpl').content, true).querySelector('.branchCheckout');
			var listNode = $('.branchList', node);
			listNode.innerHTML = branches.map(function(branch) {
				return '<option value="' + branch.name + '" data-upstream="' + branch.upstream + '">' + branch.name + '</option>';
			}).join('');
			$('.branchCheckoutAccept', node).addEventListener('click', function() {
				if (listNode.selectedIndex === -1) return;
				var branchName = listNode.value;
				var upstream = listNode.options[listNode.selectedIndex].dataset.upstream || '';
				var doFetch = $('.branchCheckoutFetchOption', node).checked && upstream;
				if (doFetch) {
					Git.fetch(currentModulePath, upstream.split('/')[0], upstream.split('/')[1], gitErrHandler.intercept(function(output) {
						dialog.writeOutput(output);
						me._doCheckout(branchName);
					}));
				} else {
					me._doCheckout(branchName);
				}
			});
			$('.branchCheckoutCancel', node).addEventListener('click', function() {
				dialog.close();
			});
			dialog.open('Checkout branch', node);
		}));
	},
	
	_doCheckout: function(branchName) {
		Git.checkoutBranch(currentModulePath, branchName, gitErrHandler.intercept(function(output) {
			Dialog().writeOutput(output);
		}));
	}
};

var BranchCreateDialog = (function() {
	return function() {
		var node = document.importNode($('#branchCreateTpl').content, true).querySelector('.branchCreate');
		$('.branchCreateAccept', node).addEventListener('click', function() {
			var branchName = $('.branchCreateName', node).value.trim();
			var doCheckout = $('.branchCreateCheckoutOption', node).checked;
			Git.createBranch(currentModulePath, branchName, doCheckout, gitErrHandler.intercept(function(output) {
				Dialog().writeOutput(output);
				$('.branchCreateName', node).value = '';
			}));
		});
		$('.branchCreateCancel', node).addEventListener('click', function() {
			Dialog().close();
		});
		Dialog().open('Create branch', node);
	};
})();
