const { Schema, model, Types } = require ('mongoose')

const shema = new Schema({
    tel_id: {
        type: Number,
        required: true,
        unique: true
    },
    using: {
        type: String,
        default: "__self"
    },
    appState: {
        type: Object,
        default: {
            listenOf: null,
        }
    }
})

module.exports = model('User', shema )
