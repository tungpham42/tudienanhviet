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

  // Header giả lập trình duyệt
  const axiosConfig = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  };

  try {
    const { term } = event.queryStringParameters || {};

    if (!term) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing term" }),
      };
    }

    // Luôn gọi Google GTX (Anh -> Việt)
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(
      term
    )}`;

    const response = await axios.get(googleUrl, axiosConfig);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data), // Trả về trực tiếp dữ liệu từ Google
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
