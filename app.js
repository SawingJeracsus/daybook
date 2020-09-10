const express = require('express')
const config = require('config')
const mongoose = require('mongoose')
const Lesson = require('./models/Lesson')
const Homework = require('./models/Homework')
const Group = require('./models/Group')
const User = require('./models/User')
// const { text } = require('express')

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


        let appState = {
            listenOf: null,
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
        const GROUP_NAME = "GROUP_NAME"
        const GROUP_NAME_CREATE = "GROUP_NAME_CREATE"
        const ADD_TO_GROUP = "ADD_TO_GROUP"
        const CODE_REQUIRE = "CODE_REQUIRE"


        const bot = new Telegraf(config.get('token'))
        bot.use(async (ctx, next) => {
            const id = ctx.message.from.id
            const user = await User.findOne( {tel_id: id} )
            if(user && user.length !== 0){
                if(user.using !== "__self"){
                    ctx.message.from.id = await Group.findOne({ name: user.using })
                    ctx.message.from.id = ctx.message.from.id.code              
                }
            }
            if(user){
                ctx.user = user
                appState = user.appState
            }
            

            await next()
            const user_refreshed = await User.findOne( {tel_id: id} )
            if(user){
                user_refreshed.appState = appState
                await user_refreshed.save()
            }

        })

        bot.start( async (ctx) => {
            ctx.reply('Привіт!\n Я створений для того щоб пам\'ятати твою домашку ЗАМІСТЬ тебе.\n\n Також ти можеш створити групу де всі твої однокласники сможуть користуватися одним списком\n\n ознайомитися з всіма командами ти можеш ввівши /help  ')
            const oldAccoutnt = await User.findOne({ tel_id: ctx.message.from.id })
            if(!oldAccoutnt || oldAccoutnt?.length == 0){
                const user = new User({
                    tel_id: ctx.message.from.id
                })
                user.save()
            }
            
            
        })
        bot.help((ctx) => ctx.reply(`
Мої команди:

Список Завдань:
-addlesson - Добавити урок у свій список
-lessons   - переглянути список твоїх уроків
-addhw     - добавити в список домашнє завдання
-hw        - переглянути список з домашнім завданням
-done      - дозволяє відмітити завдання, як готове


Групи:
-creategroup - дозволяє створити групу
-usegroup    - дозволяє уввійти в групу
-leave       - дозволяє покинути групу
        `))

        bot.command('creategroup', ctx => {
            ctx.reply("Ок, введіть назву...")
            appState.listenOf = GROUP_NAME
        } )
        bot.command("usegroup", async ctx => {
            ctx.reply("Введіть ім'я групи: ")
            appState.listenOf = ADD_TO_GROUP
        })
        bot.command("leave", async ctx => {
            ctx.reply("Ви покидаєте групу "+ctx.user.using)
            ctx.user.using = '__self'
            ctx.user.save()
        })
        bot.hears( 'id', ctx=> {
            ctx.reply(ctx.message.from.id)
            console.log(ctx.message.from.id, appState)
        } )

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
            // console.log(ctx.message.from.id, ctx.user.tel_id);
            
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
                            console.log(e.message)
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
                            console.log(e.message)
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
                            console.log(e. message)
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
                case GROUP_NAME:
                    ctx.reply("Ви впевнені створити групу з такою назвою: " + ctx.message.text, confirmMenu) 
                    appState.groupName = ctx.message.text                   
                    appState.listenOf = GROUP_NAME_CREATE
                break;
                case GROUP_NAME_CREATE:
                    if(ctx.message.text == OK){
                        const code = Math.floor(Math.random() * 10000);

                        const group = new Group({
                            owner: ctx.message.from.id,
                            users: [ctx.message.from.id],
                            code,
                            name: appState.groupName 
                        })
                        group.save()
                        ctx.reply(`Група збережена! Ваш код: ${code} Тепер ви можете уввійти в групу (/usegroup)`)
                        appState.groupCode = code
                        appState.listenOf = null
                    }else{
                        ctx.reply("Ок, відміняю останю дію")
                        appState.listenOf = null
                    } 
                break;
                case ADD_TO_GROUP:
                    const name = ctx.message.text
                    ctx.reply("Шукаю")
                        group = await Group.findOne({ name })
                    if(group && group.lentgh !== 0){
                        ctx.reply(`Введіть пароль (код) групи ${name}: `)
                        appState.lastGroup = group
                        appState.listenOf = CODE_REQUIRE
                    }else{
                        ctx.reply('Я не знайшов групи з такою назвою')
                    }
                break;
                case CODE_REQUIRE:
                    if(  appState.lastGroup.code == ctx.message.text ){
                        // ctx.reply(' Все вірно, зараз добавляю... ')
                        const groupChanged = await Group.findById(appState.lastGroup._id)
                        // console.log(groupChanged)
                        groupChanged.users.push( ctx.message.from.id )
                        groupChanged.users = [...new Set(appState.lastGroup.users)]
                        try {
                            ctx.user.using = appState.lastGroup.name
                            await ctx.user.save()
                            await groupChanged.save()
                            
                        } catch (e) {
                            ctx.reply("Мені не вдалось записати вас до групи")
                            console.log(e.message)
                            return
                        }    
                        ctx.reply('Все супер, ти в групі')

                    }else{
                        ctx.reply('Невірний код')
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