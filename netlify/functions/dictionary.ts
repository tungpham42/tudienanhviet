import { Handler } from "@netlify/functions";
import axios from "axios";

const handler: Handler = async (event, context) => {
  // 1. Cấu hình Headers để CHO PHÉP CORS từ mọi nguồn (hoặc tên miền của bạn)
  const headers = {
    "Access-Control-Allow-Origin": "*", // Cho phép tất cả. Khi deploy thật nên đổi thành domain của bạn
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  // 2. Xử lý preflight request (trình duyệt hỏi trước khi gửi request thật)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    // 3. Lấy từ khóa từ query param (?term=hello)
    const { term } = event.queryStringParameters || {};

    if (!term) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing term parameter" }),
      };
    }

    // 4. Gọi API Google (Server-to-Server, không bị CORS)
    // dt=t (dịch), dt=bd (từ điển), dt=rm (phiên âm)
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(
      term
    )}`;

    const response = await axios.get(googleUrl);

    // 5. Trả dữ liệu về cho Frontend
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch data" }),
    };
  }
};

export { handler };
