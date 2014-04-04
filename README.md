# LogHub client for Node.js

To learn about LogHub, visit [LogHub repository](https://github.com/dbratus/loghub).

## Getting the client

```
npm install loghub
```

## Using the client

Writing logs.

```js
var http = require('http'),
	loghub = require('loghub');

//Connecting to log at localhost:10001.
var log = loghub.connect(10001);

var srv = http.createServer(function (req, resp) {
	//Writing log entry:
	//Severity = 1, (valid values are between 0 and 255 inclusively)
	//Source = 'HTTP',
	//Message = 'Got request.'.
	log.write(1, 'HTTP', 'Got request.');

	resp.write('OK');
	resp.end();
});

srv.listen(8080);
```

Reading logs.

```js
var http = require('http'),
	loghub = require('./loghub');

//Connecting to hub at localhost:10000.
var hub = loghub.connect(10000, 'localhost');

var srv = http.createServer(function (req, resp) {
	var now = dateToTimestamp(new Date());

	//The first two arguments is the range of timestamps. LogHub timestamps
	//are the number nanoseconds since Unix epoch UTC.
	//
	//The second two arguments is the range of severities. This request
	//includes all possible severities.
	//
	//The fifth argument is the array of regexps that the sources of the
	//returned entries must match. If omitted, all sources are included.
	//
	//The last argument is the callback called once per log entry. After the last entry,
	//the callback is called without argument.
	//
	//The entries returned have the following attributes:
	// timestamp
	// severity
	// source
	// message
	hub.read(now - minutes(1), now, 0, 255, ['Source1', 'Source2'], function (ent) {
		if (ent) {
			resp.write(ent.timestamp + ' ' + ent.severity + ' ' + ent.source + ' ' + ent.message + '\n');
		} else {
			resp.end();
		}
	});
});

srv.listen(8080);

function dateToTimestamp(date) {
	return date.valueOf() * 1000 * 1000;
}

function minutes(val) {
	return val * 60 * 1000 * 1000 * 1000;
}
```

Truncating logs.

```js
var http = require('http'),
	loghub = require('./loghub');

//Connecting to hub at localhost:10000.
var hub = loghub.connect(10000, 'localhost');

//The first argument is the limit (timestamp) by which the logs are to be truncated.
//
//The second argument is a regexp that the truncated source
//must match. If omitted, all sources are truncated.
hub.truncate(dateToTimestamp(new Date()), 'Source1');
```

Getting log stats.

```js
var http = require('http'),
	loghub = require('./loghub');

var hub = loghub.connect(10000, 'localhost');

var srv = http.createServer(function (req, resp) {
	//The callback is called once per log. After the last entry,
	//the callback is called without argument.
	//
	//The log infos returned have the following attributes:
	// address - the address and port of the log in form 'hostname:port'.
	// size - the current size of the log in bytes.
	// limit - the limit set on the size of the log in bytes.
	hub.stat(function (stat) {
		if (stat) {
			resp.write(stat.address + ': ' + stat.size + '/' + stat.limit + '\n');
		} else {
			resp.end();
		}
	});
});

srv.listen(8080);
```
