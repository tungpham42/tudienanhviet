import React, { useState } from "react";
import {
  Input,
  Button,
  Card,
  Typography,
  List,
  message,
  Spin,
  Empty,
  Tabs,
  Tooltip,
  Tag,
  Segmented,
} from "antd";
import {
  SearchOutlined,
  SoundOutlined,
  BookOutlined,
  CheckCircleOutlined,
  TranslationOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Title, Text } = Typography;

// --- INTERFACES ---
interface DefinitionItem {
  meaning: string;
  synonyms?: string[];
  examples?: string[];
}

interface PartOfSpeechGroup {
  pos: string;
  meanings: DefinitionItem[];
}

interface DictionaryData {
  word: string;
  phonetic?: string;
  mainTranslation: string;
  details: PartOfSpeechGroup[];
}

const translatePos = (pos: string): string => {
  // Chuẩn hóa tên loại từ từ Wiktionary text
  const cleanPos = pos.replace(/=/g, "").trim();
  return cleanPos.charAt(0).toUpperCase() + cleanPos.slice(1);
};

const Dictionary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DictionaryData | null>(null);
  const [mode, setMode] = useState<"en" | "vi">("en");

  const playAudio = (text: string, lang: "en-US" | "vi-VN" = "en-US") => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = mode === "vi" ? "vi-VN" : lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      message.warning("Vui lòng nhập từ để tra!");
      return;
    }

    setLoading(true);
    setData(null);

    try {
      const apiUrl = `/.netlify/functions/dictionary?term=${encodeURIComponent(
        searchTerm
      )}&mode=${mode}`;
      const response = await axios.get(apiUrl);
      const { source, data: rawData } = response.data;

      if (source === "google") {
        parseGoogleData(rawData);
      } else if (source === "wiki_text") {
        parseWikiText(rawData); // Hàm xử lý mới
      }
    } catch (error: any) {
      console.error("Lỗi:", error);
      if (error.response && error.response.status === 404) {
        message.error("Không tìm thấy từ này.");
      } else {
        message.error("Lỗi kết nối.");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- PARSE GOOGLE DATA (Giữ nguyên) ---
  const parseGoogleData = (rawData: any) => {
    const mainTranslation = rawData[0]?.[0]?.[0] || "";
    let phonetic = "";
    if (Array.isArray(rawData[0])) {
      for (let i = 1; i < rawData[0].length; i++) {
        const item = rawData[0][i];
        if (Array.isArray(item) && typeof item[item.length - 1] === "string") {
          phonetic = item[item.length - 1];
          break;
        }
        if (
          typeof item === "string" &&
          (item.trim().startsWith("[") || item.includes(" "))
        ) {
          phonetic = item;
          break;
        }
      }
    }
    const dictionaryRaw = rawData[1];
    const details: PartOfSpeechGroup[] = [];
    if (Array.isArray(dictionaryRaw)) {
      dictionaryRaw.forEach((group: any) => {
        const pos = group[0];
        const meaningsRaw = group[1];
        const meanings: DefinitionItem[] = [];
        if (Array.isArray(meaningsRaw)) {
          meaningsRaw.forEach((m: any) => {
            if (typeof m === "string") meanings.push({ meaning: m });
          });
        }
        if (meanings.length > 0) details.push({ pos, meanings });
      });
    }
    setData({
      word: rawData[0]?.[0]?.[1] || searchTerm,
      phonetic,
      mainTranslation,
      details,
    });
  };

  // --- PARSE WIKI TEXT (NEW - Xử lý văn bản thô) ---
  const parseWikiText = (text: string) => {
    // 1. Chỉ lấy phần "Tiếng Việt" (Nếu từ này có cả nghĩa tiếng Anh, Pháp...)
    let vietnameseSection = text;
    const startVi = text.indexOf("== Tiếng Việt ==");
    if (startVi !== -1) {
      // Cắt từ "== Tiếng Việt ==" đến "== " tiếp theo hoặc hết bài
      const subText = text.substring(startVi + "== Tiếng Việt ==".length);
      const nextLang = subText.indexOf("\n== "); // Tìm ngôn ngữ tiếp theo
      vietnameseSection =
        nextLang !== -1 ? subText.substring(0, nextLang) : subText;
    }

    // 2. Tìm các nhóm loại từ (=== Danh từ ===, === Động từ ===)
    // Regex tìm các dòng bắt đầu bằng === ... ===
    const posRegex = /={3,4}\s*(.*?)\s*={3,4}/g;
    const details: PartOfSpeechGroup[] = [];
    let match;

    // Mảng tạm lưu vị trí các header
    const headers: Array<{ pos: string; index: number; end: number }> = [];
    while ((match = posRegex.exec(vietnameseSection)) !== null) {
      headers.push({
        pos: match[1],
        index: match.index,
        end: match.index + match[0].length,
      });
    }

    headers.forEach((h, i) => {
      const nextH = headers[i + 1];
      // Lấy nội dung giữa header này và header tiếp theo
      const content = vietnameseSection.substring(
        h.end,
        nextH ? nextH.index : undefined
      );

      // Bỏ qua các mục không phải loại từ (như "Cách phát âm", "Tham khảo")
      const ignoredHeaders = [
        "Cách phát âm",
        "Tham khảo",
        "Ghi chú",
        "Đồng nghĩa",
        "Trái nghĩa",
        "Dịch",
      ];
      if (ignoredHeaders.some((ig) => h.pos.includes(ig))) return;

      // 3. Phân tích nội dung để tìm định nghĩa (Dòng bắt đầu bằng #)
      const lines = content.split("\n");
      const meanings: DefinitionItem[] = [];

      let currentMeaning: DefinitionItem | null = null;

      lines.forEach((line) => {
        const trimLine = line.trim();
        if (trimLine.startsWith("# ")) {
          // Đây là định nghĩa
          const defText = trimLine.substring(2).trim();
          // Lưu định nghĩa trước đó
          if (currentMeaning) meanings.push(currentMeaning);
          currentMeaning = { meaning: defText, examples: [] };
        } else if (trimLine.startsWith("#:")) {
          // Đây là ví dụ của định nghĩa trước đó
          if (currentMeaning) {
            const exText = trimLine.substring(2).trim();
            currentMeaning.examples?.push(exText);
          }
        }
      });
      // Push cái cuối cùng
      if (currentMeaning) meanings.push(currentMeaning);

      if (meanings.length > 0) {
        details.push({ pos: h.pos, meanings });
      }
    });

    // Lấy định nghĩa đầu tiên làm main translation
    const mainTranslation =
      details.length > 0 && details[0].meanings.length > 0
        ? details[0].meanings[0].meaning
        : "Xem chi tiết bên dưới";

    setData({
      word: searchTerm,
      phonetic: "", // Wiktionary Text extract khó parse phonetic chuẩn
      mainTranslation: mainTranslation,
      details: details,
    });
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* HEADER AREA */}
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <Title
          level={1}
          className="font-serif"
          style={{ color: "#344e41", marginBottom: 10 }}
        >
          <BookOutlined /> Từ điển Thông minh
        </Title>

        <div style={{ marginBottom: 20 }}>
          <Segmented
            options={[
              { label: "🇬🇧 Anh - Việt", value: "en" },
              { label: "🇻🇳 Phân tích Tiếng Việt", value: "vi" },
            ]}
            value={mode}
            onChange={(val) => {
              setMode(val as "en" | "vi");
              setSearchTerm("");
              setData(null);
            }}
            size="large"
            style={{ backgroundColor: "#e9ecef", padding: 4 }}
          />
        </div>

        <div style={{ marginTop: 20, position: "relative" }}>
          <Input
            size="large"
            placeholder={
              mode === "en" ? "Nhập từ tiếng Anh..." : "Nhập từ tiếng Việt..."
            }
            prefix={
              <SearchOutlined style={{ color: "#8d99ae", fontSize: 20 }} />
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
            style={{
              borderRadius: 30,
              padding: "12px 50px 12px 25px",
              fontSize: 18,
              boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              border: "1px solid #d9d9d9",
            }}
          />
          <Button
            type="primary"
            shape="circle"
            icon={<SearchOutlined />}
            size="large"
            onClick={handleSearch}
            loading={loading}
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              width: 45,
              height: 45,
              boxShadow: "0 4px 15px rgba(88, 129, 87, 0.3)",
            }}
          />
        </div>
      </div>

      {/* RESULT AREA */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin
            size="large"
            tip={
              mode === "en"
                ? "Đang dịch thuật..."
                : "Đang tra cứu Wiktionary..."
            }
          />
        </div>
      ) : data ? (
        <Card
          bordered={false}
          style={{
            borderRadius: 24,
            boxShadow: "0 20px 60px rgba(0,0,0,0.06)",
            background: "#ffffff",
            padding: "10px 20px",
          }}
        >
          {/* WORD HEADER */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div>
              <Title
                level={1}
                style={{
                  margin: 0,
                  color: "#2c3e50",
                  fontSize: 42,
                  letterSpacing: -1,
                }}
                className="font-serif"
              >
                {data.word}
              </Title>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 5,
                }}
              >
                {data.phonetic && (
                  <Tag
                    style={{
                      fontSize: 16,
                      fontFamily: "monospace",
                      color: "#666",
                      background: "#f5f5f5",
                      border: "none",
                    }}
                  >
                    {data.phonetic}
                  </Tag>
                )}
                {mode === "vi" && <Tag color="geekblue">Wiktionary</Tag>}
              </div>
            </div>

            <Tooltip title="Nghe đọc">
              <Button
                shape="circle"
                size="large"
                icon={<SoundOutlined />}
                onClick={() =>
                  playAudio(data.word, mode === "vi" ? "vi-VN" : "en-US")
                }
                style={{
                  width: 60,
                  height: 60,
                  fontSize: 24,
                  border: "2px solid #a3b18a",
                  color: "#588157",
                  background: "#fff",
                }}
                className="hover-scale"
              />
            </Tooltip>
          </div>

          {/* MAIN DEFINITION */}
          <div
            style={{
              marginBottom: 25,
              padding: "20px",
              background: "#f1f8e9",
              borderRadius: 16,
              borderLeft: "5px solid #588157",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 5,
              }}
            >
              {mode === "en" ? (
                <TranslationOutlined style={{ color: "#588157" }} />
              ) : (
                <FileTextOutlined style={{ color: "#588157" }} />
              )}
              <Text
                type="secondary"
                style={{ textTransform: "uppercase", fontSize: 12 }}
              >
                {mode === "en" ? "Bản dịch" : "Định nghĩa chính"}
              </Text>
            </div>
            <Text
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#344e41",
                lineHeight: 1.5,
              }}
            >
              {data.mainTranslation}
            </Text>
          </div>

          {/* DETAILS TABS */}
          {data.details.length > 0 ? (
            <Tabs
              defaultActiveKey="0"
              type="card"
              size="large"
              items={data.details.map((group, index) => ({
                key: String(index),
                label: (
                  <span style={{ fontWeight: 700, fontSize: 15 }}>
                    {translatePos(group.pos)}
                  </span>
                ),
                children: (
                  <div style={{ padding: "10px 0", minHeight: 150 }}>
                    <List
                      grid={{ gutter: 16, column: 1 }}
                      dataSource={group.meanings}
                      renderItem={(item) => (
                        <List.Item style={{ marginBottom: 12 }}>
                          <div
                            style={{
                              padding: "15px",
                              background: "#fafafa",
                              borderRadius: 12,
                              border: "1px solid #f0f0f0",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 12,
                              }}
                            >
                              <CheckCircleOutlined
                                style={{
                                  color: "#588157",
                                  fontSize: 16,
                                  marginTop: 4,
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    fontSize: 17,
                                    color: "#2d3436",
                                    lineHeight: 1.6,
                                    fontWeight: 500,
                                  }}
                                >
                                  {item.meaning}
                                </Text>
                                {item.examples && item.examples.length > 0 && (
                                  <div
                                    style={{
                                      marginTop: 10,
                                      paddingLeft: 10,
                                      borderLeft: "3px solid #dfe6e9",
                                    }}
                                  >
                                    {item.examples.map((ex, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          fontStyle: "italic",
                                          color: "#636e72",
                                          marginBottom: 4,
                                        }}
                                      >
                                        "{ex}"
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </List.Item>
                      )}
                    />
                  </div>
                ),
              }))}
            />
          ) : (
            <div style={{ textAlign: "center", padding: 30, color: "#aaa" }}>
              <Text>Không tìm thấy nội dung chi tiết cho từ này.</Text>
            </div>
          )}
        </Card>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text type="secondary">
              {mode === "en"
                ? "Tra từ điển Anh - Việt"
                : "Giải nghĩa Tiếng Việt"}
            </Text>
          }
          style={{ marginTop: 80, opacity: 0.6 }}
        />
      )}
    </div>
  );
};

export default Dictionary;
