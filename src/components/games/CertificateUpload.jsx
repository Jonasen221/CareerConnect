import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { AlertCircle, Upload, Loader2, CheckCircle } from 'lucide-react';

export default function CertificateUpload({ open, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [completionDate, setCompletionDate] = useState('');
  const [skills, setSkills] = useState('');
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Validate file type
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(selectedFile.type)) {
      setError('Only JPG, PNG, or PDF files are accepted');
      return;
    }
    
    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
  };

  const validateDate = (dateStr) => {
    const selectedDate = new Date(dateStr);
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return selectedDate >= weekAgo && selectedDate <= today;
  };

  const handleUpload = async () => {
    setError(null);

    if (!file) {
      setError('Please select a certificate file');
      return;
    }

    if (!completionDate) {
      setError('Please select completion date');
      return;
    }

    if (!skills.trim()) {
      setError('Please add at least one skill learned');
      return;
    }

    if (!validateDate(completionDate)) {
      setError('Certificate must be completed within the last 7 days');
      return;
    }

    setUploading(true);

    try {
      const user = await base44.auth.me();
      
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Add skills to student profile
      const studentProfiles = await base44.entities.StudentProfile.filter({ created_by: user.email });
      if (studentProfiles.length > 0) {
        const profile = studentProfiles[0];
        const newSkills = skills.split(',').map(s => s.trim()).filter(s => s);
        const currentSkills = profile.skills || [];
        const updatedSkills = [...new Set([...currentSkills, ...newSkills])]; // Avoid duplicates
        
        await base44.entities.StudentProfile.update(profile.id, {
          skills: updatedSkills
        });
      }

      // Award 100 XP
      await onSuccess(100, { certificate_url: file_url, completion_date: completionDate, skills_added: skills });
      
      setSuccess(true);
      setTimeout(() => {
        setFile(null);
        setCompletionDate('');
        setSkills('');
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to upload certificate');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Course Certificate</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-800 mb-2">Certificate Verified! 🎉</h3>
            <p className="text-sm text-slate-600">+100 XP added to your account</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Certificate File (JPG, PNG, or PDF)</Label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-[#5BA4C4] hover:bg-[#EAF5FB] transition-all"
              >
                {file ? (
                  <div className="text-center">
                    <Upload className="w-6 h-6 text-[#5BA4C4] mx-auto mb-2" />
                    <p className="font-semibold text-slate-800 text-sm">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)}MB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">Click to upload</p>
                    <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Completion Date</Label>
              <Input
                type="date"
                value={completionDate}
                onChange={(e) => {
                  setCompletionDate(e.target.value);
                  setError(null);
                }}
                max={new Date().toISOString().split('T')[0]}
                min={new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">Must be within the last 7 days</p>
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Skills Learned</Label>
              <Input
                type="text"
                placeholder="e.g., Python, Data Analysis, Machine Learning"
                value={skills}
                onChange={(e) => {
                  setSkills(e.target.value);
                  setError(null);
                }}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">Separate skills with commas (will appear on your profile)</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} disabled={uploading} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading} className="flex-1 bg-[#5BA4C4] hover:bg-[#3D87AA]">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload & Earn 100 XP'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}