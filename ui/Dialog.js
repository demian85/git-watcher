var Dialog = (function() {
	var instance;
	function Dialog() {
		var node = document.importNode($('#dialogTpl').content, true).querySelector('#dialog');
		document.body.appendChild(node);
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
			$('#dialogOutput').textContent += str;
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
		Git.getLocalBranches(currentModulePath, gitErrHandler.intercept(function(branches) {
			var dialog = Dialog();
			var node = document.importNode($('#branchCheckoutTpl').content, true).querySelector('.branchCheckout');
			var listNode = $('.branchList', node);
			listNode.addEventListener('dblclick', function(e) {
				Git.checkoutBranch(currentModulePath, listNode.value, gitErrHandler.intercept(function(output) {
					dialog.writeOutput(output);
				}));
			});
			listNode.innerHTML = branches.map(function(branch) {
				return '<option value="' + branch + '">' + branch + '</option>';
			}).join('');
			$('.branchCheckoutAccept', node).addEventListener('click', function() {
				Git.checkoutBranch(currentModulePath, listNode.value, gitErrHandler.intercept(function(output) {
					dialog.writeOutput(output);
				}));
			});
			$('.branchCheckoutCancel', node).addEventListener('click', function() {
				dialog.close();
			});
			dialog.open('Checkout branch', node);
		}));
	}	
};
