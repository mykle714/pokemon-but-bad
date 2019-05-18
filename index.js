var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var exphbs = require('express-handlebars');
var Pokemon = require('./models/Pokemon');
var Move = require('./models/Move');
var mongoose = require('mongoose');
var dotenv = require('dotenv');
var request = require('request');


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
	var e=["normal","fighting","flying","poison", "ground","rock","bug","ghost","steel","fire","water","grass","electric","pychic","ice","dragon","dark","fairy"]
	var m = 1
  var x = e.indexOf(atk.toLowerCase())
	for(var i=0; i<mon.length;i++) {
    y = e.indexOf(mon[i])
		m *= s[y][x]
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
  if(players[0]==0 || players[1]==0) {
    return res.redirect('/')
  }
  res.render('battle',{json: JSON.stringify(players),p1:players[0],p2:players[1]});
})

app.get('/queue',function(req,res){
  res.render('queue',{});
})

app.post('/add', function(req, res) {
  if(req.body.numb != "3") {
    Pokemon.find({"name":req.body.name.toLowerCase()},function(err,pokemon){
      if(pokemon.length == 0) {
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
              url: json["sprites"]["front_default"],
              stats: s,
              types: t,
              flags: {}
            })

            if(pokemon["url"] == null) {
              pokemon["flags"]["nullURL"] = true
            } else {
              pokemon["flags"]["nullURL"] = false
            }

            pokemon.save(function(err) {
              if(err) throw err
              res.render('form',{mon: pokemon})
            })
          }
        })
      } else {
        res.render('form',{mon: pokemon[0]})
      }
    })
  } else {
    res.redirect('/')
  }
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
      url: mon["url"]
    }

    function loop(iter, func) {
      if(iter > 0) {
        func(iter-1)
        loop(iter-1, func)
      }
    }

    loop(4, function(i) {
      if(players[numb]["moves"][i] != "") {
        Move.find({"name":players[numb]["moves"][i]},function(err,m){
          if(m.length == 0) {
            request("https://pokeapi.co/api/v2/move/"+players[numb]["moves"][i], function(err, res, body) {
              temp = JSON.parse(body)
              var move = new Move({
                name: temp["name"],
                power: temp["power"],
                accuracy: temp["accuracy"],
                priority: temp["priority"],
                type: temp["type"]["name"],
                class: temp["damage_class"]["name"],
                pp: temp["pp"]
              })
              move.save(function(err) {
                if(err) throw err
                moves[numb][i] = move
              })
            })
          } else {
            moves[numb][i] = m[0]
          }
        })
      }
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

var factor = 0.01

io.on('connection', function(socket) {
  socket.on('action', function(numb, index) {
    var you = numb-1
    var them = 1 - you
    var move = moves[you][index];
    var atk_type = move["type"]
    var m = calc(atk_type, players[them]["types"])
    players[them]["hp"] = players[them]["hp"] - factor*move["power"]*m
    if(players[them]["hp"] > 0) {
      io.emit('action', numb, players[them]["hp"],atk_type);
    } else if(players[them]["hp"] <= 0) {
      io.emit('win', numb);
    } else {
      console.log("index.js - action1")
      console.log(players[them]["hp"])
    }
  });

  socket.on('winbypass', function(numb) {
    io.emit('win', numb)
  })
});

http.listen(process.env.PORT || 3000, function() {
    console.log('Listening!');
});
