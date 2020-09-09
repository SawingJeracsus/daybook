const { Schema, model, Types } = require ('mongoose')

const shema = new Schema({
    code: {
        type: Number,
        required: true,
        unique: true
    },
    users: {
        type: Array,
        required: true
    },
    owner: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        unique: true,
        required: true
    }
})

module.exports = model('Group', shema )
