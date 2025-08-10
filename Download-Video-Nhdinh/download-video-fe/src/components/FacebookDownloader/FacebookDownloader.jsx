import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  FaFacebook,
  FaDownload,
  FaRegCopy,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaArrowLeft,
} from "react-icons/fa";
import "./FacebookDownloader.scss";

const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname.startsWith("192.168.")
    ? `http://${window.location.hostname}:8081/api`
    : "https://your-production-domain.com/api";

const FacebookDownloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState({ preview: false, download: false });
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const sseRef = useRef(null);
  const location = useLocation();
  const inputRef = useRef(null); // Thêm ref cho input
  const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);

  const isValidFacebookUrl = useCallback((input) => {
    try {
      const cleaned = decodeURIComponent(input.trim());
      const urlObj = new URL(cleaned);
      return (
        urlObj.hostname.includes("facebook.com") ||
        urlObj.hostname.includes("fb.watch")
      );
    } catch {
      return false;
    }
  }, []);

  const handlePreview = useCallback(
    async (inputUrl = url) => {
      if (!inputUrl || !isValidFacebookUrl(inputUrl)) {
        setError("Vui lòng nhập đúng link video Facebook!");
        return;
      }
      setLoading((prev) => ({ ...prev, preview: true }));
      setError("");
      setSuccess("");
      setPreviewUrl("");
      setVideoTitle("");
      try {
        const res = await fetch(`${API_BASE}/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: inputUrl }),
        });
        const data = await res.json();
        if (!res.ok || !data.videoUrl)
          throw new Error(data.error || "Không lấy được video");
        const videoTest = new XMLHttpRequest();
        videoTest.open("HEAD", data.videoUrl, false);
        videoTest.send();
        if (videoTest.status === 200) {
          setPreviewUrl(data.videoUrl);
          setVideoTitle(data.title || "Untitled");
        } else {
          throw new Error("Video URL không khả dụng");
        }
      } catch (err) {
        setError("Lỗi: " + (err.message || "Không lấy được video"));
      } finally {
        setLoading((prev) => ({ ...prev, preview: false }));
      }
    },
    [url, isValidFacebookUrl]
  );

  const handleDownload = useCallback(() => {
    if (!isValidFacebookUrl(url)) {
      setError("Vui lòng nhập đúng link video Facebook!");
      return;
    }
    setLoading((prev) => ({ ...prev, download: true }));
    setProgress(0);
    setError("");
    setSuccess("");

    const sanitizedTitle = videoTitle
      .replaceAll('[<>:"/\\\\|?*]', "")
      .replaceAll("\\s+", "_");
    const eventSource = new EventSource(
      `${API_BASE}/download/stream?url=${encodeURIComponent(
        url
      )}&title=${encodeURIComponent(sanitizedTitle)}`
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
        tempLink.download = sanitizedTitle ? `${sanitizedTitle}.mp4` : fileName;
        tempLink.click();
        setSuccess("Tải video thành công!");
        setLoading((prev) => ({ ...prev, download: false }));
        eventSource.close();
      } else if (msg.startsWith("ERROR_")) {
        setError(msg.replace("ERROR_", ""));
        setLoading((prev) => ({ ...prev, download: false }));
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      if (progress < 100) {
        setError("Mất kết nối máy chủ, đang thử lại...");
        eventSource.close();
        setTimeout(handleDownload, 2000);
      }
    };
  }, [url, videoTitle, progress, isValidFacebookUrl]);

  const handleCopy = useCallback(() => {
    if (navigator.clipboard && previewUrl) {
      navigator.clipboard.writeText(previewUrl);
      setSuccess("Link đã được sao chép!");
      setTimeout(() => setSuccess(""), 1500);
    } else {
      setError("Không thể sao chép link!");
    }
  }, [previewUrl]);

  const handleBack = () => {
    setUrl("");
    setPreviewUrl("");
    setVideoTitle("");
    setError("");
    setSuccess("");
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (sseRef.current) sseRef.current.close();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlFromQuery = params.get("url");
    const action = params.get("action");
    if (urlFromQuery) {
      setUrl(decodeURIComponent(urlFromQuery));
      if (action === "preview") handlePreview(decodeURIComponent(urlFromQuery));
      else if (action === "download") {
        handlePreview(decodeURIComponent(urlFromQuery)).then(handleDownload);
      }
    }
  }, [location, handlePreview, handleDownload]);

  return (
    <div className="main-center">
      <div className="fb-downloader-root">
        {!previewUrl && (
          <>
            <div className="header-row">
              <div className="fb-header">
                <FaFacebook className="fb-logo" />
                <span className="fb-title">
                  Facebook Video{" "}
                  <span className="hide-on-pc">
                    <br />
                  </span>{" "}
                  Downloader
                </span>
              </div>
            </div>
            <div className="fb-input-group">
              <input
                type="url"
                className={`fb-input ${
                  url && !isValidFacebookUrl(url) ? "fb-input-error" : ""
                }`}
                placeholder="Dán link video Facebook..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePreview()}
                spellCheck={false}
                autoFocus
                autoComplete="off"
                ref={inputRef} // Gắn ref vào input
              />
              <button
                className="fb-btn fb-btn-preview"
                onClick={async () => {
                  if (isMobile) {
                    if (!url || !isValidFacebookUrl(url)) {
                      setError("Vui lòng nhập đúng link video Facebook!");
                      return;
                    }
                    handleDownload(); // Thực hiện tải về trực tiếp trên mobile/iPad
                  } else {
                    try {
                      const clipboardText =
                        await navigator.clipboard.readText();
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
                    <FaSpinner className="fb-spin" />
                  ) : (
                    <FaDownload />
                  )
                ) : loading.preview ? (
                  <FaSpinner className="fb-spin" />
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
          </>
        )}

        {previewUrl && !loading.preview && (
          <div className="fb-preview-row">
            <div className="fb-preview-col fb-preview-video">
              {videoTitle && <div className="fb-video-title">{videoTitle}</div>}
              <video
                src={previewUrl}
                controls
                className="fb-video-preview"
                onError={() => setError("Không thể tải video")}
                preload="metadata"
              />
            </div>
            <div className="fb-preview-col fb-preview-actions">
              <button
                className="fb-btn fb-btn-download"
                onClick={handleDownload}
                disabled={loading.download}
              >
                {loading.download ? (
                  <FaSpinner className="fb-spin" />
                ) : (
                  <FaDownload />
                )}
                {loading.download ? "Đang tải..." : "Lưu về máy"}
              </button>
              <button
                className="fb-btn fb-btn-copy"
                onClick={handleCopy}
                disabled={!previewUrl}
              >
                <FaRegCopy />
                Sao chép link
              </button>
              <button className="fb-btn fb-btn-back" onClick={handleBack}>
                <FaArrowLeft /> Video khác
              </button>
            </div>
          </div>
        )}
        {loading.download && (
          <div className="fb-progress-wrap">
            <div className="fb-progress-bar-bg">
              <div
                className="fb-progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="fb-progress-label">{progress}%</div>
          </div>
        )}
        {(error || success) && (
          <div
            className={`fb-alert ${
              success ? "fb-alert-success" : "fb-alert-error"
            }`}
          >
            {success ? <FaCheckCircle /> : <FaTimesCircle />}
            {success || error}
          </div>
        )}
        <br />
        {!previewUrl && (
          <div className="fb-guide">
            <b>Hướng dẫn:</b>{" "}
            {isMobile
              ? "Nhập link video Facebook vào ô trên, sau đó bấm Tải về."
              : "Dán link video Facebook vào ô trên, sau đó bấm Dán & Xem trước → khi video hiện, bấm Lưu về máy."}
          </div>
        )}
        <div className="fb-powered">
          © {new Date().getFullYear()} Nhdinh Facebook Video Downloader. All
          rights reserved.
        </div>
      </div>
    </div>
  );
};

export default FacebookDownloader;
