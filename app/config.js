require = {
	paths: {
		'jquery': 'lib/jquery',
		'jquery.csv': 'lib/jquery.csv',
		'underscore': 'lib/underscore',
		'director': 'lib/director',
		'date.format': 'lib/date.format',
		'bootstrap': 'lib/bootstrap',
		'text': 'lib/text'
	},
	shim: {
		'jquery': { exports: '$' },
		'jquery.csv': { deps: ['jquery'] },
		'underscore': { exports: '_' },
		'director': { exports: 'Router' },
		'date.format': { exports: 'Date' },
		'bootstrap': { deps: ['jquery'] }
	}
};