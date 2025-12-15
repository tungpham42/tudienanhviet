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

  // Cấu hình Header giả lập trình duyệt để tránh bị chặn
  const axiosConfig = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  };

  try {
    const { term, mode } = event.queryStringParameters || {};

    if (!term) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing term" }),
      };
    }

    // --- CHẾ ĐỘ 1: ANH - VIỆT (Dùng Google GTX) ---
    if (mode === "en") {
      const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(
        term
      )}`;

      // Thêm axiosConfig vào đây
      const response = await axios.get(googleUrl, axiosConfig);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ source: "google", data: response.data }),
      };
    }

    // --- CHẾ ĐỘ 2: VIỆT - VIỆT (Dùng Wiktionary API) ---
    if (mode === "vi") {
      const wikiUrl = `https://vi.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(
        term
      )}`;

      try {
        // Thêm axiosConfig vào đây
        const response = await axios.get(wikiUrl, axiosConfig);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ source: "wiki", data: response.data }),
        };
      } catch (e: any) {
        if (e.response && e.response.status === 404) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Not found" }),
          };
        }
        throw e;
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid mode" }),
    };
  } catch (error: any) {
    console.error("Server Error:", error.message); // Log lỗi ra terminal của Netlify

    // TRẢ VỀ CHI TIẾT LỖI ĐỂ DEBUG (Quan trọng)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to fetch data",
        details: error.message,
        stack: error.stack,
      }),
    };
  }
};

export { handler };
