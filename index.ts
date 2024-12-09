import {
  analyseBotInput,
  anaylzeAddress,
  getEthPrice,
} from "./functions/utils";
import { Bot, BotConfig, Context } from "grammy";
import { config } from "./utils/config";
import { messages } from "./messages/messages";
import { Message } from "grammy/types";

// const main = async () => {
//   try {
//     const address: string = "0xa3ad1aaf0306179f0e6e1ac7566fc60cd24d4289";
//     const randString: string =
//       "https://dexscreener.com/ethereum/0xa3ad1aaf0306179f0e6e1ac7566fc60cd24d4289";
//     getEthPrice();
//     // const address: string = analyseBotInput(randString);
//     await anaylzeAddress(address);
//   } catch (e: any) {
//     console.log(e.message);
//   }
// };

// main();

const bot = new Bot(config.botToken!);

//Commands
bot.command("start", (ctx: Context) => {
  ctx.reply(messages.START);
});

bot.on("message:text", async (ctx: Context) => {
  let message: Message;
  if (ctx?.message) {
    message = ctx?.message;
    try {
      const { input: tokenAddress, inputType } = await analyseBotInput(
        message.text!
      );
      //Get the token Details
      let newMessage: Message = await ctx.reply("Getting token details", {
        reply_to_message_id: message.message_id,
        parse_mode: "HTML",
      });

      console.log({ newMessage });
      const tokenInfo = await anaylzeAddress(tokenAddress, inputType);

      await ctx.reply(tokenInfo, {
        reply_to_message_id: newMessage.message_id,
        parse_mode: "HTML",
      });
    } catch (error: any) {
      // ctx.update.message?.reply_to_message(message.message_id);
      console.error(error.message);
      await ctx.reply(messages.ERROR, {
        reply_to_message_id: message.message_id,
      });
    }
  } else {
    await ctx.reply(messages.ERROR);
  }
});

bot.start();

console.log("Bot is running...");
