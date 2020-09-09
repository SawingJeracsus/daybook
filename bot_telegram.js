const { Telegraf } = require('telegraf')


const config = require('config')
const appState = {
    listenOf: null
}
const LESON = "LESON"
const CONFIRM_LESSON = "CONFIRM_LESSON"
const OK = "OK"
const bot = new Telegraf(config.get('token'))
bot.start((ctx) => ctx.reply('Welcome!'))
bot.help((ctx) => ctx.reply('Send me a sticker'))

bot.command('addleson', ({ reply }) => {
    reply('Ок, тоді напиши що це за урок!')
    appState.listenOf = LESON
})

const testMenu = Telegraf.Extra
  .markdown()
  .markup((m) => m.inlineKeyboard([
    m.callbackButton('Test button', 'test')
  ]))

const aboutMenu = Telegraf.Extra
  .markdown()
  .markup((m) => m.keyboard([
    m.callbackButton(OK),
    m.callbackButton('НІ')
  ]).resize())


bot.on('text', (ctx) => {
    switch (appState.listenOf) {
        case LESON:
            ctx.reply("Ви впевнені що хочете добавити урок: "+ctx.message.text+"?")
            ctx.reply('Підтвердіть дію', aboutMenu)
            appState.listenOf = CONFIRM_LESSON
            appState.lastLesson = ctx.message.text
        break;
        case CONFIRM_LESSON:
            if(ctx.message.text == OK){
                console.log('confirm')
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
    