import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaTiktok,
  FaTwitter,
  FaAt,
  FaDownload,
  FaArrowRight,
  FaTimes,
} from "react-icons/fa";
import "./Home.scss";

const platforms = [
  {
    name: "Facebook",
    path: "/download/facebook",
    icon: <FaFacebook />,
    desc: "Tải video chất lượng cao, hỗ trợ reel và story một cách mượt mà.",
    active: true,
    color: "#1877f2",
  },
  {
    name: "Instagram",
    path: "/download/instagram",
    icon: <FaInstagram />,
    desc: "Tải reels, stories và posts nhanh chóng với chất lượng gốc.",
    active: true,
    color: "#E1306C",
  },
  {
    name: "TikTok",
    path: "/download/tiktok",
    icon: <FaTiktok />,
    desc: "Tải video không watermark, chất lượng HD full.",
    active: true,
    color: "#000000",
  },
  {
    name: "Threads",
    path: "/download/threads",
    icon: <FaAt />,
    desc: "Hỗ trợ tải threads sắp ra mắt với tính năng đầy đủ.",
    active: false,
    color: "#000000",
  },
  {
    name: "Twitter",
    path: "/download/twitter",
    icon: <FaTwitter />,
    desc: "Tải video từ X (Twitter) sắp có, không giới hạn.",
    active: false,
    color: "#1DA1F2",
  },
  {
    name: "Youtube",
    path: "/download/youtube",
    icon: <FaYoutube />,
    desc: "Tải video YouTube chất lượng cao sắp hỗ trợ đa định dạng.",
    active: false,
    color: "#FF0000",
  },
];

function Home() {
  const [toast, setToast] = useState("");

  const carouselRef = useRef(null);

  const handleComingSoon = useCallback((name, e) => {
    e.preventDefault();
    setToast(
      `Tính năng cho "${name}" đang được phát triển. Hãy quay lại sau nhé!`
    );
  }, []);

  const dismissToast = () => setToast("");

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(dismissToast, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);


;

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const updateCarouselPosition = () => {
      const scrollWidth = carousel.scrollWidth;
      const clientWidth = carousel.clientWidth;
      carousel.scrollLeft = scrollWidth / 2 - clientWidth / 2;
    };

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const scrollWidth = carousel.scrollWidth;
      const clientWidth = carousel.clientWidth;

      if (scrollLeft <= 0) {
        carousel.scrollTo({ left: scrollWidth / 2, behavior: "instant" });
      } else if (scrollLeft + clientWidth >= scrollWidth) {
        carousel.scrollTo({
          left: scrollWidth / 2 - clientWidth,
          behavior: "instant",
        });
      }
    };

    carousel.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", updateCarouselPosition);

    // Khởi tạo vị trí
    updateCarouselPosition();

    return () => {
      carousel.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateCarouselPosition);
    };
  }, []);



  const infinitePlatforms = [...platforms, ...platforms]; // Duplicate x2 đủ cho loop

  const renderPlatformCard = (p, index) => (
    <Link
      to={p.active ? p.path : "#"}
      className={`platform-card ${p.active ? "" : "coming-soon"}`}
      key={`${p.name}-${index}`}
      onClick={!p.active ? (e) => handleComingSoon(p.name, e) : undefined}
      aria-label={`${p.name} - ${p.desc}`}
      tabIndex={0}
      data-index={index % platforms.length}
    >
      <div className="platform-icon" style={{ color: p.color }}>
        {p.icon}
      </div>
      <div className="platform-info">
        <h3>{p.name}</h3>
        <p>{p.desc}</p>
      </div>
      {!p.active && <div className="platform-badge">Sắp ra mắt</div>}
    </Link>
  );

  return (
    <div className="home-root">
   

      <section className="home-hero" aria-labelledby="hero-title">
        <div className="hero-content">
          <h1 id="hero-title">
            Tải Video Từ{" "}
            <span className="primary-gradient">Mọi Nền Tảng Xã Hội</span>
          </h1>
          <p className="hero-subtitle">
            Miễn phí hoàn toàn • Tốc độ siêu nhanh • An toàn và dễ sử dụng
          </p>
          <p className="hero-description">
            Chỉ cần dán link video, chọn nền tảng yêu thích và tải về ngay lập
            tức. Hỗ trợ đầy đủ Facebook, Instagram, TikTok cùng nhiều tính năng
            sắp ra mắt.
          </p>
          <Link
            className="btn-primary"
            to="/download/facebook"
            aria-label="Bắt đầu tải video ngay bây giờ"
          >
            <FaDownload /> Bắt đầu tải <FaArrowRight />
          </Link>
        </div>
      </section>

      <section className="home-platforms" aria-labelledby="platforms-title">
        <div className="section-container">
          <h2 id="platforms-title">Các nền tảng được hỗ trợ</h2>
          <div
            className="platform-container infinite-carousel"
            role="region"
            aria-label="Danh sách nền tảng hỗ trợ"
            ref={carouselRef}
          >
            {infinitePlatforms.map(renderPlatformCard)}
          </div>
        </div>
      </section>

      <section className="home-features" aria-labelledby="features-title">
        <div className="section-container">
          <h2 id="features-title">Tại sao chọn Nhdinh Downloader Pro?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">
                🚀
              </div>
              <h3>Tốc độ cao</h3>
              <p>
                Tải video nhanh chóng mà không cần chờ đợi lâu, tối ưu hóa cho
                mọi kết nối mạng.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">
                🔒
              </div>
              <h3>An toàn bảo mật</h3>
              <p>
                Không lưu trữ dữ liệu cá nhân, đảm bảo quyền riêng tư tuyệt đối
                cho người dùng.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">
                📱
              </div>
              <h3>Thân thiện đa thiết bị</h3>
              <p>
                Giao diện responsive, hoạt động mượt mà trên PC, laptop, iPad và
                mobile.
              </p>
            </div>
          </div>
        </div>
      </section>

    
      {toast && (
        <div className="toast-coming-soon" role="alert">
          {toast}
          <button onClick={dismissToast} aria-label="Đóng thông báo">
            <FaTimes />
          </button>
        </div>
      )}
    </div>
  );
}

export default Home;
