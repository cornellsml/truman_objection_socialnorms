const Actor = require('../models/Actor.js');
const Script = require('../models/Script.js');
const User = require('../models/User');

/**
 * GET /actors
 * If the current user is an admin, retrieve all the actors from the database and render them to the page '../views/actors'.
 * If the current user is not an admin, redirect the user to the home page. 
 */
exports.getActors = async(req, res) => {
    try {
        const actors = await Actor.find().exec();
        return res.send({ usernames: actors.map(a => a.username) });
    } catch (err) {
        next(err);
    }
};