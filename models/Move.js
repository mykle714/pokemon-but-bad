var mongoose = require('mongoose');

var moveSchema = new mongoose.Schema({
    name: String,
    power: Number,
    accuracy: Number,
    priority: Number,
    type: String,
    pp: Number
});

var Move = mongoose.model('Move', moveSchema);
module.exports = Move;
