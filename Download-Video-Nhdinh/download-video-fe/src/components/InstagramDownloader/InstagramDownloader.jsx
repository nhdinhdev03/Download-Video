import { useCallback, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaDownload,
  FaInstagram,
  FaRegCopy,
  FaSpinner,
  FaTimesCircle,
} from "react-icons/fa";
import "./InstagramDownloader.scss";

const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname.startsWith("192.168.")
    ? `http://${window.location.hostname}:8081/api/instagram`
    : "https://your-production-domain.com/api/instagram";

const InstagramDownloader = () => {
  const [url, setUrl] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");

  const sseRef = useRef(null);
  const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);

  const isValidInstagramUrl = useCallback((input) => {
    try {
      const cleaned = decodeURIComponent(input.trim());
      const urlObj = new URL(cleaned);
      const host = urlObj.hostname;
      const path = urlObj.pathname;
      return host === "www.instagram.com" && path.startsWith("/reel/");
    } catch {
      return false;
    }
  }, []);

  const cleanInstagramUrl = (url) => {
    const cleanedUrl = url.split("?")[0];
    return cleanedUrl;
  };

  const handlePreview = useCallback(
    async (inputUrl = url) => {
      if (!inputUrl) return;

      const cleanedUrl = cleanInstagramUrl(inputUrl);

      if (!isValidInstagramUrl(cleanedUrl)) {
        setError("Chỉ hỗ trợ video dạng Reel trên Instagram!");
        return;
      }

      setLoadingPreview(true);
      setError("");
      setSuccess("");
      setPreviewUrl("");
      setCopied(false);
      setVideoTitle("");

      try {
        const res = await fetch(`${API_BASE}/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: cleanedUrl }),
        });
        const data = await res.json();
        if (!res.ok || !data.videoUrl)
          throw new Error(data.error || "Không lấy được video");
        setPreviewUrl(data.videoUrl);
        setVideoTitle(data.title || "");
      } catch (err) {
        setError("Lỗi: " + (err?.message || "Không lấy được video"));
      } finally {
        setLoadingPreview(false);
      }
    },
    [url, isValidInstagramUrl]
  );

  const handleDownload = useCallback(() => {
    if (!isValidInstagramUrl(url)) {
      setError("Chỉ hỗ trợ video dạng Reel trên Instagram!");
      return;
    }
    setLoadingDownload(true);
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
        setLoadingDownload(false);
        eventSource.close();
      } else if (msg.startsWith("ERROR_")) {
        setError(msg.replace("ERROR_", ""));
        setLoadingDownload(false);
        eventSource.close();
      }
    };
    eventSource.onerror = () => {
      if (progress < 100) {
        setError("Mất kết nối máy chủ, đang thử lại...");
        eventSource.close();
        setTimeout(() => handleDownload(), 2000);
      }
    };
  }, [url, isValidInstagramUrl, progress]);

  const handleCopy = useCallback(() => {
    if (navigator.clipboard && previewUrl) {
      navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      setError("Không thể sao chép link!");
    }
  }, [previewUrl]);

  const handleBack = () => {
    setUrl("");
    setPreviewUrl("");
    setSuccess("");
    setError("");
    setCopied(false);
    setProgress(0);
    setVideoTitle("");
  };

  return (
    <div className="main-center">
      <div className="insta-downloader-root">
        <div className="header-row">
          <div className="insta-header">
            <FaInstagram className="insta-logo" />
            <span className="insta-title">
              Instagram Video{" "}
              <span className="hide-on-pc">
                <br />
              </span>{" "}
              Downloader
            </span>
          </div>
        </div>

        {!previewUrl && (
          <div className="insta-input-group">
            <label htmlFor="insta-url-input" className="sr-only">
              Nhập link video Instagram
            </label>
            <input
              id="insta-url-input"
              type="url"
              className={`insta-input ${
                url && !isValidInstagramUrl(url) ? "insta-input-error" : ""
              }`}
              placeholder="Dán link video Instagram..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePreview(url);
              }}
              spellCheck={false}
              autoFocus
              autoComplete="off"
            />
            <button
              className="insta-btn insta-btn-preview"
              onClick={async () => {
                if (isMobile) {
                  if (!url || !isValidInstagramUrl(url)) {
                    setError("Chỉ hỗ trợ video dạng Reel trên Instagram!");
                    return;
                  }
                  handleDownload(); // Thực hiện tải về trực tiếp trên mobile/iPad
                } else {
                  try {
                    if (!navigator.clipboard)
                      throw new Error("Clipboard API không khả dụng.");
                    const clipboardText = await navigator.clipboard.readText();
                    const cleanedUrl = clipboardText.trim();
                    setUrl(cleanedUrl);
                    handlePreview(cleanedUrl);
                  } catch (err) {
                    setError(
                      "Không thể đọc clipboard. Hãy thử lại hoặc tự dán link!"
                    );
                  }
                }
              }}
              disabled={loadingPreview || (isMobile && loadingDownload)}
            >
              {isMobile ? (
                loadingDownload ? (
                  <FaSpinner className="insta-spin" />
                ) : (
                  <FaDownload />
                )
              ) : loadingPreview ? (
                <FaSpinner className="insta-spin" />
              ) : (
                <FaRegCopy />
              )}
              {isMobile
                ? loadingDownload
                  ? "Đang tải..."
                  : "Tải về"
                : loadingPreview
                ? "Đang xử lý..."
                : "Dán & Xem trước"}
            </button>
          </div>
        )}

        {previewUrl && (
          <div className="insta-preview-row">
            <div className="insta-preview-col insta-preview-video">
              {videoTitle && (
                <div className="insta-video-title">{videoTitle}</div>
              )}
              <video
                src={previewUrl}
                controls
                className="insta-video-preview"
              />
            </div>
            <div className="insta-preview-col insta-preview-actions">
              <button
                className="insta-btn insta-btn-download"
                onClick={handleDownload}
                disabled={loadingDownload}
              >
                {loadingDownload ? (
                  <FaSpinner className="insta-spin" />
                ) : (
                  <FaDownload />
                )}
                {loadingDownload ? "Đang tải..." : "Lưu về máy"}
              </button>
              <button
                className="insta-btn insta-btn-copy"
                onClick={handleCopy}
                disabled={copied}
              >
                {copied ? <FaCheckCircle /> : <FaRegCopy />}
                {copied ? "Đã copy link" : "Copy link"}
              </button>
              <button className="insta-btn insta-btn-back" onClick={handleBack}>
                <FaArrowLeft /> Video khác
              </button>
            </div>
          </div>
        )}

        {loadingDownload && (
          <div className="insta-progress-wrap">
            <div className="insta-progress-bar-bg">
              <div
                className="insta-progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="insta-progress-label">{progress}%</div>
          </div>
        )}

        {(error || success) && (
          <div
            className={`insta-alert ${
              success ? "insta-alert-success" : "insta-alert-error"
            }`}
          >
            {success ? <FaCheckCircle /> : <FaTimesCircle />}
            {success || error}
          </div>
        )}

        <br />
        {!previewUrl && (
          <div className="insta-guide">
            <b>Hướng dẫn:</b>{" "}
            {isMobile
              ? "Nhập link video instagram vào ô trên, sau đó bấm Tải về."
              : "Dán link video instagram vào ô trên, sau đó bấm Dán & Xem trước → khi video hiện, bấm Lưu về máy."}
          </div>
        )}

        <div className="insta-powered">
          © {new Date().getFullYear()} Instagram Video Downloader. All rights
          reserved.
        </div>
      </div>
    </div>
  );
};
export default InstagramDownloader;
