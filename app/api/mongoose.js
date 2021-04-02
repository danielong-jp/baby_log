const mongoose = require("mongoose");

mongoose.connect(uris.MONGO_USERDB, {
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    useCreateIndex: true
});

module.exports = mongoose;