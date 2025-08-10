package video.example.com.controller;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.annotation.PreDestroy;
import video.example.com.util.TiktokVideoUtil;

@RestController
@RequestMapping("/api/tiktok")
@CrossOrigin(origins = "*")
public class TiktokVideoController {

    private static final Logger logger = LoggerFactory.getLogger(TiktokVideoController.class);
    private static final Set<String> ALLOWED_THUMBNAIL_DOMAINS = new HashSet<>(Arrays.asList("tiktokcdn.com", "muscdn.com"));
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

    @Value("${tiktok.thread.pool.size:10}")
    private int threadPoolSize;

    @Value("${tiktok.yt.dlp.path:yt-dlp}")
    private String ytDlpPath;

    @Value("${tiktok.proxy:}")
    private String proxy;

    @Value("${tiktok.cookies.path:}")
    private String cookiesPath;

    private final ExecutorService executorService;

    public TiktokVideoController() {
        if (threadPoolSize <= 0) {
            logger.warn("Invalid threadPoolSize ({}), defaulting to 10", threadPoolSize);
            threadPoolSize = 10;
        }
        this.executorService = new ThreadPoolExecutor(
                threadPoolSize, threadPoolSize, 0L, TimeUnit.MILLISECONDS,
                new java.util.concurrent.LinkedBlockingQueue<>(100),
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }

    public enum ErrorMessage {
        INVALID_URL("URL không hợp lệ. Vui lòng kiểm tra lại định dạng URL TikTok."),
        INVALID_LINK("Không thể lấy video từ link. Vui lòng thử link khác."),
        SYSTEM_ERROR("Lỗi hệ thống. Vui lòng thử lại sau."),
        YT_DLP_UNAVAILABLE("yt-dlp không khả dụng trên hệ thống."),
        TIMEOUT("Hết thời gian xử lý video. Vui lòng thử lại."),
        FILE_NOT_FOUND("Tệp không tồn tại. Vui lòng kiểm tra lại."),
        INVALID_PROXY("Proxy không hợp lệ. Hệ thống sẽ bỏ qua proxy."),
        INVALID_THUMBNAIL("Thumbnail không hợp lệ. Sử dụng placeholder thay thế."),
        FFMPEG_UNAVAILABLE("ffmpeg không khả dụng. Cần install để re-encode video sang H.264."),
        PREVIEW_OEMBED_FAILED("Không thể lấy embed preview từ TikTok oEmbed. Fallback sang thumbnail."),
        PREVIEW_FAILED("Không thể lấy thông tin video. Video có thể bị hạn chế quyền riêng tư, vùng miền, hoặc bị chặn bởi TikTok. Hãy thử tải trực tiếp.");

        private final String message;

        ErrorMessage(String message) {
            this.message = message;
        }

        public String getMessage() {
            return message;
        }
    }

    private boolean isYtDlpAvailable() {
        try {
            Process process = new ProcessBuilder(ytDlpPath, "--version").start();
            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.error("Failed to check yt-dlp availability: {}", e.getMessage(), e);
            return false;
        }
    }

    private boolean isValidProxy(String proxy) {
        if (proxy == null || proxy.isEmpty()) {
            return false;
        }
        try {
            new java.net.URI(proxy);
            return true;
        } catch (java.net.URISyntaxException e) {
            logger.warn("Invalid proxy URL: {}, error: {}", proxy, e.getMessage());
            return false;
        }
    }

    private boolean isFfmpegAvailable() {
        try {
            Process process = new ProcessBuilder("ffmpeg", "-version").start();
            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.error("Failed to check ffmpeg availability: {}", e.getMessage(), e);
            return false;
        }
    }

    private boolean isValidThumbnailUrl(String url) {
        if (url == null || !url.startsWith("https://")) {
            return false;
        }
        try {
            java.net.URI uri = new java.net.URI(url);
            String host = uri.getHost();
            return host != null && ALLOWED_THUMBNAIL_DOMAINS.stream().anyMatch(host::endsWith);
        } catch (java.net.URISyntaxException e) {
            logger.warn("Invalid thumbnail URL: {}, error: {}", url, e.getMessage());
            return false;
        }
    }

    private boolean isValidVideoUrl(String url) {
        if (url == null || !url.startsWith("https://") || !url.endsWith(".mp4")) {
            return false;
        }
        try {
            java.net.URI uri = new java.net.URI(url);
            String host = uri.getHost();
            return host != null && (host.endsWith("tiktokcdn.com") || host.endsWith("muscdn.com"));
        } catch (java.net.URISyntaxException e) {
            logger.warn("Invalid video URL: {}, error: {}", url, e.getMessage());
            return false;
        }
    }

    @GetMapping(value = "/download/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamDownload(@RequestParam String url) {
        if (url == null || url.length() > 2048 || !url.matches("https?://(www\\.)?(tiktok\\.com|vm\\.tiktok\\.com|vt\\.tiktok\\.com)/.*")) {
            logger.warn("Invalid URL: {}", url);
            SseEmitter emitter = new SseEmitter(0L);
            try {
                emitter.send(SseEmitter.event().data("ERROR_" + ErrorMessage.INVALID_URL.getMessage()));
            } catch (IOException e) {
                logger.error("Failed to send error message: {}", e.getMessage(), e);
            } finally {
                emitter.complete();
            }
            return emitter;
        }
        if (!isFfmpegAvailable()) {
            logger.error("ffmpeg is not available for re-encode: {}", url);
            SseEmitter emitter = new SseEmitter(0L);
            try {
                emitter.send(SseEmitter.event().data("ERROR_" + ErrorMessage.FFMPEG_UNAVAILABLE.getMessage()));
            } catch (IOException e) {
                logger.error("Failed to send error message: {}", e.getMessage(), e);
            } finally {
                emitter.complete();
            }
            return emitter;
        }

        if (!isYtDlpAvailable()) {
            logger.error("yt-dlp is not available for download: {}", url);
            SseEmitter emitter = new SseEmitter(0L);
            try {
                emitter.send(SseEmitter.event().data("ERROR_" + ErrorMessage.YT_DLP_UNAVAILABLE.getMessage()));
            } catch (IOException e) {
                logger.error("Failed to send error message: {}", e.getMessage(), e);
            } finally {
                emitter.complete();
            }
            return emitter;
        }

        SseEmitter emitter = new SseEmitter(300_000L);
        emitter.onCompletion(() -> logger.info("SSE completed for URL: {}", url));
        emitter.onTimeout(() -> {
            logger.warn("SSE timeout for URL: {}", url);
            emitter.complete();
        });

        executorService.submit(() -> {
            int retries = 3;
            String effectiveProxy = isValidProxy(proxy) ? proxy : "";
            while (retries > 0) {
                Process process = null;
                try {
                    String filename = TiktokVideoUtil.downloadVideoUsingYtDlp(url, ytDlpPath, effectiveProxy, progress -> {
                        try {
                            emitter.send(SseEmitter.event().data(progress));
                        } catch (IOException e) {
                            logger.warn("Client disconnected during progress: {}", e.getMessage());
                        }
                    });
                    emitter.send(SseEmitter.event().data("DONE_" + filename));
                    return;
                } catch (Exception e) {
                    retries--;
                    logger.warn("Download attempt failed ({} retries left): {}", retries, e.getMessage(), e);
                    if (retries == 2 && !effectiveProxy.isEmpty()) {
                        logger.info("Retrying without proxy due to potential proxy failure");
                        effectiveProxy = "";
                    }
                    if (retries == 0) {
                        try {
                            emitter.send(SseEmitter.event().data("FALLBACK_" + url));
                        } catch (IOException ignored) {
                            logger.error("Failed to send fallback: {}", ignored.getMessage());
                        }
                    }
                    try {
                        Thread.sleep(1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                } finally {
                    if (retries == 0) {
                        emitter.complete();
                    }
                }
            }
        });

        return emitter;
    }

    @GetMapping("/download")
    public ResponseEntity<InputStreamResource> downloadVideo(@RequestParam String filename) throws IOException {
        File file = new File(filename);
        if (!file.exists()) {
            logger.error("File not found: {}", filename);
            return ResponseEntity.notFound().build();  // Optimized: direct notFound without body
        }

        InputStreamResource resource = new InputStreamResource(new FileInputStream(file));
        logger.info("Serving file for download: {}", filename);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + file.getName())
                .contentLength(file.length())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @PostMapping("/preview")
    public ResponseEntity<Map<String, String>> previewVideo(@RequestBody Map<String, String> payload) {
        String tiktokUrl = payload.get("url");
        logger.info("Received preview request for URL: {}", tiktokUrl);

        if (tiktokUrl == null || tiktokUrl.length() > 2048 || !tiktokUrl.matches("https?://(www\\.)?(tiktok\\.com|vm\\.tiktok\\.com|vt\\.tiktok\\.com)/.*")) {
            logger.warn("Invalid TikTok URL: {}", tiktokUrl);
            return ResponseEntity.badRequest().body(Map.of("error", ErrorMessage.INVALID_URL.getMessage()));
        }

        // Optimized oEmbed: Use exchange with headers to mimic browser, improve success rate for short links
        RestTemplate restTemplate = new RestTemplate();
        String oEmbedUrl = "https://www.tiktok.com/oembed?url=" + tiktokUrl;
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", USER_AGENT);
        headers.set("Referer", "https://www.tiktok.com/");
        HttpEntity<String> entity = new HttpEntity<>(headers);
        try {
            ResponseEntity<Map> oEmbedResponse = restTemplate.exchange(oEmbedUrl, HttpMethod.GET, entity, Map.class);
            if (oEmbedResponse.getStatusCode() == HttpStatus.OK) {
                Map<String, Object> oEmbedData = oEmbedResponse.getBody();
                String title = (String) oEmbedData.get("title");
                String thumbnail = (String) oEmbedData.get("thumbnail_url");
                String embedHtml = (String) oEmbedData.get("html");
                logger.info("oEmbed success for URL: {}, title: {}", tiktokUrl, title);
                return ResponseEntity.ok(Map.of(
                        "title", Normalizer.normalize(title != null ? title : "Untitled", Normalizer.Form.NFC),
                        "thumbnail", isValidThumbnailUrl(thumbnail) ? thumbnail : "https://via.placeholder.com/300x150?text=Thumbnail",
                        "embedHtml", embedHtml != null ? embedHtml : "",
                        "videoUrl", ""
                ));
            }
        } catch (Exception e) {
            logger.warn("oEmbed failed for URL: {}, error: {}. Fallback to yt-dlp.", tiktokUrl, e.getMessage(), e);
        }

        // Fallback yt-dlp
        if (!isYtDlpAvailable()) {
            logger.error("yt-dlp is not available on the system");
            return ResponseEntity.status(500).body(Map.of("error", ErrorMessage.YT_DLP_UNAVAILABLE.getMessage()));
        }

        int retries = 3;
        String videoTitle = null;
        String thumbnail = null;
        String videoUrl = null;
        StringBuilder output = new StringBuilder();
        String effectiveProxy = isValidProxy(proxy) ? proxy : "";

        while (retries > 0) {
            List<String> command = new ArrayList<>();
            command.add(ytDlpPath);
            command.add("--user-agent");
            command.add(USER_AGENT);  // Reuse constant
            command.add("--add-header");
            command.add("Referer:https://www.tiktok.com/");
            command.add("--add-header");
            command.add("Origin:https://www.tiktok.com");
            command.add("--no-check-certificate");
            command.add("--extractor-retries");
            command.add("3");

            if (!cookiesPath.isEmpty() && !effectiveProxy.isEmpty()) {
                command.add("--cookies");
                command.add(cookiesPath);
            } else if (!effectiveProxy.isEmpty()) {
                command.add("--proxy");
                command.add(effectiveProxy);
            }

            command.add("--print");
            command.add("title");
            command.add("--print");
            command.add("thumbnail");
            command.add("--print");
            command.add("url");

            command.add(tiktokUrl);

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = null;
            try {
                logger.debug("Executing yt-dlp command: {}", pb.command());
                process = pb.start();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        output.append(line).append("\n");
                        logger.debug("yt-dlp output: {}", line);
                        if (line.startsWith("https://") && isValidThumbnailUrl(line) && thumbnail == null) {
                            thumbnail = line;
                            logger.info("Found valid thumbnail: {}", thumbnail);
                        } else if (line.startsWith("https://") && line.contains(".mp4") && isValidVideoUrl(line)) {
                            videoUrl = line;
                            logger.info("Found valid video URL: {}", videoUrl);
                        } else if (!line.startsWith("[") && !line.isEmpty() && !line.contains("ERROR") && videoTitle == null) {
                            videoTitle = Normalizer.normalize(line, Normalizer.Form.NFC);
                            logger.info("Found video title: {}", videoTitle);
                        }
                    }
                }

                if (!process.waitFor(60, TimeUnit.SECONDS)) {  // Increase timeout for larger videos
                    if (process != null) process.destroy();
                    logger.error("yt-dlp process timed out for URL: {}", tiktokUrl);
                    return ResponseEntity.status(500).body(Map.of("error", ErrorMessage.TIMEOUT.getMessage()));
                }

                int exitCode = process.exitValue();
                logger.info("yt-dlp exited with code: {}", exitCode);
                if (exitCode == 0 && (videoUrl != null || thumbnail != null)) {
                    return ResponseEntity.ok(Map.of(
                            "title", videoTitle != null ? videoTitle : "Untitled",
                            "thumbnail", thumbnail != null && isValidThumbnailUrl(thumbnail) ? thumbnail : "https://via.placeholder.com/300x150?text=Thumbnail",
                            "embedHtml", "",
                            "videoUrl", videoUrl != null && isValidVideoUrl(videoUrl) ? videoUrl : ""
                    ));
                }
                logger.warn("yt-dlp failed (retries left: {}), output: {}", retries - 1, output);
                retries--;
                if (retries == 2 && !effectiveProxy.isEmpty()) {
                    logger.info("Retrying without proxy due to proxy failure");
                    effectiveProxy = "";
                } else if (retries > 0) {
                    Thread.sleep(1000);
                }
            } catch (IOException e) {
                logger.error("IO error executing yt-dlp: {}, output: {}", e.getMessage(), output.toString(), e);
                retries--;
                if (retries == 2 && !effectiveProxy.isEmpty()) {
                    logger.info("Retrying without proxy due to proxy failure");
                    effectiveProxy = "";
                } else if (retries > 0) {
                    try {
                        Thread.sleep(1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logger.error("Process interrupted: {}, output: {}", e.getMessage(), output.toString(), e);
                retries = 0;
            } catch (Exception e) {
                logger.error("Unexpected error executing yt-dlp: {}, output: {}", e.getMessage(), output.toString(), e);
                retries--;
                if (retries > 0) {
                    try {
                        Thread.sleep(1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            } finally {
                if (process != null) {
                    process.destroy();  // Ensure cleanup
                }
            }
        }

        logger.error("All retries failed for URL: {}, output: {}", tiktokUrl, output.toString());
        return ResponseEntity.status(500).body(Map.of(
                "error", ErrorMessage.PREVIEW_FAILED.getMessage(),
                "title", videoTitle != null ? videoTitle : "Untitled",
                "thumbnail", thumbnail != null ? thumbnail : "https://via.placeholder.com/300x150?text=Thumbnail",
                "embedHtml", "",
                "videoUrl", ""
        ));
    }

    @PreDestroy
    public void shutdown() {
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(60, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
            logger.error("Shutdown interrupted: {}", e.getMessage(), e);
        }
        File tempDir = new File(System.getProperty("java.io.tmpdir"));
        File[] tempFiles = tempDir.listFiles((dir, name) -> name.endsWith(".mp4"));
        if (tempFiles != null) {
            for (File file : tempFiles) {
                if (file.lastModified() < System.currentTimeMillis() - 12 * 60 * 60 * 1000) {  // Optimized: Cleanup older files more aggressively (12h)
                    if (file.delete()) {
                        logger.info("Deleted old temp file: {}", file.getName());
                    } else {
                        logger.warn("Failed to delete old temp file: {}", file.getName());
                    }
                }
            }
        }
    }
}