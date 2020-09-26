const { Schema, model, Types } = require ('mongoose')

const shema = new Schema({
    homework: {
        type: String,
        required: true
    },
    lesson: {
        type: String,
        required: true
    },
    owner: {
        type: Number,
        required: true
    },
    is_done: {
        type: Boolean,
        default: false
    },
    solutions: {
        type: Object,
        default: {exist: false}
    }
})

module.exports = model('Homework', shema )
