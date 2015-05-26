define(function(require) {
    'use strict';

    require('lib');

    var tmplOverview = require('text!templates/start.html');
    var tmplLoading = require('text!templates/loading.html');
    var tmplHeader = require('text!templates/header.html');
    var tmplSelect = require('text!templates/projectSelect.html');
    var tmplToken = require('text!templates/getToken.html');
    var tmplComplete = require('text!templates/complete.html');
    var report = require('report');


	var _token = null;
	var project_id = null;
    var project_name = "";
    var search_str = false;
	var stories = [];
	var columns = [];
	var token = null;
    var epics = null;
    var members;

    function request( url, options ) {
        
        var params = {
                data        : "",
                headers     : {},
                type        : "POST",
                contentType : "application/x-www-form-urlencoded",
                processData : true,
                dataType    : 'json'
            };

        $.extend(params, options);

        url = "https://www.pivotaltracker.com/services/v5" + url;

        params.headers["Content-Type"] = params.contentType;
        params.headers["X-TrackerToken"] = token;

        return $.ajax(url, params);
    }

    function getProject() {
    	return $('#project').val()
    }

    function loadProjects () {

		request("/projects", {
			type: "GET"
		}).done(function( result ) {
			var tmplProject = _.template(tmplSelect);
			$('#main').html(tmplProject({project: result}));
			loading.hide();
		}).fail(function( status, e ) {
			window.localStorage.removeItem('pivotal-api-token');
			token = null;
			getToken('Unable to connect. Token seems invalid');
	    });
    }

    function loadMembersAndEpics() {

        $.when(
            request("/projects/" + project_id + "/memberships", { type: "GET" }),
            request("/projects/" + project_id + "/epics", { type: "GET" })
        ).then(function(result1, result2){
            
            members = _.indexBy(_.map(result1[0], function(m) { 
                return m.person 
            }), 'id');
            
            epics = _.indexBy(_.map(result2[0], function(e) {
                return {
                    name: e.name, 
                    label: e.label.name, 
                    label_id: e.label.id,
                    id: e.id,
                    url: e.url
                }; 
            }), 'label_id');

            loadStories();
        });
    }

    function getName(id) {
    	if (members[id]) return members[id].name;
    	else return id;
    }

    function checkColumns(story) {
    	var record = _.keys(story);
    	var diff = _.difference(record, columns);
    	for (var i=0; i<diff.length; i++) columns.push(diff[i]);
    }

    function flattenStories(result) {
    	var match;
    	for (var i=0; i<result.length; i++) {

            // Set Epic Name
            var epic_name = '';
            var label_ids = _.pluck(result[i].labels, 'id');
            for (var p = 0; p < label_ids.length; p++) {
                if (epics.hasOwnProperty(label_ids[p])) {
                    epic_name = epics[label_ids[p]].name.replace(/[",]/g,' ');
                }
            }
            result[i].epic = epic_name;

    		var labels = _.pluck(result[i].labels, 'name');

            // release-.. and sprint-.. are special labels, used to mark the associated sprint
    		for (var k=0; k<labels.length; k++) {
    			if (match = labels[k].match(/^(release|sprint)[- ]?([^\s-]+)/i)) {
    				result[i][match[1].toLowerCase()] = match[2];
    			}
    		}

            // Add labels, appended by space
    		result[i].labels = labels.join(' ');

            // Convert member ids to member names
    		if (result[i]['owned_by_id']) result[i]['owner'] = getName(result[i]['owned_by_id']);
    		result[i]['owners'] = _.map(result[i]['owner_ids'], function(id) { return getName(id); }).join(',');
    		result[i]['requested_by'] = getName(result[i]['requested_by_id']);
    		delete result[i]['owner_ids'];

            result[i]['done'] = '';

            // Extract data from description - custom field hack
    		var description = result[i].description || '';
    		var lines = description.split(/[\n\r]+/);
    		for (var k=0; k < lines.length; k++) {
    			var matches = lines[k].match(/^\^(.+)[\:=](.+)$/);
    			if (matches) {
    				result[i][matches[1].trim().toLowerCase()] = matches[2].trim();
    			}
    		}

            // Treat done as special
            if (_.indexOf(['accepted', 'delivered', 'finished'], result[i].current_state) >= 0) result[i]['done'] = '100';
            if (_.indexOf(['unscheduled', 'unstarted'], result[i].current_state) >= 0) result[i]['done'] = '0';
            result[i]['done'] = result[i]['done'].replace(/[^0-9]/g,'');

            // Clean up name
    		result[i]['name'] = result[i]['name'].replace(/[",]/g,' ');

            // Add week and month of accepted
    		if (result[i]['accepted_at']) {
    			var d = new Date(result[i]['accepted_at']);
    			result[i]['month'] = d.format('Y-m');
    			var week = d.format('W');
    			if (week < 10) week = '0' + week;
    			result[i]['week'] = d.format('Y-') + week;
    		}

            // Remove unwanted columns
    		delete result[i]['requested_by_id'];
    		delete result[i]['description'];
    		delete result[i]['owned_by_id'];

            // make a log of all the columns
    		checkColumns(result[i]);
    	}
    }

    function download (strData, strFileName) {
        var D = document,
            a = D.createElement("a");

        var blob = new Blob([strData], { type: 'text/csv' }); //new way
        var csvUrl = URL.createObjectURL(blob);
        a.setAttribute('download', strFileName);
        a.href = csvUrl;
        a.innerHTML = "Export to CSV";
        D.body.appendChild(a);
        setTimeout(function() {
            a.click();
            D.body.removeChild(a);
        }, 66);
        return true;
    }

    function normalize() {
    	for (var i=0; i<stories.length; i++) {
	    	var diff = _.difference(_.keys(stories[i]), columns);
	    	for (var k=0; k<diff.length; k++) stories[i][diff[k]] = '';
    	}
    }

    var loading = {
    	show: function(msg) {
            if (_.isUndefined(msg)) msg = null;
            if ($('#loading').length) {
                $('#loading-msg').html(msg + '...');
            } else {
                $('body').prepend(_.template(tmplLoading)({message: msg}));
            }
    	},
    	hide: function() {
    		$('#loading').remove();
    	}
    };


    function loadStories() {

    	var def = $.Deferred();
    	var promise = def.promise();
    	var stack = [];
    	var that = this;

    	function getStories(offset) {
    		loading.show('fetching stories - ' + offset);
	    	request("/projects/" + project_id + "/stories", {
	    		type: "GET",
	    		data: {
	    			offset: offset
	    		}
	    	}).done(function(result) {
	    		flattenStories(result);
	    		stack = stack.concat(result);
	    		if (result.length == 100) getStories(offset + 100);
	    		else {
	    			stories = stack;
	    			def.resolve();
	    		}
	    	});
    	}

        function getSearch() {
            loading.show('fetching stories - ' + search_str);
            request("/projects/" + project_id + "/search", {
                type: "GET",
                data: {
                    project_id: project_id,
                    query: search_str
                }
            }).done(function(result) {
                result = result.stories.stories;
                flattenStories(result);
                stories = result;
                def.resolve();
            });
        }
        if (search_str) getSearch();
        else getStories(0);
    	promise.done(function(){
    		normalize();
    		window.stories = stories;
            //download($.csv.fromObjects(stories, {sortOrder: 'alpha'}), project_name + '.csv');  
            loading.hide(); 
            report.render(stories);
            $('#btn-generate-report').removeClass('disabled');
    	});
    }


    function fetchProject() {
		loadMembersAndEpics();
    }

    function saveToken() {
    	token = $('#input-token').val();
    	window.localStorage.setItem('pivotal-api-token', token);
    	$('#clear-token').removeClass('hide');
        loading.show('finding projects');
    	$('#main').html('');
    	loadProjects();
    }

    function clearToken() {
    	window.localStorage.removeItem('pivotal-api-token');
    	$('#clear-token').addClass('hide');
        location.href = '#/'
    }

    function getToken(msg) {
    	if ($.type(msg) != "string") msg = false;
    	var _token = window.localStorage.getItem('pivotal-api-token');
    	if (!_token) {
    		loading.hide();
		    var tmpl = _.template(tmplToken);
			$('#main').html(tmpl({message: msg}));    		
    	} else {
    		token = _token;
	    	$('#clear-token').removeClass('hide');
            loading.show();
    		loadProjects();
    	}
    }

    function bind() {
		$('#main').on('click', '#save-token', saveToken);
		$('#main').on('click', '#btn-restart', getToken); 
		$('#main').on('click', '#btn-generate-report', function(){
			project_id = $('#input-project').val();
			project_name = $("#input-project option[value='" + project_id + "']").text();
            search_str = $("#search-str").val();
            if (search_str == "") search_str = false;
			if (project_id > 1) {
				$('#btn-generate-report').addClass('disabled');
				fetchProject();
			}
		})
		$('#clear-token').on('click', clearToken);
    }

    function getStarted() {
    	$('#main').html(tmplOverview);
    }

	var self = {
        init: function() {
            $('#header').html(tmplHeader);
            bind();
       },
	    index: function() {
	    	getStarted();
	    },
        token: function() {
            loading.show();
            getToken();
        }		
	};
	return self;
});

