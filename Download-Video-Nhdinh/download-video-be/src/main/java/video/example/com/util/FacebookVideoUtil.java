package video.example.com.util;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.UUID;
import java.util.function.Consumer;

public class FacebookVideoUtil {

    // Hàm tiện ích để làm sạch tiêu đề thành tên file hợp lệ
    private static String sanitizeFileName(String title) {
        if (title == null || title.trim().isEmpty()) {
            return UUID.randomUUID().toString();
        }
        // Loại bỏ ký tự không hợp lệ trong tên file
        String sanitized = title.replaceAll("[^a-zA-Z0-9\\-_\\s]", "").trim();
        return sanitized.isEmpty() ? UUID.randomUUID().toString() : sanitized;
    }

    public static String downloadVideoUsingYtDlp(String fbUrl, String providedTitle, Consumer<String> progressCallback) throws IOException {
        // Nếu không có tiêu đề từ client, thử lấy từ yt-dlp
        String videoTitle = providedTitle;
        if (videoTitle == null || videoTitle.trim().isEmpty()) {
            ProcessBuilder titlePb = new ProcessBuilder("yt-dlp", "--get-title", fbUrl);
            titlePb.redirectErrorStream(true);
            Process titleProcess = titlePb.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(titleProcess.getInputStream(), "UTF-8"))) {
                videoTitle = reader.readLine();
            } catch (IOException e) {
                System.err.println("Failed to read video title: " + e.getMessage());
                videoTitle = null; // Fallback to null if reading fails
            }
            try {
                titleProcess.waitFor();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt(); // Khôi phục trạng thái ngắt
                System.err.println("Interrupted while waiting for title process: " + e.getMessage());
                videoTitle = null; // Fallback to null if interrupted
            }
        }

        // Tạo tên file từ tiêu đề
        String fileName = sanitizeFileName(videoTitle) + ".mp4";
        String outputPath = System.getProperty("java.io.tmpdir") + File.separator + fileName;

        ProcessBuilder pb = new ProcessBuilder(
                "yt-dlp", "--newline", "-f", "best", "-o", outputPath, fbUrl
        );
        pb.redirectErrorStream(true);

        Process process = pb.start();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[yt-dlp] " + line);
                if (progressCallback != null && line.matches(".*?(\\d{1,3})\\.\\d+%.*")) {
                    String percent = line.replaceAll(".*?(\\d{1,3})\\.\\d+%.*", "$1");
                    progressCallback.accept("PROGRESS_" + percent);
                }
            }
        } catch (Exception e) {
            throw new IOException("Download failed: " + e.getMessage(), e);
        }

        try {
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new IOException("yt-dlp exited with code " + exitCode);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted during download", e);
        }

        return outputPath;
    }
}
