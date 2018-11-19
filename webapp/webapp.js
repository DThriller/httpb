angular.module('myApp', ['ngRoute', 'mobile-angular-ui', 'btford.socket-io'])
.config(function($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: 'home.html',
        controller: 'Home'
    });
})
.factory('mySocket', function (socketFactory) {
	var myIoSocket = io.connect('/webapp');

	mySocket = socketFactory({
		ioSocket: myIoSocket
	});
	return mySocket;

})
.controller('Home', function($scope, mySocket) {
    $scope.temp = "";
    $scope.tempF = "";
	$scope.humidity = "";
    $scope.hic = "";
	$scope.leds_status = [0, 0, 0];
	$scope.lamps = [0, 0, 0];
	$scope.lampsLight = [ 50, 70, 80];
	$scope.garage_status = 0;
	$scope.lcd = ["", ""];

	$scope.lcdPrint = function() {
		var json = {
			"line1": $scope.lcd[0],
			"line2": $scope.lcd[1]
		}
		mySocket.emit("LCD", json);
	}

	$scope.lcdClear = function() {
		mySocket.emit("CLEAR");
	}

	$scope.updateSensor  = function() {
		mySocket.emit("DHT")
	}
	
	$scope.updateDateTime = function(){
		var date = new Date();
		var json = {
			time: [date.getHours(), date.getMinutes(), date.getSeconds()],
			date: [date.getFullYear(), date.getMonth() + 1, date.getDate()]
		}
		mySocket.emit("TIME", json);
	}
	
	$scope.changeLED = function() {
		console.log("send LED ", $scope.leds_status)
		
		var json = {
			"led": $scope.leds_status
		}
		mySocket.emit("LED", json)
	}

	$scope.openGarage = function() {
		var json = {
			'garage': $scope.garage_status
		}
		mySocket.emit("GARAGE", json)
	}
	
	mySocket.on('DHT', function(json) {
		$scope.temp = json.temC
		$scope.tempF = json.temF
		$scope.hic = json.hic
		$scope.humidity = json.humidity
	})

	mySocket.on('LED_STATUS', function(json) {
		console.log("recv LED", json)
		$scope.leds_status = json.data
	})
	
	mySocket.on('GARAGE', function(json) {
		console.log('receive GARAGE status', json)
		$scope.garage_status = json.data[0]
	})
	
	mySocket.on('NOTE', function(json) {
		console.log("NOTE", json);
		$scope.lcd = json.data
	})

	mySocket.on('connect', function() {
		console.log("connected")
		mySocket.emit("LOADDATA")
	})
		
});