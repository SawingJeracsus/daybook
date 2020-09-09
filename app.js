const express = require('express')
const config = require('config')
const mongoose = require('mongoose')
const Lesson = require('./models/Lesson')
const Homework = require('./models/Homework')
const { text } = require('express')

const PORT = config.get('port')

const app = express()
console.log('server starting...')

const start = async () => {
    try {
        await mongoose.connect(
            config.get('mongoUri'),
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useCreateIndex: true
            }
        )
        
        const { Telegraf } = require('telegraf')


        const appState = {
            listenOf: null
        }
        const LESON = "LESON"
        const CONFIRM_LESSON = "CONFIRM_LESSON"
        const OK = "OK"
        const LESSON_HW = "LESSON_HW"
        const HW = "HW"
        const CONFIRM_HW = "CONFIRM_HW"
        const LESSON_DONE = "LESSON_DONE"
        const HW_DONE = "HW_DONE"
        const CONFIRM_HW_DONE = "CONFIRM_HW_DONE"


        const bot = new Telegraf(config.get('token'))
        bot.start((ctx) => ctx.reply('Welcome!'))
        bot.help((ctx) => ctx.reply('Send me a sticker'))

        bot.command('addlesson', ({ reply }) => {
            reply('Ок, тоді напиши що це за урок!')
            appState.listenOf = LESON
        })
        bot.command('lessons', async ( { reply, message } ) => {
            reply('Шукаю...')
            const lessons = await Lesson.find({ owner: message.from.id })
            reply(lessons.map( (lesson, i) => {
                return (i+1)+" "+lesson.lesson
            } ).join('\n'))
            
        })
        bot.command('addhw', async ctx => {
            const lessonsMenu = await getLessonsMenu(ctx.message.from.id)
            ctx.reply("Ок тоді оберіть урок: ", lessonsMenu)

            appState.listenOf = LESSON_HW
        })
        bot.command('hw', async ctx => {
            const hw = await Homework.find({ owner: ctx.message.from.id, is_done: false })
            
            if(hw.length !== 0){
                const lessons = [...new Set(hw.map( hw_item => hw_item.lesson ))]
            const replyData = {}

            lessons.forEach(lesson => {
                hw.forEach( hw_item => {
                    if(hw_item.lesson == lesson){
                        replyData[lesson] ? replyData[lesson].push(hw_item) : replyData[lesson] = [hw_item]
                    }
                } )
            })

            let text = ""
            for( lesson in replyData ){
                const hwList = replyData[lesson].map( hw_item => hw_item.homework ).join(' ; ')
                text += `${lesson}: ${hwList} \n`
            }
            ctx.reply(text)

            }else{
                ctx.reply('Все готово козаче!')
            }
            
        })
        bot.command('done', async ctx => {
            const lessonsMenu = await getLessonsMenu(ctx.message.from.id)
            ctx.reply('Оберіть урок з якого ви заверли завдання', lessonsMenu)
            appState.listenOf = LESSON_DONE
        })

        const confirmMenu = Telegraf.Extra
          .markdown()
          .markup((m) => m.keyboard([
            m.callbackButton(OK),
            m.callbackButton('НІ')
          ]).resize())
          
          
      const getLessonsMenu = async owner => {
        const lessons = await Lesson.find({ owner })

        return Telegraf.Extra
        .markdown()
        .markup((m) => m.keyboard(lessons.map( lesson => {
            return m.callbackButton(lesson.lesson)
        } )).resize())
      }

      const getHomeWorkMenu = async (owner,lesson) => {
        const homework = await Homework.find({ owner, lesson, is_done: false })

        return Telegraf.Extra
        .markdown()
        .markup((m) => m.keyboard(homework.map( hw => {
            return m.callbackButton(hw.homework)
        } )).resize())
      }

        bot.on('text', async (ctx) => {
            switch (appState.listenOf) {
                case LESON:
                    ctx.reply("Ви впевнені що хочете добавити урок: "+ctx.message.text+"?")
                    ctx.reply('Підтвердіть дію', confirmMenu)
                    appState.listenOf = CONFIRM_LESSON
                    appState.lastLesson = ctx.message.text
                break;
                case CONFIRM_LESSON:
                    if(ctx.message.text == OK){
                        const lesson = new Lesson({
                            lesson: appState.lastLesson,
                            owner: ctx.message.from.id
                        })
                        try {
                            await lesson.save()
                        } catch (e) {
                            console.log(e)
                            ctx.reply("Не вдалось зберегти урок в базу даних, перевірте правильність написання")
                            return
                        }
                        ctx.reply('Урок успішно збережено!')
                        appState.listenOf = null
                    }else{
                        ctx.reply("Ок, відміняю останю дію")
                        appState.listenOf = null
                    }    
                break;
                case LESSON_HW:  
                    appState.lastLessonOfHW = ctx.message.text;
                    ctx.reply("Ок, тепер напишіть саме завдання!")
                    appState.listenOf = HW 
                break;
                case HW:
                    ctx.reply('Підтвердіть дію', confirmMenu)
                    appState.listenOf = CONFIRM_HW
                    appState.lastHW = ctx.message.text  
                break;
                case CONFIRM_HW:
                    if(ctx.message.text == OK){
                        const howework = Homework({
                            lesson: appState.lastLessonOfHW,
                            homework: appState.lastHW,
                            owner: ctx.message.from.id
                        })  
                        try {
                            await howework.save()
                        } catch (e) {
                            console.log(e)
                            ctx.reply("Не вдалось зберегти завдання в базу даних, перевірте правильність написання")
                            return
                        }
                        ctx.reply('Завдання збережено!')
                        appState.listenOf = null
                    }else{
                        ctx.reply("Ок, відміняю останю дію")
                        appState.listenOf = null
                    } 
                break;
                case LESSON_DONE:
                    appState.lastLessonOfDone = ctx.message.text
                    const homeworkMenu = await getHomeWorkMenu(ctx.message.from.id, ctx.message.text)
                    ctx.reply("Оберіть домашнє завдання", homeworkMenu)
                    appState.listenOf = HW_DONE
                break;
                case HW_DONE:
                    appState.homeworkOfDone = ctx.message.text
                    ctx.reply('Підтвердіть дію', confirmMenu)
                    appState.listenOf = CONFIRM_HW_DONE  
                break;
                case CONFIRM_HW_DONE:
                    if(ctx.message.text == OK){
                        const homework = await Homework.findOne({
                            lesson: appState.lastLessonOfDone,
                            homework: appState.homeworkOfDone,
                            owner: ctx.message.from.id
                        })  
                        homework.is_done = true
                        try {
                            await homework.save()
                        } catch (e) {
                            console.log(e)
                            ctx.reply("Не вдалось оновити завдання в базі даних, перевірте правильність написання")
                            return
                        }
                        ctx.reply('Завдання оновлено!')
                        appState.listenOf = null
                    }else{
                        ctx.reply("Ок, відміняю останю дію")
                        appState.listenOf = null
                    } 
                break;
                default:
                    ctx.reply("Я зараз чекаю команд!")
                    break;
            } 
          })
        bot.launch()
    

        app.listen(PORT, () => console.log(`App has runing at ${PORT} port!`))

    } catch (e) {
        console.error('Server error', e.message);
        process.exit(1)
    }
}

start()