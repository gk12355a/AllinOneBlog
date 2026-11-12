import React, { useState, useEffect } from 'react';
import { Award, ExternalLink, FileText, CheckCircle, Calendar, Shield, Sparkles, X, ZoomIn } from 'lucide-react';
import { contentApi } from '../services/api';
import { useApp } from '../contexts/AppContext';

export default function Certificates() {
  const { t } = useApp();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await contentApi.getCertificates();
      if (res.success) {
        setCertificates(res.data);
      }
    } catch (err) {
      console.error('Failed to load certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Header Section */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 mb-4 shadow-sm">
          <Award className="w-3.5 h-3.5" />
          <span>Professional Qualifications</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Chứng chỉ & Bằng cấp Chuyên môn
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
          Tổng hợp các chứng chỉ quốc tế và chuyên ngành DevOps, Cloud Computing, Kubernetes và hệ thống phần mềm đã được xác thực chính thức.
        </p>
      </div>

      {/* Grid of Certificates */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-80 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <Award className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
          <p className="text-zinc-500">Chưa có chứng chỉ nào được hiển thị.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => {
            const isFeatured = cert.credential_id === 'LF-f5jrh502j1';
            return (
              <div
                key={cert.id}
                className={`group relative flex flex-col justify-between bg-white dark:bg-zinc-900 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${
                  isFeatured
                    ? 'border-blue-500/50 dark:border-blue-500/40 ring-1 ring-blue-500/20'
                    : 'border-zinc-200/80 dark:border-zinc-800/80'
                }`}
              >
                {/* Top Badge for Notable / CKA */}
                {isFeatured && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
                    <Sparkles className="w-3 h-3" />
                    <span>Top Credential</span>
                  </div>
                )}

                <div>
                  {/* Certificate Preview Image */}
                  {cert.image_url ? (
                    <div
                      onClick={() => setSelectedCert(cert)}
                      className="relative h-48 w-full bg-zinc-100 dark:bg-zinc-950 overflow-hidden cursor-pointer group/img"
                    >
                      <img
                        src={cert.image_url}
                        alt={cert.title}
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover/img:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                        <ZoomIn className="w-4 h-4" />
                        <span>Xem chi tiết chứng chỉ</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 w-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800/60 flex items-center justify-center border-b border-zinc-100 dark:border-zinc-800">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                        <Shield className="w-6 h-6" />
                      </div>
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="p-5">
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium mb-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="truncate">{cert.issuer}</span>
                    </div>

                    <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {cert.title}
                    </h3>

                    {cert.description && (
                      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                        {cert.description}
                      </p>
                    )}

                    {/* Metadata: Date & ID */}
                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-wrap items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 gap-2">
                      {cert.issue_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{cert.issue_date}</span>
                        </div>
                      )}
                      {cert.credential_id && (
                        <span className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">
                          ID: {cert.credential_id}
                        </span>
                      )}
                    </div>

                    {/* Skills Tags */}
                    {cert.skills && cert.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {cert.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Links */}
                <div className="p-4 pt-0 flex items-center gap-2">
                  {cert.credential_url && (
                    <a
                      href={cert.credential_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Xác thực Online</span>
                    </a>
                  )}

                  {cert.pdf_url && (
                    <a
                      href={cert.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      title="Mở file chứng chỉ PDF gốc"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-500" />
                      <span>PDF</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal for Certificate Preview */}
      {selectedCert && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedCert(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                  {selectedCert.title}
                </h3>
                <p className="text-xs text-zinc-500">
                  {selectedCert.issuer} • ID: {selectedCert.credential_id}
                </p>
              </div>
              <button
                onClick={() => setSelectedCert(null)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image Display */}
            <div className="p-4 bg-zinc-950 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={selectedCert.image_url}
                alt={selectedCert.title}
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 text-xs">
              <span className="text-zinc-500">
                Ngày cấp: {selectedCert.issue_date || 'N/A'}
              </span>
              <div className="flex items-center gap-2">
                {selectedCert.credential_url && (
                  <a
                    href={selectedCert.credential_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Xác thực tại {selectedCert.issuer}</span>
                  </a>
                )}
                {selectedCert.pdf_url && (
                  <a
                    href={selectedCert.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors font-medium"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-500" />
                    <span>Tải PDF gốc</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
