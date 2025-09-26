import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("[ERROR] 未检测到环境变量 OPENAI_API_KEY。请先设置后再运行。");
  process.exit(1);
}

const client = new OpenAI({ apiKey });

async function main() {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hello" }],
    });

    const message = response.choices?.[0]?.message;
    console.log("[MODEL]", response.model);
    console.log("[REPLY]", message);
  } catch (error) {
    if (error?.status) {
      console.error(`[ERROR] status=${error.status}`, error.message);
    } else {
      console.error("[ERROR]", error);
    }
    if (error?.response?.data) {
      console.error("[DETAILS]", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();


