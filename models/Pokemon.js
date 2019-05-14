var mongoose = require('mongoose');

var pokemonSchema = new mongoose.Schema({
    name: String,
    height: Number,
    moves: [String],
    url: String,
    stats: [Number],
    types: [String],
    flags: {type: Map, of: Boolean}
});

var Pokemon = mongoose.model('Pokemon', pokemonSchema);

module.exports = Pokemon;
