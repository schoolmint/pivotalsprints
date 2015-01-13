define(function(require){
	var pivotal = require('pivotal');

	var routes = {
		'': function() {
			pivotal.index();
		},
		'token': function() {
			pivotal.token();
		}
	};

	function apply(path) {
		var m;
		for (var pattern in routes) {
			var regex = new RegExp(pattern, "i");
			if (m = path.match(regex)) {
				m.shift();
				routes[pattern].apply(pivotal, m);
			}
		}
	}

	function change() {
		var path = location.hash.slice(1).replace(/(^\/|\/$)/g,"");
		apply(path);
	}

	window.addEventListener("hashchange", change, false);

	pivotal.init();
	change();

});