const express = require('express')
const config = require('config')
const axios = require('axios')
const path = require('path')
const fs = require('fs');
const imgur = require('imgur');
const mongoose = require('mongoose')
const FormData = require('form-data');
const Lesson = require('./models/Lesson')
const Homework = require('./models/Homework')
const Group = require('./models/Group')
const User = require('./models/User');
const TimeTable = require('./models/TimeTable');
const { time } = require('console');
// const c = require('config');
// const { text } = require('express')
const PORT = config.get('port')
imgur.setClientId('dd7aa97e9e366db');
imgur.setAPIUrl('https://api.imgur.com/3/');    

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
        const SOLUTION = "SOLUTION"
        const SOLUTION_LESSON_SELECT = 'SOLUTION_LESSON_SELECT'
        const CONFIRM_SOLUTION = 'CONFIRM_SOLUTION'
        const SOLUTION_HW_SELECT = 'SOLUTION_HW_SELECT'
        const LESSON_DELETE = 'LESSON_DELETE'
        const LESSON_DELETE_CONFIRM = 'LESSON_DELETE_CONFIRM'
        const TT_CREATE = 'TT_CREATE'

        const TimeTableToDays = [
            "Понеділок",
            "Вівторок",
            "Середа",
            "Четвер",
            "П'ятниця",
            "Субота",
            "Неділя",
        ]

        const bot = new Telegraf(config.get('token'))
        bot.use(async (ctx, next) => {
            const id = ctx.message.from ? ctx.message.from.id : 918652398
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
/addlesson - 📚 Добавити урок у свій список                  
/lessons   - 📖 переглянути список твоїх уроків 
/rmlesson  - 🛑 видалити предмет зі списку      
/addhw     - 🖊️ добавити в список домашнє завдання
/hw        - 🏠 переглянути список з домашнім завданням 
/done      - ✔️ дозволяє відмітити завдання, як готове 


Групи:
/creategroup - 👪 дозволяє створити групу  
/usegroup    - 🧑‍🤝‍🧑 дозволяє уввійти в групу
/leave       - 🛑 дозволяє покинути групу

Рішення:

/addsol      - ✔️ добавити рішення для певного завдання
/sol         - 👀 переглянути всі рішення
        `))

        bot.command('creategroup', ctx => {
            ctx.reply("Ок, введіть назву...🖊️")
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

        bot.command("addsol", async ctx => {
            appState.solutionsLinks = []
            appState.solutionsTips  = []
            ctx.reply("Введіть рішення🖊️ або надішліть зображення🖼️ з ним: ")
            appState.listenOf = SOLUTION
        })

        // bot.hears( 'id', async ctx => {
        //     // console.log( user_refreshed )

        //     ctx.reply(ctx.message.from.id)
        //     console.log(ctx.message.from.id, appState)
        // } ) // COMENT IN ENTERPRISE!!!!

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
        bot.command('creatett', async (ctx) => {
            ctx.reply(`Ініціюю процес створення розкладу...🤖`)
            const lessonsMenu = await getLessonsMenu(ctx.message.from.id)
            ctx.reply(`Напишіть перший урок у понеділок (якщо його немає в списку то ви можете написати його за допомогою клавіатури, а я його сам добавлю у список)`, lessonsMenu)
            appState.listenOf = TT_CREATE
            appState.timetableFilled = {}
            appState.timetable = [1,1]
        })
        bot.command('next_day', async ctx => {
            // appState.listenOf  = null
            if(appState.listenOf === TT_CREATE){
                let replyText = ''
                console.log(appState.timetableFilled)
                for(const key in appState.timetableFilled){
                    replyText += '\n'+TimeTableToDays[key-1]
                    replyText += `: \n ${appState.timetableFilled[key].map((lesson, i) => `${i+1}. ${lesson}` ).join(';\n')}`
                }
                ctx.reply(replyText)
                if(appState.timetable[0] <= 7){
                    ctx.reply(`Переходимо до наступного дня...`)
                    appState.timetable[0] += 1
                    appState.timetable[1] = 1
                }else{
                    // ctx.reply("Cписок складено успішно!")
                    const timetable = new TimeTable({
                        lessons: appState.timetableFilled,
                        owner: ctx.message.from.id
                    })
                    try {
                        await timetable.save()
                        ctx.reply('Список збережено успішно!')//
                    } catch (e) {
                        ctx.reply("Не вдалось зберегти список в базу даних")                        
                        console.log(e, e.message)
                    }
                    appState.timetableFilled = {}
                    appState.timetable = null
                }
            }else{
                ctx.reply('Проініціалізуйте спочатку процес створення (/creatett)')
            }
        
        })
        bot.command('tt', async ctx => {
            ctx.reply('Завантажую...')
            let timeTable = await TimeTable.findOne({owner: ctx.message.from.id})
            timeTable = timeTable['lessons']
            let replyText = ''
                for(const key in timeTable){
                    replyText += '\n'+TimeTableToDays[key-1]
                    replyText += `: \n ${timeTable[key].map((lesson, i) => `${i+1}. ${lesson}` ).join(';\n')}`
                }
                ctx.reply(replyText)
        })
        bot.command('ttd', async ctx => {
            ctx.reply('Завантажую...')
            let timeTable = await TimeTable.findOne({owner: ctx.message.from.id})
            if(timeTable){
                timeTable = timeTable['lessons']
                const date = new Date()
                let replyText = ''
                replyText += '\n'+TimeTableToDays[date.getDay()-1]
                replyText += `: \n ${timeTable[date.getDay()].map((lesson, i) => `${i+1}. ${lesson}` ).join(';\n')}`

                ctx.reply(replyText)
            }else{
                ctx.reply('Сьогодні ніяких уроків!')
            }
        })
        bot.command('ttt', async ctx => {
            ctx.reply('Завантажую...')
            let timeTable = await TimeTable.findOne({owner: ctx.message.from.id})
            if(timeTable){
                timeTable = timeTable['lessons']
                const date = new Date()
                let replyText = ''
                replyText += '\n'+TimeTableToDays[date.getDay()]
                replyText += `: \n ${timeTable[date.getDay()+1].map((lesson, i) => `${i+1}. ${lesson}` ).join(';\n')}`

                ctx.reply(replyText)
            } else{
                ctx.reply("Завтра ніяких уроків!")
            }

        })
        
        bot.command('rmlesson', async ( { reply, message } ) => {
            const lessonsMenu = await getLessonsMenu(message.from.id)
            reply("Який урок ви бажаєте видалити зі списку❓", lessonsMenu)
            appState.listenOf = LESSON_DELETE
        })
        
        bot.command('addhw', async ctx => {
            const lessonsMenu = await getLessonsMenu(ctx.message.from.id)
            ctx.reply("Ок тоді оберіть урок: ", lessonsMenu)

            appState.listenOf = LESSON_HW
        })
        bot.command('tthw', async ctx => {
            ctx.reply('Завантажую...')
            let timeTable = await TimeTable.findOne({owner: ctx.message.from.id})
            if(timeTable){
                const hw = await Homework.find({ owner: ctx.message.from.id, is_done: false })

                timeTable = timeTable['lessons']
                const date = new Date()
                let replyText = ''
                replyText += '\n'+TimeTableToDays[date.getDay()]
                replyText += `: \n ${timeTable[date.getDay()+1].map((lesson, i) => `${i+1}. ${lesson} : ${hw.map(hw_item => {
                    if(hw_item.lesson == lesson){
                        return hw_item.homework
                    }
                }).filter(el => {
                    return el != null && el != '';
                }).join(';') } ` ).join(';\n')}`

                ctx.reply(replyText)
            }else{
                ctx.reply('Ніякого домашнього на завтра!!!')
            }
        })
        bot.command('ttdhw', async ctx => {
            ctx.reply('Завантажую...')
            let timeTable = await TimeTable.findOne({owner: ctx.message.from.id})
            if(timeTable){
                const hw = await Homework.find({ owner: ctx.message.from.id, is_done: false })

                timeTable = timeTable['lessons']
                const date = new Date()
                let replyText = ''
                replyText += '\n'+TimeTableToDays[date.getDay()-1]
                replyText += `: \n ${timeTable[date.getDay()].map((lesson, i) => `${i+1}. ${lesson} : ${hw.map(hw_item => {
                    if(hw_item.lesson == lesson){
                        return hw_item.homework
                    }
                }).filter(el => {
                    return el != null && el != '';
                }).join(';') } ` ).join(';\n')}`

                ctx.reply(replyText)
            }else{
                ctx.reply('Ніякого домашнього на сьогодні!!!')
            }
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

        bot.command('sol', async ctx => {
            const hw = await Homework.find({ owner: ctx.message.from.id, is_done: false })
            const hwWithSolutions = hw.filter( hw_item => hw_item.solutions?.exist )
            let text = ''

            if(hwWithSolutions.length > 0){
                hwWithSolutions.forEach( hw_item => {
                    let links = hw_item.solutions.links.join(' ')
                    let tips  = hw_item.solutions.tips.join(' ; ')
    
                    text += `${hw_item.lesson} : ${hw_item.homework}: 
    ${links}
    
    ${tips}                
    `
                } )

                ctx.reply(text) 
            }else{
                ctx.reply('Ще ніхто не добавив рішення😥')
            }
               
        })
        bot.command('done', async ctx => {
            const lessonsMenu = await getLessonsMenu(ctx.message.from.id)
            ctx.reply('Оберіть урок з якого ви завершили завдання', lessonsMenu)
            appState.listenOf = LESSON_DONE
        })

        const confirmMenu = Telegraf.Extra
          .markdown()
          .markup((m) => m.keyboard([
            m.callbackButton(OK),
            m.callbackButton('НІ')
          ]).resize())
          
          
      const getLessonsMenu = async (owner, returnList = false) => {
        const lessons = await Lesson.find({ owner })
        
        if(!returnList){
            return Telegraf.Extra
            .markdown()
            .markup((m) => m.keyboard(lessons.map( lesson => {
                return m.callbackButton(lesson.lesson)
            } )).resize())
        }else{
            return [Telegraf.Extra
                .markdown()
                .markup((m) => m.keyboard(lessons.map( lesson => {
                    return m.callbackButton(lesson.lesson)
                } )).resize()), lessons]
        }

        
      }

      const getHomeWorkMenu = async (owner,lesson) => {
        const homework = await Homework.find({ owner, lesson, is_done: false })

        return Telegraf.Extra
        .markdown()
        .markup((m) => m.keyboard(homework.map( hw => {
            return m.callbackButton(hw.homework)
        } )).resize())
      }

        bot.on('message', async (ctx) => {
            
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
                        const homework = await Homework.find({
                            lesson: appState.lastLessonOfDone,
                            homework: appState.homeworkOfDone,
                            owner: ctx.message.from.id
                        })  
                        homework.forEach( hw => hw.is_done = true)//is_done = true
                        try {
                            await homework.forEach( hw => hw.save())
                        } catch (e) {
                            console.log(e. message)
                            ctx.reply("Не вдалось оновити завдання в базі даних, перевірте правильність написання")
                            return
                        }
                        ctx.reply('Завдання оновлено!✔️')
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
                        ctx.reply('Я не знайшов групи з такою назвою, відміняю процес вступання у групу')
                        appState.listenOf = null
                    }
                break;
                case CODE_REQUIRE:
                    if(  appState.lastGroup.code == ctx.message.text ){
                        const groupChanged = await Group.findById(appState.lastGroup._id)
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
                    appState.listenOf = null
                break;
                case SOLUTION:
                    if(ctx.message.photo?.length !== 0 && ctx.message.photo  || ( ctx.message.document && ctx.message.document.file_id )){
                        //image 
                        const imageName = `${Math.floor(1000 * Math.random())}.jpg`
                        let url
                        if(ctx.message.photo?.length !== 0 && ctx.message.photo){
                            url = await ctx.telegram.getFileLink(ctx.message.photo[2].file_id)
                        }else{
                            url = await ctx.telegram.getFileLink(ctx.message.document.file_id)
                        }
                        const response = await axios({url, responseType: 'stream'})
                        await new Promise((resolve, reject) => {
                            response.data.pipe(fs.createWriteStream(path.resolve(`./temp/images/${imageName}`)))
                                        .on('finish', () => {
                                            fs.readFile(path.resolve(`./temp/images/${imageName}`), (error, file) => {
                                                if (error){
                                                    ctx.reply("Шось поломаний у тебе якийсь файл...")
                                                }else{
                                                    imgur.uploadFile(`./temp/images/${imageName}`)
                                                    .then(async function (json) {
                                                        appState.solutionsLinks.push(json.data.link)
                                                        fs.unlinkSync(`./temp/images/${imageName}`)
                                                        resolve()
                                                    })
                                                    .catch(function (err) {
                                                        ctx.reply('Imgur обідився на мене, скори ми все порішаєм')
                                                        console.error(err.message);
                                                        reject()
                                                    });    
                                                }
                                            })
                                            
                                        })
                                        .on('error', e => {
                                            ctx.reply('Телеграм мені не віддає картинку!')
                                            console.log(e, e.message)
                                        })
                                }); 
                        
                    }else{
                        //text
                        console.log('text', ctx.message)
                        appState.solutionsTips.push(ctx.message.text)
                    }
                    const lessonsMenu = await getLessonsMenu(ctx.message.from.id)

                    ctx.reply('Ок, для якого задання з якого предмету це рішення?', lessonsMenu)

                    appState.listenOf = SOLUTION_LESSON_SELECT 
                break;
                case SOLUTION_LESSON_SELECT:
                    appState.solutionLesson = ctx.message.text
                    const homeworkSolMenu = await getHomeWorkMenu(ctx.message.from.id, ctx.message.text)

                    ctx.reply('Ок, тепер оберіть домашнє завдання', homeworkSolMenu)

                    appState.listenOf = SOLUTION_HW_SELECT 
                break;
                case SOLUTION_HW_SELECT:
                    appState.hwSolution = ctx.message.text
                    ctx.reply("Ок, підтвердіть дію!", confirmMenu)

                    appState.listenOf  = CONFIRM_SOLUTION           
                break;
                case CONFIRM_SOLUTION:
                    if(ctx.message.text == OK){
                        const homework = await Homework.findOne({
                            lesson: appState.solutionLesson,
                            homework: appState.hwSolution,
                            owner: ctx.message.from.id
                        })  
                        if(homework) homework.solutions = {
                            links: homework.solutions.links ? [...homework.solutions.links, ...appState.solutionsLinks]: [...appState.solutionsLinks],
                            tips:  homework.solutions.tips  ? [...homework.solutions.tips, ...appState.solutionsTips]  : [...appState.solutionsTips]
                        }
                        if(homework) homework.solutions.exist = true

                        try {
                            await homework.save() 
                        } catch (e) {
                            console.log(e. message)
                            ctx.reply("Не вдалось оновити завдання в базі даних, перевірте правильність написання")
                            return
                        }
                        ctx.reply("Я додав твоє рішення!")

                    }else{
                        ctx.reply("Ок, відміняю останю дію")
                    }
                    appState.listenOf = null

                break;
                case LESSON_DELETE: 
                    ctx.reply(`Ви впевнені що хочете видалити ${ctx.message.text}?`, confirmMenu)
                    appState.lastLessonOfDelete = ctx.message.text
                    appState.listenOf = LESSON_DELETE_CONFIRM
                break;
                case LESSON_DELETE_CONFIRM:
                    if(ctx.message.text == OK){
                        try {
                            await Lesson.findOneAndDelete({
                                lesson: appState.lastLessonOfDelete,
                                owner: ctx.message.from.id
                            })  
                        } catch (e) {
                            console.log(e. message)
                            ctx.reply("Не вдалось видалити предмет, перевірте правильність написання")
                            return
                        }
                        ctx.reply('Предмет видалено!')
                        appState.listenOf = null
                    }else{
                        ctx.reply("Ок, відміняю останю дію")
                        appState.listenOf = null
                    } 
                break;
                case TT_CREATE:
                    let  [day, number] = appState.timetable
                    number += 1
                    appState.timetable[1] = number
                    // const newLessonsMenu = await getLessonsMenu(ctx.message.from.id)

                    const [newLessonsMenu, lessons] = await getLessonsMenu(ctx.message.from.id, true)
                    ctx.reply(number, newLessonsMenu)
                    appState.timetableFilled[day] = appState.timetableFilled[day] ? [...appState.timetableFilled[day], ctx.message.text] : [ctx.message.text] 
                    let includes = false
                    lessons.forEach(lesson => {
                        if(lesson.lesson == ctx.message.text){
                            includes = true
                        }
                    })
                    if(!includes){

                        const lesson = new Lesson({
                            lesson: ctx.message.text,
                            owner:  ctx.message.from.id
                        })
                        lesson.save()
                    }
                    // ctx.reply(`Записав... (щоб перейти до наступного дня напишіть /next_day)`, newLessonsMenu)
                    // if(appState.timetableFilled && appState.timetableFilled[day]){
                    //     appState.timetableFilled[day].push(ctx.message.text)
                    // } else{
                    //     if(!appState.timetableFilled) appState.timetableFilled = {} 
                    //     appState.timetableFilled[day] = [ctx.message.text]
                    //     // Lesson.findAndModify({
                    //     //     lesson: ctx.message.text, 
                    //     //     owner: ctx.message.from.id
                    //     // })//
                    // }    
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