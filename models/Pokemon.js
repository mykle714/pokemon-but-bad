var mongoose = require('mongoose');

var pokemonSchema = new mongoose.Schema({
    name: String,
    height: Number,
    moves: [String],
    sprite: String,
    stats: [Number],
    types: [String]
});

var Pokemon = mongoose.model('Pokemon', pokemonSchema);

module.exports = Pokemon;