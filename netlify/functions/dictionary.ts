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
      const response = await axios.get(googleUrl);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ source: "google", data: response.data }),
      };
    }

    // --- CHẾ ĐỘ 2: VIỆT - VIỆT (Dùng Wiktionary API) ---
    // API này trả về định nghĩa chi tiết của từ tiếng Việt
    if (mode === "vi") {
      // Endpoint mobile của Wiktionary trả về cấu trúc JSON rất sạch và dễ dùng
      const wikiUrl = `https://vi.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(
        term
      )}`;

      try {
        const response = await axios.get(wikiUrl);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ source: "wiki", data: response.data }),
        };
      } catch (e: any) {
        // Wiktionary trả về 404 nếu không tìm thấy từ
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
