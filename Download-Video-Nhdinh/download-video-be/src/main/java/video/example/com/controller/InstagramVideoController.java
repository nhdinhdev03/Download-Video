package video.example.com.controller;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import video.example.com.util.InstagramVideoUtil;

@RestController
@RequestMapping("/api/instagram")
@CrossOrigin(origins = "*")
public class InstagramVideoController {

    private static final Logger logger = LoggerFactory.getLogger(InstagramVideoController.class);

    @PostMapping("/preview")
    public ResponseEntity<Map<String, String>> previewVideo(@RequestBody Map<String, String> payload) {
        String instaUrl = payload.get("url");
        logger.info("Received preview request for URL: {}", instaUrl);

        if (instaUrl == null || !instaUrl.matches("https?://(www\\.)?instagram\\.com/reel/[a-zA-Z0-9_-]+(/|\\?[^\\s]*)?")) {
            logger.error("Invalid Instagram URL: {}", instaUrl);
            return ResponseEntity.badRequest().body(Map.of("error", "URL không hợp lệ."));
        }

        // Process the URL using yt-dlp
        ProcessBuilder pb = new ProcessBuilder("yt-dlp", "-f", "best", "-g", "--get-title", instaUrl);
        pb.redirectErrorStream(true);

        List<String> outputLines = new ArrayList<>();
        int exit = -1;
        try {
            Process process = pb.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    outputLines.add(line);
                    logger.info("yt-dlp output: {}", line);
                }
            }
            try {
                exit = process.waitFor();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logger.error("Interrupted while waiting for process: {}", e.getMessage());
                return ResponseEntity.status(500).body(Map.of("error", "Lỗi hệ thống (quá trình bị gián đoạn)."));
            }
        } catch (IOException e) {
            logger.error("IOException when running yt-dlp: {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Lỗi hệ thống (không chạy được yt-dlp)."));
        }

        logger.info("yt-dlp exit code: {}", exit);

        // Extract video URL and title from yt-dlp output
        String directUrl = outputLines.stream()
                .filter(line -> line.contains(".mp4") && line.startsWith("http"))
                .findFirst().orElse(null);

        String videoTitle = outputLines.stream()
                .map(String::trim)
                .filter(line -> !line.isEmpty())
                .filter(line -> !line.toLowerCase().contains("warning"))
                .findFirst()
                .orElse("Instagram Video (không có tiêu đề)")
                .trim();

        if (exit != 0 || directUrl == null) {
            logger.error("Failed to fetch preview for URL: {}. Output: {}", instaUrl, outputLines);
            return ResponseEntity.status(500).body(Map.of("error", "Không thể lấy link xem trước."));
        }

        return ResponseEntity.ok(Map.of(
                "videoUrl", directUrl,
                "title", videoTitle
        ));
    }

    @GetMapping(value = "/download/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamDownload(@RequestParam String url) {
        logger.info("Received download request for URL: {}", url);
        SseEmitter emitter = new SseEmitter(300_000L); // Timeout 5 phút

        new Thread(() -> {
            try {
                String filename = InstagramVideoUtil.downloadVideoUsingYtDlp(url, progress -> {
                    try {
                        emitter.send(SseEmitter.event().data(progress));
                    } catch (IOException e) {
                        logger.error("Client disconnected during SSE: {}", e.getMessage());
                    }
                });

                emitter.send(SseEmitter.event().data("DONE_" + filename));
                logger.info("Download completed for file: {}", filename);
            } catch (Exception e) {
                logger.error("Error during download: {}", e.getMessage());
                try {
                    emitter.send(SseEmitter.event().data("ERROR_" + e.getMessage()));
                } catch (IOException ignored) {
                }
            } finally {
                emitter.complete();
            }
        }).start();

        return emitter;
    }

    /**
     * Download file về máy người dùng
     */
    @GetMapping("/download")
    public ResponseEntity<InputStreamResource> downloadVideo(@RequestParam String filename) throws IOException {
        File file = new File(filename);
        if (!file.exists()) {
            logger.error("File not found: {}", filename);
            return ResponseEntity.notFound().build();
        }

        InputStreamResource resource = new InputStreamResource(new FileInputStream(file));
        logger.info("Serving file for download: {}", filename);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + file.getName())
                .contentLength(file.length())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}
