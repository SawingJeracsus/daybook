const { Schema, model, Types } = require ('mongoose')

const shema = new Schema({
    lessons: {
        type: Object,
        required: true
    },
    owner: {
        type: Number,
        required: true
    }
})

module.exports = model('TimeTable', shema )
