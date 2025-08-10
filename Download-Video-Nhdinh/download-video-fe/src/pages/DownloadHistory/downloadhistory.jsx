// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { FaDownload, FaPlay, FaTrash } from "react-icons/fa";
// import "./downloadhistory.scss";

// const Downloadhistory = () => {
//   const [history, setHistory] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();

//   useEffect(() => {
//     try {
//       const savedHistory = JSON.parse(localStorage.getItem("downloadHistory") || "[]");
//       if (Array.isArray(savedHistory)) {
//         setHistory(savedHistory);
//       } else {
//         setHistory([]);
//         localStorage.setItem("downloadHistory", "[]");
//       }
//     } catch (e) {
//       console.error("Error parsing history:", e);
//       setHistory([]);
//       localStorage.setItem("downloadHistory", "[]");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   const handleDelete = (id) => {
//     const updatedHistory = history.filter((item) => item.id !== id);
//     setHistory(updatedHistory);
//     localStorage.setItem("downloadHistory", JSON.stringify(updatedHistory));
//   };

//   const handleSelectVideo = (item, action = "preview") => {
//     if (!item.url) return;
//     const platform = item.platform || "facebook";
//     navigate(
//       `/download/${platform}?url=${encodeURIComponent(
//         item.url
//       )}&action=${action}&title=${encodeURIComponent(item.title || "")}`
//     );
//   };

//   const formatDate = (isoString) => {
//     return new Date(isoString).toLocaleString("vi-VN", {
//       day: "2-digit",
//       month: "2-digit",
//       year: "numeric",
//       hour: "2-digit",
//       minute: "2-digit",
//     });
//   };

//   if (loading) {
//     return <div className="download-history-root">Đang tải lịch sử...</div>;
//   }

//   return (
//     <div className="download-history-root">
//       <h2 className="history-title">Lịch sử tải xuống</h2>
//       {history.length === 0 ? (
//         <p className="history-empty">Chưa có video nào trong lịch sử.</p>
//       ) : (
//         <ul className="history-list">
//           {history.map((item) => (
//             <li key={item.id} className="history-item">
//               <div className="history-info">
//                 <span className="history-title-text">
//                   {item.title || "Untitled"} ({item.platform || "Unknown"})
//                 </span>
//                 <a
//                   href={item.url}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="history-url"
//                 >
//                   {item.url.length > 50
//                     ? `${item.url.slice(0, 50)}...`
//                     : item.url}
//                 </a>
//                 <span className="history-timestamp">
//                   {formatDate(item.timestamp)}
//                 </span>
//               </div>
//               <div className="history-actions">
//                 <button
//                   className="history-btn history-btn-preview"
//                   onClick={() => handleSelectVideo(item, "preview")}
//                   title="Xem trước"
//                   disabled={!item.url}
//                 >
//                   <FaPlay /> Xem lại
//                 </button>
//                 {/* <button
//                   className="history-btn history-btn-download"
//                   onClick={() => handleSelectVideo(item, "download")}
//                   title="Tải lại"
//                   disabled={!item.url}
//                 >
//                   <FaDownload /> Tải
//                 </button> */}
//                 <button
//                   className="history-btn history-btn-delete"
//                   onClick={() => handleDelete(item.id)}
//                   title="Xóa"
//                 >
//                   <FaTrash />
//                 </button>
//               </div>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

// export default Downloadhistory;