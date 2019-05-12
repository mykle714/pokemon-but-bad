var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var exphbs = require('express-handlebars');
var Pokemon = require('./models/Pokemon');
var mongoose = require('mongoose');
var MongoClient = require('mongodb').MongoClient;
var dotenv = require('dotenv');
var request = require('request');
var funcs = require('./funcs.js');


// Load envirorment variables
dotenv.load();

// Connect to MongoDB
console.log(process.env.MONGODB)
mongoose.connect(process.env.MONGODB, {
  poolSize: 100,
  socketOptions: {
    socketTimeoutMS: 6000000
  }
});
mongoose.connection.on('error', function(err) {
    console.log(err);
    console.log('MongoDB Connection Error. Please make sure that MongoDB is running.');
    process.exit(1);
});

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.use('/public', express.static('public'));

//
//

var players = [0,0]
var moves = [ [{},{},{},{}] , [{},{},{},{}] ]

function calc(atk,mon) {
	var s=[[1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
	[1,1,2,1,1,.5,.5,1,1,1,1,1,1,2,1,1,.5,2],
	[1,.5,1,1,0,2,.5,1,1,1,1,.5,2,1,2,1,1,1],
	[1,.5,1,.5,2,1,.5,1,1,1,1,.5,1,2,1,1,1,.5],
	[1,1,1,.5,1,.5,1,1,1,1,2,2,0,1,2,1,1,1],
	[.5,2,.5,.5,2,1,1,1,2,.5,2,2,1,1,1,1,1,1],
	[1,.5,2,1,.5,2,1,1,1,2,1,.5,1,1,1,1,1,1],
	[0,0,1,.5,1,1,.5,2,1,1,1,1,1,1,1,1,2,1],
	[.5,2,.5,0,2,.5,.5,1,.5,2,1,.5,1,.5,.5,.5,1,.5],
	[1,1,1,1,2,2,.5,1,.5,.5,2,.5,1,1,.5,1,1,.5],
	[1,1,1,1,1,1,1,1,.5,.5,.5,2,2,1,.5,1,1,1],
	[1,1,2,2,.5,1,2,1,1,2,.5,.5,.5,1,2,1,1,1],
	[1,1,.5,1,2,1,1,1,.5,1,1,1,.5,1,1,1,1,1],
	[1,.5,1,1,1,1,2,2,1,1,1,1,1,.5,1,1,2,1],
	[1,2,1,1,1,2,1,1,2,2,1,1,1,1,.5,1,1,1],
	[1,1,1,1,1,1,1,1,1,.5,.5,.5,.5,1,2,2,1,2],
	[1,2,1,1,1,1,2,.5,1,1,1,1,1,0,1,1,.5,2],
	[1,.5,1,2,1,1,.5,1,2,1,1,1,1,1,1,0,.5,1]];
	var e=["normal","fighting","flying","poison","ground","rock","bug","ghost","steel","fire","water","grass","electric","pychic","ice","dragon","dark","fairy"]
	var m = 1
	var t = e.indexOf(atk)
	for(var i=0; i<mon.length;i++) {
		m *= s[e.indexOf(mon[i])][t]
	}
	return m
}

app.get('/',function(req,res){
  Pokemon.find({},function(err,pokemon){
    if(err) throw err
    res.render('home', {pokemon: pokemon})
  })
})

app.get('/battle',function(req,res){
  if(players[0]===0 || players[1]===0) {
    return res.redirect('/')
  }
  res.render('battle',{json: JSON.stringify(players),p1:players[0],p2:players[1]});
})

app.get('/queue',function(req,res){
  res.render('queue',{});
})

app.post('/add', function(req, res) {
  request("https://pokeapi.co/api/v2/pokemon/"+req.body.name.toLowerCase(), function(err, res2, body) {
    if(body === "Not Found") {
      res.render('queue', {body: "invalid pokemon"})
    } else {
      var json = JSON.parse(body)
      var i
      var m = []
      var json_m = json["moves"]
      for(i=0; i < json_m.length; i++) {
        m.push(json_m[i]["move"]["name"]);
      }
      var s = []
      var json_s = json["stats"]
      for(i=0; i < json_s.length; i++) {
        s.push(json_s[i]["base_stat"]);
      }
      var t = []
      var json_t = json["types"]
      for(i=0; i < json_t.length; i++) {
        t.push(json_t[i]["type"]["name"])
      }
      var pokemon = new Pokemon({
        name: req.body.name.toLowerCase(),
        height: json["height"],
        moves: m,
        sprite: json["sprites"]["front_default"],
        stats: s,
        types: t
      })
            
      pokemon.save(function(err) {
        if(err) throw err
        res.render('form',{pokemon: pokemon})
      })
    }
  })
});

app.get('/register', function(req, res) {
  Pokemon.find({"name":req.query.name.toLowerCase()},function(err,pokemon){
    if(err) throw err

    var numb = req.query.numb-1

    mon = pokemon[pokemon.length-1]
    
    players[numb] = {
      name: req.query.name,
      moves: [req.query.move1, req.query.move2, req.query.move3, req.query.move4],
      hp: 100,
      height: mon["height"],
      types: mon["types"],
      url: mon["sprite"]
    }

    //benny please forgive us
    request("https://pokeapi.co/api/v2/move/"+players[numb]["moves"][0], function(err, res, body) {
      moves[numb][0] = JSON.parse(body)
      request("https://pokeapi.co/api/v2/move/"+players[numb]["moves"][1], function(err, res, body) {
        moves[numb][1] = JSON.parse(body)
        request("https://pokeapi.co/api/v2/move/"+players[numb]["moves"][2], function(err, res, body) {
          moves[numb][2] = JSON.parse(body)
          request("https://pokeapi.co/api/v2/move/"+players[numb]["moves"][3], function(err, res, body) {
            moves[numb][3] = JSON.parse(body)
          })
        })
      })
    })
    res.redirect('/')
  })
})

app.get('/pokemon', function(req, res) {
  Pokemon.find({},function(err, pokemon){
    if(err) throw err
    res.send(pokemon)
  })
});

var factor = 0.1

io.on('connection', function(socket) {
	socket.on('action1', function(index) {
    var move = moves[1][index];
    var atk_type = move["type"]["name"]
    players[1]["hp"] = players[1]["hp"] - factor*move["power"]*calc(atk_type, players[1]["types"])
    if(players[1]["hp"] > 0) {
      io.emit('action1', players[1]["hp"]);
    } else {
      io.emit('win', 1);
    }
  });
  socket.on('action2', function(index) {
    var move = moves[1][index];
    var atk_type = move["type"]["name"]
    players[0]["hp"] = players[0]["hp"] - factor*move["power"]*calc(atk_type, players[0]["types"])
    if(players[0]["hp"] > 0) {
      io.emit('action2', players[0]["hp"]);
    } else {
      io.emit('win', 2);
    }
  });
});

http.listen(3000, function() {
  console.log('App listening on port 3000!');
})