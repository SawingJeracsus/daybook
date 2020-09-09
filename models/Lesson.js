const { Schema, model, Types } = require ('mongoose')

const shema = new Schema({
    lesson: {
        type: String,
        required: true,
        unique: true
    },
    owner: {
        type: Number,
        required: true
    }
})

module.exports = model('Lesson', shema )
