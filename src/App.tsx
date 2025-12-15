import React from "react";
import { Layout, ConfigProvider } from "antd";
import Dictionary from "./components/Dictionary";
import "./App.css";

const { Content, Footer } = Layout;

// Cấu hình Theme màu xanh lá (Sage Green) + Nền ấm
const themeConfig = {
  token: {
    colorPrimary: "#588157",
    colorBgBase: "#ffffff",
    borderRadius: 12,
    fontFamily: "'Nunito Sans', sans-serif",
  },
  components: {
    Tabs: {
      itemColor: "#8d99ae",
      itemSelectedColor: "#588157",
      titleFontSize: 16,
    },
  },
};

const App: React.FC = () => {
  return (
    <ConfigProvider theme={themeConfig}>
      <Layout style={{ minHeight: "100vh", background: "#f7f5f0" }}>
        <Content style={{ padding: "40px 20px" }}>
          <Dictionary />
        </Content>
        <Footer
          style={{
            textAlign: "center",
            background: "transparent",
            color: "#888",
            fontFamily: "Merriweather, serif",
          }}
        >
          Ứng dụng Từ điển Anh Việt ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
