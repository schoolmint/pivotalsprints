define(function(require) {
    'use strict';
    var tmpl = require('text!templates/report.html');

    function calculateDone(data) {
    	var total = 0;
    	var complete = 0;
    	var team = {};
    	for (var i=0; i<data.length; i++) {
    		var estimate = 1*(data[i]['estimate'] || 0);
    		var done = 1*(data[i]['done'] || 0);
    		var owner = data[i]['owner'] || 'Unassigned';
    		team[owner] = team[owner] || {total: 0, done: 0, count:0};

    		total += estimate;
    		complete += estimate*done/100;

    		team[owner].total += estimate;
    		team[owner].done += estimate*done/100;
    		team[owner].count++;
    	}
    	return {status: Math.ceil(complete*100/total), team: team};
    }

    var self = {
    	render: function(data) {
    		console.log('redner', data);
    		$('#report').html(_.template(tmpl)(calculateDone(data)));
    	}
    }

    return self;

});