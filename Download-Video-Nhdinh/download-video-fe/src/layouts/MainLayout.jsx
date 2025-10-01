import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaAt,
  FaFacebook,
  FaInstagram,
  FaMoon,
  FaSun,
  FaTiktok,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";
import img from "../assets/img";
import "./MainLayout.scss";

function MainLayout({ children }) {
  const [toast, setToast] = useState("");
  const [toastProgress, setToastProgress] = useState(100);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const stored = localStorage.getItem("theme:darkMode");
      if (stored !== null) return JSON.parse(stored);
      return (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    } catch {
      return false;
    }
  });
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const mobileMenuRef = useRef(null);

  const platforms = useMemo(
    () => [
      {
        name: "Facebook",
        path: "/download/facebook",
        icon: <FaFacebook />,
        active: true,
        color: "#1877f3",
      },
      {
        name: "Instagram",
        path: "/download/instagram",
        icon: <FaInstagram />,
        active: true,
        color: "#E1306C",
      },
      {
        name: "TikTok",
        path: "/download/tiktok",
        icon: <FaTiktok />,
        active: true,
        color: "#000000",
      },
      {
        name: "Threads",
        path: "/download/threads",
        icon: <FaAt />,
        active: false,
        color: "#000000",
      },
      {
        name: "X (Twitter)",
        path: "/download/twitter",
        icon: <FaTwitter />,
        active: false,
        color: "#1da1f2",
      },
      {
        name: "YouTube",
        path: "/download/youtube",
        icon: <FaYoutube />,
        active: false,
        color: "#ff0000",
      },
    ],
    []
  );

  const handleComingSoon = useCallback((name) => {
    setToast(`"${name}" đang được phát triển. Vui lòng quay lại sau!`);
    setToastProgress(100);
  }, []);

  const handlePlatformSelect = useCallback(
    (platform) => {
      if (platform.active) navigate(platform.path);
      else handleComingSoon(platform.name);
      setIsMobileMenuOpen(false);
    },
    [navigate, handleComingSoon]
  );

  const toggleDarkMode = useCallback(() => setIsDarkMode((prev) => !prev), []);

  // Đồng bộ dark-mode lên body và lưu vào localStorage
  useEffect(() => {
    try {
      if (isDarkMode) document.body.classList.add("dark-mode");
      else document.body.classList.remove("dark-mode");
      localStorage.setItem("theme:darkMode", JSON.stringify(isDarkMode));
    } catch {
      // ignore storage errors
    }
  }, [isDarkMode]);

  // Đóng mobile menu khi điều hướng route
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Quản lý focus cho menu di động
  useEffect(() => {
    if (isMobileMenuOpen && mobileMenuRef.current) {
      mobileMenuRef.current.focus();
    }
  }, [isMobileMenuOpen]);

  // Hiệu ứng toast notification với progress bar
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3000);
      const progressInterval = setInterval(() => {
        setToastProgress((prev) => Math.max(prev - 100 / 30, 0));
      }, 100);
      return () => {
        clearTimeout(t);
        clearInterval(progressInterval);
      };
    }
  }, [toast]);

  // Hiệu ứng scrolled cho header
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className={`main-layout ${isDarkMode ? "dark-mode" : ""}`}>
      <header
        className={`home-header ${isScrolled ? "scrolled" : ""}`}
        role="banner"
      >
        <div className="header-container">
          <Link
            to="/"
            className="home-logo"
            aria-label="Trang chủ - Video Downloader"
          >
            <img src={img.logo1} alt="Logo" className="logo-image" />
            <div className="logo-text">
              <br />
              <span className="logo-title">Video Downloader</span>
              <span className="logo-subtitle">Premium</span>
            </div>
          </Link>
          <div className="header-actions">
            <button
              onClick={toggleDarkMode}
              className="dark-mode-toggle"
              aria-label="Chuyển đổi chế độ sáng/tối"
              aria-pressed={isDarkMode}
            >
              {isDarkMode ? <FaSun /> : <FaMoon />}
            </button>
          </div>
        </div>
      </header>
      <header className="main-header" role="banner">
        <div className="header-container">
          <nav className="main-nav desktop-nav" aria-label="Điều hướng chính">
            <div className="downloader-menu">
              {platforms.map((p) =>
                p.active ? (
                  <Link
                    key={p.name}
                    to={p.path}
                    className={`downloader-menu-item ${
                      location.pathname === p.path ? "active" : ""
                    }`}
                    style={{ "--platform-color": p.color }}
                    aria-label={`Tải xuống từ ${p.name}`}
                    aria-current={
                      location.pathname === p.path ? "page" : undefined
                    }
                  >
                    <span className="platform-icon">{p.icon}</span>
                    <span className="platform-name">{p.name}</span>
                  </Link>
                ) : (
                  <button
                    key={p.name}
                    className="downloader-menu-item coming-soon"
                    onClick={() => handleComingSoon(p.name)}
                    style={{ "--platform-color": p.color }}
                    aria-label={`${p.name} (Sắp ra mắt)`}
                  >
                    <span className="platform-icon">{p.icon}</span>
                    <span className="platform-name">{p.name}</span>
                    <span className="badge-soon">Sắp ra mắt</span>
                  </button>
                )
              )}
            </div>
          </nav>
          <nav className="main-nav mobile-nav" aria-label="Điều hướng di động">
            <button
              className="menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Mở/đóng menu nền tảng"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="menu-toggle-icon">≡</span>
            </button>
            {isMobileMenuOpen && (
              <>
                <div
                  className="mobile-menu-backdrop"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <div
                  className="mobile-menu-dropdown"
                  role="menu"
                  ref={mobileMenuRef}
                  tabIndex={-1}
                >
                  <button
                    className="close-menu"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-label="Đóng menu"
                  >
                    ×
                  </button>
                  {platforms.map((p) => (
                    <button
                      key={p.name}
                      className={`mobile-menu-item ${
                        !p.active ? "disabled" : ""
                      } ${location.pathname === p.path ? "active" : ""}`}
                      onClick={() => handlePlatformSelect(p)}
                      aria-label={`Chọn ${p.name}${
                        !p.active ? " (Sắp ra mắt)" : ""
                      }`}
                      role="menuitem"
                      style={{ "--platform-color": p.color }}
                    >
                      <span className="platform-icon">{p.icon}</span>
                      <span className="platform-name">{p.name}</span>
                      {!p.active && (
                        <span
                          className="badge-soon-mobile"
                          data-tooltip="Dự kiến ra mắt Q1 2024"
                        >
                          (Sắp ra mắt)
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="main-content" role="main">
        <div className="content-container">{children}</div>
      </main>
      <footer className="main-footer" role="contentinfo">
        <div className="footer-content">
          <div className="footer-links">
            <a
              href="/privacy"
              className="footer-link"
              aria-label="Chính sách bảo mật"
            >
              Bảo mật
            </a>
            <a
              href="/terms"
              className="footer-link"
              aria-label="Điều khoản dịch vụ"
            >
              Điều khoản
            </a>
            <a href="/contact" className="footer-link" aria-label="Liên hệ">
              Liên hệ
            </a>
            <a href="/about" className="footer-link" aria-label="Giới thiệu">
              Giới thiệu
            </a>
          </div>
          <div className="copyright">
            © {currentYear} Video Downloader Pro. Mọi quyền được bảo lưu.
          </div>
        </div>
      </footer>
      {toast && (
        <div
          className="toast-notification"
          role="alert"
          aria-live="polite"
          style={{ "--progress": `${toastProgress}%` }}
        >
          {toast}
          <div className="toast-progress" />
        </div>
      )}
    </div>
  );
}

export default MainLayout;
