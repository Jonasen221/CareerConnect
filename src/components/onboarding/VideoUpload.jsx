import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Video, Upload, CheckCircle, X, Loader2 } from 'lucide-react';

export default function VideoUpload({ value, onChange, label, description }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { setError('Please upload a video file.'); return; }
    if (file.size > 500 * 1024 * 1024) { setError('Video must be under 500MB.'); return; }
    setError(null);
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange(file_url);
    setUploading(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Video className="w-4 h-4 text-[#5BA4C4]" />
        <span className="text-sm font-semibold text-slate-700">{label || 'Intro Video'} <span className="text-[#5BA4C4]">*</span></span>
        <span className="text-xs text-slate-400 font-normal ml-1">(up to 500MB)</span>
      </div>

      {value ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800">Video uploaded successfully!</p>
            <p className="text-xs text-green-600 mt-0.5 truncate">{value}</p>
          </div>
          <button onClick={() => onChange('')} className="p-1.5 hover:bg-green-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-green-700" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-[#A8D4E8] hover:border-[#5BA4C4] bg-[#EAF5FB]/40 hover:bg-[#EAF5FB] rounded-2xl p-8 flex flex-col items-center gap-3 transition-all disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-[#5BA4C4] animate-spin" />
              <p className="text-sm font-semibold text-[#3D87AA]">Uploading your video...</p>
              <p className="text-xs text-slate-400">This may take a moment</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-[#EAF5FB] rounded-2xl flex items-center justify-center">
                <Upload className="w-7 h-7 text-[#5BA4C4]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700">Click to upload your intro video</p>
                <p className="text-xs text-slate-400 mt-1">{description || 'Record a short video introducing yourself — who you are, what you\'re looking for, and what makes you unique.'}</p>
              </div>
            </>
          )}
        </button>
      )}

      {error && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><X className="w-3 h-3" />{error}</p>}
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
    </div>
  );
}