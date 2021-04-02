const mongoose = require("./api/mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");


const entrySchema = new mongoose.Schema({

    date: Date,
    details: {
        time: {
            hour: Number,
            min: Number
        },
        feeding: {
            left: Number,
            right: Number,
            bottle: Number
        },
        diaper: Number,
        sleep: Boolean,
        notes: String
    }
});

const babySchema = new mongoose.Schema({
    name: String,
    entry: [entrySchema]
});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    baby: [babySchema]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

module.exports = userSchema;