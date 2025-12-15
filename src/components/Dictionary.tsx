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
  Segmented, // Component chuyển đổi chế độ đẹp mắt
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

// --- 1. INTERFACES ---
interface DefinitionItem {
  meaning: string;
  synonyms?: string[];
  examples?: string[]; // Thêm trường ví dụ
}

interface PartOfSpeechGroup {
  pos: string;
  meanings: DefinitionItem[];
}

interface DictionaryData {
  word: string;
  phonetic?: string;
  mainTranslation: string; // Với tiếng Việt, đây sẽ là định nghĩa ngắn gọn nhất
  details: PartOfSpeechGroup[];
}

// --- 2. HELPERS ---
const translatePos = (pos: string): string => {
  const map: Record<string, string> = {
    // Tiếng Anh
    noun: "Danh từ",
    verb: "Động từ",
    adjective: "Tính từ",
    adverb: "Trạng từ",
    preposition: "Giới từ",
    pronoun: "Đại từ",
    // Wiktionary hay trả về tiếng Việt luôn hoặc các mã sau
    "danh từ": "Danh từ",
    "động từ": "Động từ",
    "tính từ": "Tính từ",
    "trạng từ": "Trạng từ",
    "thán từ": "Thán từ",
  };
  return map[pos.toLowerCase()] || pos.charAt(0).toUpperCase() + pos.slice(1);
};

// Hàm loại bỏ HTML tags từ Wiktionary (vì nó trả về dạng <i>...</i>)
const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

// --- 3. COMPONENT CHÍNH ---
const Dictionary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DictionaryData | null>(null);

  // State chế độ: 'en' (Anh-Việt) hoặc 'vi' (Giải nghĩa Tiếng Việt)
  const [mode, setMode] = useState<"en" | "vi">("en");

  // --- HÀM PHÁT ÂM ---
  const playAudio = (text: string, lang: "en-US" | "vi-VN" = "en-US") => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Nếu đang ở chế độ Tiếng Việt, luôn ép về giọng Việt
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
      // Gửi thêm param `mode` lên server
      const apiUrl = `/.netlify/functions/dictionary?term=${encodeURIComponent(
        searchTerm
      )}&mode=${mode}`;
      const response = await axios.get(apiUrl);
      const { source, data: rawData } = response.data;

      if (source === "google") {
        parseGoogleData(rawData);
      } else if (source === "wiki") {
        parseWikiData(rawData);
      }
    } catch (error: any) {
      console.error("Lỗi:", error);
      if (error.response && error.response.status === 404) {
        message.error("Không tìm thấy từ này trong từ điển.");
      } else {
        message.error("Lỗi kết nối đến máy chủ.");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC XỬ LÝ DỮ LIỆU GOOGLE (ANH - VIỆT) ---
  const parseGoogleData = (rawData: any) => {
    const mainTranslation = rawData[0]?.[0]?.[0] || "";
    let phonetic = "";

    // Logic tìm phonetic (giữ nguyên như cũ)
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

  // --- LOGIC XỬ LÝ DỮ LIỆU WIKTIONARY (VIỆT - VIỆT) ---
  const parseWikiData = (wikiData: any) => {
    // Wiktionary cấu trúc: { vi: [ { partOfSpeech: 'Danh từ', definitions: [...] } ] }
    // Lấy ngôn ngữ tiếng Việt ('vi')
    const langData = wikiData["vi"];

    if (!langData || langData.length === 0) {
      message.warning("Chưa có dữ liệu phân tích cho từ này.");
      return;
    }

    const details: PartOfSpeechGroup[] = [];
    let firstMeaning = "";

    langData.forEach((item: any) => {
      const pos = item.partOfSpeech;
      const definitions = item.definitions || [];
      const meanings: DefinitionItem[] = [];

      definitions.forEach((def: any) => {
        // Làm sạch HTML trong definition
        const cleanDef = stripHtml(def.definition);
        if (!firstMeaning) firstMeaning = cleanDef; // Lấy nghĩa đầu tiên làm main

        // Parse ví dụ (nếu có)
        const examples: string[] = [];
        if (def.examples) {
          def.examples.forEach((ex: any) => {
            if (typeof ex === "string") examples.push(stripHtml(ex));
          });
        }

        meanings.push({
          meaning: cleanDef,
          examples: examples,
        });
      });

      if (meanings.length > 0) {
        details.push({ pos, meanings });
      }
    });

    setData({
      word: searchTerm,
      phonetic: "", // Wiktionary API này ít trả về phonetic dạng text đơn giản
      mainTranslation: firstMeaning, // Hiển thị nghĩa đầu tiên ở phần Highlight
      details: details,
    });
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* HEADER & MODE SWITCHER */}
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <Title
          level={1}
          className="font-serif"
          style={{ color: "#344e41", marginBottom: 10 }}
        >
          <BookOutlined /> Từ điển Thông minh
        </Title>

        {/* THANH CHUYỂN ĐỔI CHẾ ĐỘ */}
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
              mode === "en"
                ? "Nhập từ tiếng Anh (VD: Serendipity)..."
                : "Nhập từ tiếng Việt (VD: Lạc quan, Mèo)..."
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
                : "Đang phân tích ngữ nghĩa..."
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
          {/* 1. TỪ VỰNG & PHÁT ÂM */}
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
                      padding: "4px 10px",
                      fontFamily: "monospace",
                      color: "#666",
                      background: "#f5f5f5",
                      border: "none",
                    }}
                  >
                    {data.phonetic}
                  </Tag>
                )}
                {/* Ở chế độ Tiếng Việt, hiển thị thêm Tag */}
                {mode === "vi" && <Tag color="gold">Tiếng Việt</Tag>}
              </div>
            </div>

            <Tooltip title={mode === "en" ? "Nghe tiếng Anh" : "Nghe đọc từ"}>
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

          {/* 2. NGHĨA CHÍNH (HIGHLIGHT) */}
          <div
            style={{
              marginBottom: 25,
              padding: "20px",
              background: "#f1f8e9",
              borderRadius: 16,
              borderLeft: "5px solid #588157",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 15,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 5,
                }}
              >
                {mode === "en" ? (
                  <TranslationOutlined
                    style={{ fontSize: 18, color: "#588157" }}
                  />
                ) : (
                  <FileTextOutlined
                    style={{ fontSize: 18, color: "#588157" }}
                  />
                )}
                <Text
                  type="secondary"
                  style={{
                    textTransform: "uppercase",
                    fontSize: 12,
                    letterSpacing: 1,
                  }}
                >
                  {mode === "en" ? "Bản dịch gợi ý" : "Định nghĩa chính"}
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

            {/* Nút phát âm (Chỉ hiện nếu không trùng với từ gốc) */}
            {mode === "en" && (
              <Tooltip title="Nghe tiếng Việt">
                <Button
                  type="text"
                  shape="circle"
                  icon={<SoundOutlined />}
                  onClick={() => playAudio(data.mainTranslation, "vi-VN")}
                  style={{ color: "#588157", marginTop: 5 }}
                />
              </Tooltip>
            )}
          </div>

          {/* 3. CHI TIẾT NGỮ NGHĨA (TABS) */}
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

                                {/* Hiển thị Ví dụ nếu có (Wiktionary thường có) */}
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
              <Text>Không có thông tin phân loại ngữ pháp chi tiết.</Text>
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
                : "Giải nghĩa Từ vựng Tiếng Việt"}
            </Text>
          }
          style={{ marginTop: 80, opacity: 0.6 }}
        />
      )}
    </div>
  );
};

export default Dictionary;
