const PORT = 80;

var http = require('http');
var express = require('express');
var socketio = require('socket.io')
var sqlite3 = require('sqlite3').verbose();
var ip = require('ip');
var app = express();

var server = http.Server(app);
var io = socketio(server);

var webapp_nsp = io.of('/webapp');				//namespace của webapp
var esp8266_nsp = io.of('/esp8266');			//namespace của esp8266

var middleware = require('socketio-wildcard')();		//Để có thể bắt toàn bộ lệnh!
esp8266_nsp.use(middleware);
webapp_nsp.use(middleware);

server.listen(process.env.PORT || PORT);
console.log("Server: " + ip.address() + ":" + PORT)

app.use(express.static("node_modules/mobile-angular-ui"))
app.use(express.static("node_modules/angular"))
app.use(express.static("node_modules/angular-route"))
app.use(express.static("node_modules/socket.io-client"))
app.use(express.static("node_modules/angular-socket-io"))
app.use(express.static("webapp"))

let db = new sqlite3.Database('./db/mydb.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
	if (err) {
		return console.log(err.message);
	}
	db.run(`CREATE TABLE DATALOG (Id INTEGER PRIMARY KEY AUTOINCREMENT, EventName TEXT, EventJson TEXT, Date TEXT)`, (err) => {
		if (err){
			console.log(err.message);
		}
	});
});

function ParseJson(jsondata) {
	try {
		return JSON.parse(jsondata);
	} catch (error) {
		return null;
	}
}

function checkTableExist(tableName){
	var sql = `SELECT * FROM sqlite_master WHERE type = 'table' AND name = '` + tableName + "'";
	var existed = false;
	db.all(sql, (err, row) => {
		if (row.length == 1){
			return true;
		};
	});
};

function insertData(packet){
	var query = `insert into DATALOG(EventName, EventJson, Date) values('${packet.data[0]}','${JSON.stringify(packet.data[1])}', '${new Date()}')`;
	//console.log(query);
	db.run(query, function (err){
		if (err){
			console.log(err.message);
		}
	})
}

function getData(){
	var query = `select * from DATALOG`;
	db.all(query, function (err, row){
		if (err){
			console.log(err.message);
		}
		else {
			row.forEach(element => {
				console.log(element);
			});
		}
	});
};

function closeDb(){
	db.close((err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('Close the database connection.');
	});
}

esp8266_nsp.on('connection', function (socket) {
	console.log('ESP8266: CONNECTED')

	getData();

	socket.on('disconnect', function () {
		console.log("ESP8266: DISCONNECTED")
	})

	var date = new Date();

	var dateData = {
		time: [date.getHours(), date.getMinutes(), date.getSeconds()],
		date: [date.getFullYear(), date.getMonth() + 1, date.getDate()]
	}
	esp8266_nsp.emit("TIME", dateData);

	socket.on("*", function (packet) {
		console.log(`ESP8266: ${packet.data[0]} => ${JSON.stringify(packet.data[1])}`);
		var eventName = packet.data[0]
		var eventJson = packet.data[1] || {}
		insertData(packet);
		webapp_nsp.emit(eventName, eventJson);
	})
})


webapp_nsp.on('connection', function (socket) {

	console.log('WEBAPP: Connected');

	socket.on('disconnect', function () {
		console.log("WEBAPP: Disconnected")
	})

	socket.on('*', function (packet) {
		console.log("WEBAPP: ", packet.data);
		var eventName = packet.data[0];
		var eventJson = packet.data[1] || {}
		esp8266_nsp.emit(eventName, eventJson)
	});
})