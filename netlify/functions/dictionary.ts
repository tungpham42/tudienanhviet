import { Handler } from "@netlify/functions";
import axios from "axios";

const handler: Handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const axiosConfig = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  };

  try {
    // Lấy thêm tham số 'type' và 'lang'
    const { term, type, lang } = event.queryStringParameters || {};

    if (!term) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing term" }),
      };
    }

    // --- CASE 1: AUDIO PROXY (Xử lý âm thanh) ---
    if (type === "audio") {
      const targetLang = lang === "vi" ? "vi" : "en";

      // URL Google TTS
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encodeURIComponent(
        term
      )}`;

      // Gọi Google lấy file binary (arraybuffer)
      const response = await axios.get(audioUrl, {
        ...axiosConfig,
        responseType: "arraybuffer",
      });

      // Trả về file âm thanh
      return {
        statusCode: 200,
        headers: {
          ...headers,
          "Content-Type": "audio/mpeg", // Báo cho trình duyệt đây là file nhạc
        },
        // Netlify yêu cầu file binary phải chuyển sang base64
        body: Buffer.from(response.data).toString("base64"),
        isBase64Encoded: true,
      };
    }

    // --- CASE 2: TEXT DICTIONARY (Mặc định - Tra từ) ---
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(
      term
    )}`;

    const response = await axios.get(googleUrl, axiosConfig);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data),
    };
  } catch (error: any) {
    console.error("Server Error:", error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
