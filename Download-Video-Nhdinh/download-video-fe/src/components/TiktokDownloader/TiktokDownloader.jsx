import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  FaTiktok,
  FaDownload,
  FaRegCopy,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaArrowLeft,
} from "react-icons/fa";
import "./TiktokDownloader.scss";

const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname.startsWith("192.168.") ||
  window.location.hostname.startsWith("10.") ||
  window.location.hostname.startsWith("172.")
    ? `http://${window.location.hostname}:8081/api/tiktok`
    : `${
        process.env.REACT_APP_API_BASE ||
        "https://your-production-domain.com/api/tiktok"
      }`;

const TiktokDownloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState({ preview: false, download: false });
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [embedHtml, setEmbedHtml] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const sseRef = useRef(null);
  const location = useLocation();
  const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);

  const isValidTiktokUrl = useCallback((input) => {
    try {
      const cleaned = decodeURIComponent(input.trim());
      const urlObj = new URL(cleaned);
      return (
        urlObj.hostname.includes("tiktok.com") ||
        urlObj.hostname.includes("vm.tiktok.com") ||
        urlObj.hostname.includes("vt.tiktok.com")
      );
    } catch {
      return false;
    }
  }, []);

  const handlePreview = useCallback(
    async (inputUrl = url) => {
      if (!inputUrl || !isValidTiktokUrl(inputUrl)) {
        setError("Vui lòng nhập đúng link video TikTok!");
        setLoading((prev) => ({ ...prev, preview: false }));
        return;
      }
      setLoading((prev) => ({ ...prev, preview: true }));
      setError("");
      setSuccess("");
      setThumbnail("");
      setVideoTitle("");
      setEmbedHtml("");
      setVideoUrl("");
      let data = null;
      const abortController = new AbortController(); // Optimized: Use AbortController for better cancel on network change
      try {
        const res = await fetch(`${API_BASE}/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: inputUrl }),
          signal: abortController.signal, // Replace timeout with signal for mobile flaky networks
        });
        data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Không thể lấy thông tin video.");
        }
        setVideoTitle(data.title || "Chưa có tiêu đề");
        setThumbnail(data.thumbnail || "");
        setEmbedHtml(data.embedHtml || "");
        setVideoUrl(data.videoUrl || "");
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(`Lỗi: ${err.message || "Không thể lấy thông tin video."}`);
        }
        if (data && data.thumbnail) setThumbnail(data.thumbnail);
      } finally {
        setLoading((prev) => ({ ...prev, preview: false }));
      }
      return () => abortController.abort(); // Cleanup
    },
    [url, isValidTiktokUrl]
  );

  const handleDownload = useCallback(() => {
    if (!isValidTiktokUrl(url)) {
      setError("Vui lòng nhập đúng link video TikTok!");
      return;
    }
    setLoading((prev) => ({ ...prev, download: true }));
    setProgress(0);
    setError("");
    setSuccess("");

    const eventSource = new EventSource(
      `${API_BASE}/download/stream?url=${encodeURIComponent(url)}`
    );
    sseRef.current = eventSource;

    eventSource.onmessage = (e) => {
      const msg = e.data;
      if (msg.startsWith("PROGRESS_")) {
        setProgress(Number(msg.replace("PROGRESS_", "")));
      } else if (msg.startsWith("DONE_")) {
        const fileName = msg.replace("DONE_", "");
        setProgress(100);
        setSuccess("Video đã sẵn sàng để tải xuống...");
        const tempLink = document.createElement("a");
        tempLink.href = `${API_BASE}/download?filename=${encodeURIComponent(
          fileName
        )}`;
        tempLink.download = fileName;
        tempLink.click();
        setSuccess("Tải video thành công!");
        setLoading((prev) => ({ ...prev, download: false }));
        eventSource.close();
      } else if (msg.startsWith("ERROR_")) {
        setError(msg.replace("ERROR_", ""));
        setLoading((prev) => ({ ...prev, download: false }));
        eventSource.close();
      } else if (msg.startsWith("FALLBACK_")) {
        const fallbackUrl = msg.replace("FALLBACK_", "");
        window.open(fallbackUrl, "_blank");
        setSuccess(
          "Máy chủ không tải được; đã mở link TikTok để tải thủ công."
        );
        setLoading((prev) => ({ ...prev, download: false }));
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      if (progress < 100) {
        setError("Mất kết nối, đang thử lại...");
        eventSource.close();
        setTimeout(handleDownload, 2000);
      }
    };
  }, [url, isValidTiktokUrl, progress]);

  const handleCopy = useCallback(() => {
    if (navigator.clipboard && url) {
      navigator.clipboard.writeText(url);
      setSuccess("Link đã được sao chép!");
      setTimeout(() => setSuccess(""), 1500);
    } else {
      setError("Không thể sao chép link!");
    }
  }, [url]);

  const handleBack = () => {
    setUrl("");
    setThumbnail("");
    setVideoTitle("");
    setError("");
    setSuccess("");
    setProgress(0);
    setEmbedHtml("");
    setVideoUrl("");
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlFromQuery = params.get("url");
    if (urlFromQuery) {
      const decodedUrl = decodeURIComponent(urlFromQuery);
      setUrl(decodedUrl);
      handlePreview(decodedUrl);
    }
  }, [location, handlePreview]);

  return (
    <div className="main-center">
      <div className="tiktok-downloader-root">
        <div className="header-row">
          <div className="tiktok-header">
            <FaTiktok className="tiktok-logo" />
            <span className="tiktok-title">TikTok Video Downloader</span>
          </div>
        </div>

        {!thumbnail && (
          <div className="tiktok-input-group">
            <label htmlFor="tiktok-url-input" className="sr-only">
              Nhập link video TikTok
            </label>
            <input
              id="tiktok-url-input"
              type="url"
              className={`tiktok-input ${
                url && !isValidTiktokUrl(url) ? "tiktok-input-error" : ""
              }`}
              placeholder="Dán link video TikTok..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePreview()}
              spellCheck={false}
              autoFocus
              autoComplete="off"
            />
            <button
              className="tiktok-btn tiktok-btn-preview"
              onClick={async () => {
                if (isMobile) {
                  if (!url || !isValidTiktokUrl(url)) {
                    setError("Vui lòng nhập đúng link video TikTok!");
                    return;
                  }
                  handleDownload(); // Thực hiện tải về trực tiếp trên mobile/iPad
                } else {
                  try {
                    const clipboardText = await navigator.clipboard.readText();
                    const cleanedUrl = clipboardText.trim();
                    setUrl(cleanedUrl);
                    handlePreview(cleanedUrl);
                  } catch {
                    setError("Không thể đọc clipboard!");
                  }
                }
              }}
              disabled={loading.preview || (isMobile && loading.download)}
            >
              {isMobile ? (
                loading.download ? (
                  <FaSpinner className="tiktok-spin" />
                ) : (
                  <FaDownload />
                )
              ) : loading.preview ? (
                <FaSpinner className="tiktok-spin" />
              ) : (
                <FaRegCopy />
              )}
              {isMobile
                ? loading.download
                  ? "Đang tải..."
                  : "Tải về"
                : loading.preview
                ? "Đang xử lý..."
                : "Dán & Xem trước"}
            </button>
          </div>
        )}

        {thumbnail && !loading.preview && (
          <div className="tiktok-preview-row">
            <div className="tiktok-preview-col tiktok-preview-video">
              {videoTitle && (
                <div className="tiktok-video-title">{videoTitle}</div>
              )}
              {embedHtml ? (
                <div
                  dangerouslySetInnerHTML={{ __html: embedHtml }}
                  style={{ width: "100%", height: "auto" }}
                /> // Ưu tiên embed video official
              ) : videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  muted
                  loop
                  style={{ width: "100%", height: "auto" }}
                  onError={() =>
                    setError(
                      "Không thể tải video preview. Hãy thử tải trực tiếp."
                    )
                  }
                >
                  Trình duyệt không hỗ trợ video.
                </video> // Fallback video direct nếu oEmbed fail
              ) : (
                <img
                  src={thumbnail}
                  alt="Hình thu nhỏ video"
                  className="tiktok-video-preview"
                  onError={() =>
                    setError("Không thể tải hình thu nhỏ. Hãy thử tải video.")
                  }
                /> // Chỉ thumbnail nếu all fail
              )}
            </div>
            <div className="tiktok-preview-col tiktok-preview-actions">
              <button
                className="tiktok-btn tiktok-btn-download"
                onClick={handleDownload}
                disabled={loading.download}
              >
                {loading.download ? (
                  <FaSpinner className="tiktok-spin" />
                ) : (
                  <FaDownload />
                )}
                {loading.download ? "Đang tải..." : "Lưu về máy"}
              </button>
              <button
                className="tiktok-btn tiktok-btn-copy"
                onClick={handleCopy}
                disabled={!url}
              >
                <FaRegCopy />
                Sao chép link
              </button>
              <button
                className="tiktok-btn tiktok-btn-back"
                onClick={handleBack}
              >
                <FaArrowLeft /> Video khác
              </button>
            </div>
          </div>
        )}

        {loading.download && (
          <div className="tiktok-progress-wrap">
            <div className="tiktok-progress-bar-bg">
              <div
                className="tiktok-progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="tiktok-progress-label">{progress}%</div>
          </div>
        )}

        {(error || success) && (
          <div
            className={`tiktok-alert ${
              success ? "tiktok-alert-success" : "tiktok-alert-error"
            }`}
          >
            {success ? <FaCheckCircle /> : <FaTimesCircle />}
            {success || error}
          </div>
        )}

        <br />
        {!thumbnail && (
          <div className="fb-guide">
            <b>Hướng dẫn:</b>{" "}
            {isMobile
              ? "Nhập link video TikTok vào ô trên, sau đó bấm Tải về."
              : "Dán link video TikTok vào ô trên, sau đó bấm Dán & Xem trước → khi video hiện, bấm Lưu về máy."}
          </div>
        )}

        <div className="tiktok-powered">
          © {new Date().getFullYear()} Nhdinh TikTok Video Downloader. All
          rights reserved.
        </div>
      </div>
    </div>
  );
};

export default TiktokDownloader;
