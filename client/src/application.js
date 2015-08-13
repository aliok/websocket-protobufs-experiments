$(function () {
    "use strict";

    var content = $('#content');
    var connection = null;

    //TODO: convert to async
    var protocol = dcodeIO.ProtoBuf.loadProtoFile("./protocol.proto");

    //TODO: is it necessary to build everything one by one?
    var CommandAuthorization = protocol.build("tr.com.aliok.wpeb.protocol.CommandAuthorization");
    var CommandRequest = protocol.build("tr.com.aliok.wpeb.protocol.CommandRequest");
    var ActionType = protocol.build("tr.com.aliok.wpeb.protocol.ActionType");
    var UserJoinAction = protocol.build("tr.com.aliok.wpeb.protocol.UserJoinAction");
    var UserLeaveAction = protocol.build("tr.com.aliok.wpeb.protocol.UserLeaveAction");
    var OrderPizzaAction = protocol.build("tr.com.aliok.wpeb.protocol.OrderPizzaAction");
    var PlayVideoGameAction = protocol.build("tr.com.aliok.wpeb.protocol.PlayVideoGameAction");
    var DrinkTeaAction = protocol.build("tr.com.aliok.wpeb.protocol.DrinkTeaAction");

    connection = new WebSocket("ws://" + window.location.hostname + ":8080/backend");
    connection.binaryType = 'arraybuffer';

    $(document).ready(function () {
        $('#orderPizza').click(function () {
            var commandRequest = new CommandRequest();
            commandRequest.setActionType(ActionType.ORDER_PIZZA);

            var orderPizzaAction = new OrderPizzaAction();
            orderPizzaAction.setPizzaName(['Vegetariana', 'Margherita', 'Funghi'][Math.floor(Math.random() * 3)]);
            orderPizzaAction.setCount(Math.floor(Math.random() * 10) + 1);

            commandRequest.setOrderPizzaAction(orderPizzaAction);

            sendMessage(commandRequest);
        });

        $('#playVideoGame').click(function () {
            var commandRequest = new CommandRequest();
            commandRequest.setActionType(ActionType.PLAY_VIDEO_GAME);

            var playVideoGameAction = new PlayVideoGameAction();
            playVideoGameAction.setVideoGameName(['WOW', 'AOE II: AOK', 'Candy Crap'][Math.floor(Math.random() * 3)]);
            playVideoGameAction.setPlayers(Math.floor(Math.random() * 10) + 1);

            commandRequest.setPlayVideoGameAction(playVideoGameAction);

            sendMessage(commandRequest);
        });

        $('#drinkTea').click(function () {
            var commandRequest = new CommandRequest();
            commandRequest.setActionType(ActionType.DRINK_TEA);

            var drinkTeaAction = new DrinkTeaAction();
            drinkTeaAction.setRegion(['Turkish Black Sea', 'India', 'Africa'][Math.floor(Math.random() * 3)]);
            drinkTeaAction.setTemperature(Math.floor(Math.random() * 80) + 1);

            commandRequest.setDrinkTeaAction(drinkTeaAction);

            sendMessage(commandRequest);
        });
    });

    connection.onopen = function (event) {
        content.html($('<p>', {text: 'Websocket connected'}));
    };

    connection.onmessage = function (event) {
        var data = event.data;

        var dataAsArray = new Uint8Array(data);

        console.log("Received data. Binary and text representations are: ", dataAsArray, String.fromCharCode.apply(null, dataAsArray));

        handleMessage(data);

        //var date = typeof(json.time) == 'string' ? parseInt(json.time) : json.time;
        //addMessage(json.author, json.message, me ? 'blue' : 'black', new Date(date));
    };

    connection.onclose = function (event) {
        content.html($('<p>', {
            text: 'Connection closed'
        }));
    };

    connection.onerror = function (event) {
        content.html($('<p>', {
            text: 'Sorry, but there\'s some problem with your '
            + 'socket or the server is down'
        }));
    };

    var sendMessage = function (commandRequest) {
        if (connection.readyState === WebSocket.OPEN) {
            connection.send(commandRequest.toArrayBuffer());
        }
        else {
            console.log('Connection closing, closed or not yet ready!')
        }
    };

    function handleMessage(data) {
        var commandAuthorization = CommandAuthorization.decode(data);

        var user = commandAuthorization.userName;
        var timeMsec = commandAuthorization.time;
        var date = new Date(timeMsec);

        switch (commandAuthorization.actionType) {
            case ActionType.USER_JOIN:
            {
                var userCount = commandAuthorization.userJoinAction.userCount;
                addMessage(user, "Joined... Logged in users:" + userCount, "green", date);
                break;
            }
            case ActionType.USER_LEAVE:
            {
                var userCount = commandAuthorization.userLeaveAction.userCount;
                addMessage(user, "Left... Logged in users: " + userCount, "red", date);
                break;
            }
            case ActionType.ORDER_PIZZA:
            {
                var pizzaName = commandAuthorization.orderPizzaAction.pizzaName;
                var count = commandAuthorization.orderPizzaAction.count;
                addMessage(user, "Ordered " + count + " " + pizzaName + " pizza(s).", "blue", date);
                break;
            }
            case ActionType.PLAY_VIDEO_GAME:
            {
                var videoGameName = commandAuthorization.playVideoGameAction.videoGameName;
                var players = commandAuthorization.playVideoGameAction.players;
                addMessage(user, "Playing " + videoGameName + " with " + players + " player(s).", "blue", date);
                break;
            }
            case ActionType.DRINK_TEA:
            {
                var region = commandAuthorization.drinkTeaAction.region;
                var temperature = commandAuthorization.drinkTeaAction.temperature;
                addMessage(user, "Drinking tea from " + region + " at " + temperature + " degree(s) Celcius.", "blue", date);
                break;
            }
            default:
            {
                addMessage(user, "Unknown action with type " + commandAuthorization.actionType + ".");
            }
        }
    }

    function addMessage(author, message, color, datetime) {
        content.append('<p><span style="text-decoration: underline; color:' + color + '">' + author + '</span> @ ' + datetime + ': ' + "<br/>" + message + '</p>');
    }
});

