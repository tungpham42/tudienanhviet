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
} from "antd";
import {
  SearchOutlined,
  SoundOutlined,
  BookOutlined,
  CheckCircleOutlined,
  TranslationOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Title, Text } = Typography;

// --- 1. INTERFACES ---
interface DefinitionItem {
  meaning: string;
  synonyms?: string[];
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

// --- 2. HELPERS ---
const translatePos = (pos: string): string => {
  const map: Record<string, string> = {
    noun: "Danh từ",
    verb: "Động từ",
    adjective: "Tính từ",
    adverb: "Trạng từ",
    preposition: "Giới từ",
    pronoun: "Đại từ",
    interjection: "Thán từ",
    conjunction: "Liên từ",
    article: "Mạo từ",
    abbreviation: "Viết tắt",
    phrase: "Cụm từ",
    suffix: "Hậu tố",
    prefix: "Tiền tố",
  };
  return map[pos.toLowerCase()] || pos;
};

// --- 3. COMPONENT CHÍNH ---
const Dictionary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DictionaryData | null>(null);

  // --- HÀM PHÁT ÂM NÂNG CẤP (Hỗ trợ đa ngôn ngữ) ---
  const playAudio = (text: string, lang: "en-US" | "vi-VN" = "en-US") => {
    if (!text) return;

    // Ngắt âm thanh đang đọc dở (nếu có) để đọc từ mới ngay
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang; // Thiết lập ngôn ngữ (Anh hoặc Việt)
    utterance.rate = 0.9; // Tốc độ đọc vừa phải

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
      )}`;

      const response = await axios.get(apiUrl);
      const rawData = response.data;

      // Parsing Data
      const mainTranslation = rawData[0]?.[0]?.[0] || "";

      let phonetic = "";
      if (Array.isArray(rawData[0])) {
        for (let i = 1; i < rawData[0].length; i++) {
          const item = rawData[0][i];
          if (
            Array.isArray(item) &&
            typeof item[item.length - 1] === "string"
          ) {
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
              if (typeof m === "string") {
                meanings.push({ meaning: m });
              }
            });
          }

          if (meanings.length > 0) {
            details.push({ pos, meanings });
          }
        });
      }

      if (!mainTranslation && details.length === 0) {
        message.error("Không tìm thấy từ này trong từ điển.");
      } else {
        setData({
          word: rawData[0]?.[0]?.[1] || searchTerm,
          phonetic: phonetic,
          mainTranslation,
          details,
        });
      }
    } catch (error) {
      console.error("Lỗi:", error);
      message.error("Lỗi kết nối đến máy chủ dịch thuật.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* SEARCH AREA */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <Title
          level={1}
          className="font-serif"
          style={{ color: "#344e41", marginBottom: 5 }}
        >
          <BookOutlined /> Từ điển Chuyên sâu
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          Anh - Việt • Ngữ pháp • Phát âm 2 chiều
        </Text>

        <div style={{ marginTop: 30, position: "relative" }}>
          <Input
            size="large"
            placeholder="Nhập từ tiếng Anh (VD: Present, Run, Hello)..."
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
          <Spin size="large" tip="Đang tra cứu dữ liệu..." />
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
          {/* 1. TỪ VỰNG TIẾNG ANH (NGUỒN) */}
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
              </div>
            </div>

            <Tooltip title="Nghe tiếng Anh (US)">
              <Button
                shape="circle"
                size="large"
                icon={<SoundOutlined />}
                onClick={() => playAudio(data.word, "en-US")} // Gọi tiếng Anh
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

          {/* 2. NGHĨA TIẾNG VIỆT (DỊCH CHÍNH) - CÓ NÚT LOA MỚI */}
          <div
            style={{
              marginBottom: 25,
              padding: "15px",
              background: "#f1f8e9",
              borderRadius: 12,
              borderLeft: "4px solid #588157",
              display: "flex", // Flexbox để căn chỉnh
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TranslationOutlined style={{ fontSize: 18, color: "#588157" }} />
              <Text style={{ fontSize: 20, fontWeight: 600, color: "#344e41" }}>
                {data.mainTranslation}
              </Text>
            </div>

            {/* Nút phát âm tiếng Việt */}
            <Tooltip title="Nghe tiếng Việt">
              <Button
                type="text"
                shape="circle"
                icon={<SoundOutlined />}
                onClick={() => playAudio(data.mainTranslation, "vi-VN")} // Gọi tiếng Việt
                style={{ color: "#588157" }}
              />
            </Tooltip>
          </div>

          {/* 3. CHI TIẾT NGỮ NGHĨA */}
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
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between", // Căn chỉnh để thêm loa nhỏ nếu cần
                              padding: "10px 15px",
                              background: "#fafafa",
                              borderRadius: 8,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                              }}
                            >
                              <CheckCircleOutlined
                                style={{ color: "#588157", fontSize: 16 }}
                              />
                              <Text
                                style={{
                                  fontSize: 17,
                                  color: "#495057",
                                  lineHeight: 1.6,
                                }}
                              >
                                {item.meaning}
                              </Text>
                            </div>

                            {/* Tùy chọn: Thêm nút loa nhỏ cho từng nghĩa chi tiết */}
                            <Button
                              type="text"
                              size="small"
                              icon={<SoundOutlined />}
                              style={{ opacity: 0.5 }}
                              onClick={() => playAudio(item.meaning, "vi-VN")}
                            />
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
            <Text type="secondary">Nhập từ vựng để khám phá ý nghĩa.</Text>
          }
          style={{ marginTop: 80, opacity: 0.6 }}
        />
      )}
    </div>
  );
};

export default Dictionary;
