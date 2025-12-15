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
  };
  return map[pos.toLowerCase()] || pos;
};

const Dictionary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DictionaryData | null>(null);

  // Hàm phát âm: Nhận text và mã ngôn ngữ
  const playAudio = (text: string, lang: "en-US" | "vi-VN") => {
    if (!text) return;
    window.speechSynthesis.cancel(); // Dừng âm thanh đang đọc (nếu có)
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9; // Tốc độ đọc
    window.speechSynthesis.speak(utterance);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      message.warning("Vui lòng nhập từ tiếng Anh để tra!");
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

      parseGoogleData(rawData);
    } catch (error: any) {
      console.error("Lỗi:", error);
      message.error("Lỗi kết nối hoặc không tìm thấy từ.");
    } finally {
      setLoading(false);
    }
  };

  const parseGoogleData = (rawData: any) => {
    const mainTranslation = rawData[0]?.[0]?.[0] || "";
    let phonetic = "";

    // Logic tìm phiên âm
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

    if (!mainTranslation && details.length === 0) {
      message.warning("Không tìm thấy dữ liệu cho từ này.");
      return;
    }

    setData({
      word: rawData[0]?.[0]?.[1] || searchTerm,
      phonetic,
      mainTranslation,
      details,
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
          <BookOutlined /> Từ điển Anh - Việt
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          Tra cứu ngữ nghĩa & Luyện phát âm
        </Text>

        {/* Thanh tìm kiếm đã chỉnh sửa */}
        <div
          style={{
            marginTop: 30,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <Input
            size="large"
            placeholder="Nhập từ tiếng Anh (VD: Serendipity, Code)..."
            prefix={
              <SearchOutlined style={{ color: "#8d99ae", fontSize: 20 }} />
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
            style={{
              borderRadius: 30,
              padding: "12px 25px", // Đã bỏ padding phải lớn
              fontSize: 18,
              boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              border: "1px solid #d9d9d9",
              flex: 1, // Tự động co giãn chiếm chỗ trống
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
              width: 50,
              height: 50,
              boxShadow: "0 4px 15px rgba(88, 129, 87, 0.3)",
              flexShrink: 0, // Đảm bảo nút không bị bóp méo
            }}
          />
        </div>
      </div>

      {/* RESULT AREA */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin size="large" tip="Đang tra cứu..." />
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

            {/* LOA PHÁT ÂM TIẾNG ANH */}
            <Tooltip title="Nghe tiếng Anh (US)">
              <Button
                shape="circle"
                size="large"
                icon={<SoundOutlined />}
                onClick={() => playAudio(data.word, "en-US")}
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

          {/* 2. NGHĨA TIẾNG VIỆT (DỊCH CHÍNH) */}
          <div
            style={{
              marginBottom: 25,
              padding: "20px",
              background: "#f1f8e9",
              borderRadius: 16,
              borderLeft: "5px solid #588157",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 5,
                }}
              >
                <TranslationOutlined style={{ color: "#588157" }} />
                <Text
                  type="secondary"
                  style={{ textTransform: "uppercase", fontSize: 12 }}
                >
                  Bản dịch
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

            {/* LOA PHÁT ÂM TIẾNG VIỆT */}
            <Tooltip title="Nghe tiếng Việt">
              <Button
                type="text"
                shape="circle"
                icon={<SoundOutlined />}
                onClick={() => playAudio(data.mainTranslation, "vi-VN")}
                style={{
                  color: "#588157",
                  fontSize: 18,
                }}
              />
            </Tooltip>
          </div>

          {/* 3. CHI TIẾT TỪ ĐIỂN */}
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
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
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
                              </div>
                            </div>

                            {/* Nút nghe nhỏ cho từng nghĩa chi tiết */}
                            <Tooltip title="Nghe">
                              <Button
                                type="text"
                                size="small"
                                icon={<SoundOutlined />}
                                style={{ opacity: 0.6, color: "#588157" }}
                                onClick={() => playAudio(item.meaning, "vi-VN")}
                              />
                            </Tooltip>
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
              Nhập từ vựng tiếng Anh để bắt đầu tra cứu.
            </Text>
          }
          style={{ marginTop: 80, opacity: 0.6 }}
        />
      )}
    </div>
  );
};

export default Dictionary;
